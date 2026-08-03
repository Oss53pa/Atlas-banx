import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Landmark, Plus, Search, X, Upload, Eye, History,
  CheckCircle2, Archive, FileText, Loader2, ChevronRight,
  Trash2, Pencil,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardBody, Button, Input, Select, Badge } from '../ui';
import { useBankStore } from '../../store/bankStore';
import {
  fetchReferenceJournal, bankSegmentCounts, type BankSegmentCounts,
} from '../../cdc/services/referenceJournal';
import { BankConditionsModal } from './BankConditionsModal';
import { BankFormModal } from './BankFormModal';
import { BankGridsPanel } from './BankGridsPanel';
import type { Bank, BankConditions, ConditionGrid, MonetaryZone, ArchivedDocument, TariffSegment } from '../../types';
import { CEMAC_COUNTRIES, UEMOA_COUNTRIES, AFRICAN_COUNTRIES } from '../../types';
import { extractConditions } from '../../extraction/conditions';
import { isCustomRubricKey, parseCustomRubricKey } from '../../extraction/conditions/RubricClassifier';
import {
  getEmptyFullConditions,
  applyExtractedValuesToConditions,
  customFeesToFeeSchedules,
  type CustomFee,
} from '../../extraction/conditionsForm';
import { v4 as uuidv4 } from 'uuid';
import {
  ImportVerificationModal,
  buildConditionsPayload,
  buildAutoCommitResult,
  AUTO_VALIDATE_CONFIDENCE,
  type CommitArgs,
  type CommitResult,
  type VerificationPayload,
} from '../import-verification';
import { BatchImportModal, type BatchValidationMode } from './BatchImportModal';

type ViewMode = 'banks' | 'grids';

// ============================================================================
// reconcileGridsFromDocuments
// ----------------------------------------------------------------------------
// Synchronise bank.conditionGrids[] avec conditions.documents[] :
//   - Chaque document actif (isActive=true) avec extractedValues devient ou
//     met à jour une ConditionGrid avec ses propres effectiveDate /
//     expirationDate. Le lien doc ↔ grille se fait via grid.sourceDocument.id
//     === doc.id (les uploads passés posaient deux IDs distincts ; on fallback
//     sur grid.sourceDocument.name === doc.name pour matcher l'historique).
//   - Tout document non-actif (ou supprimé) voit sa grille liée archivée
//     (status='archived'). Les grilles non liées à un doc sont laissées telles.
//   - activeGridId reste positionné sur la première grille active produite
//     pour conserver la rétrocompatibilité avec le champ bank.conditions
//     legacy (synchronisé par le store).
//
// L'audit (BankConditionsResolver.splitTransactionsByGrid) lit bank.conditionGrids
// et résout chaque transaction contre la grille couvrant sa date. Sans cette
// réconciliation, deux PDFs actifs dans la modale ne créeraient qu'une seule
// grille et l'audit utiliserait le mauvais tarif pour l'une des deux périodes.
// ============================================================================
interface ReconcileArgs {
  bankId: string;
  bank: Bank;
  documents: ArchivedDocument[];
  existingGrids: ConditionGrid[];
  addConditionGrid: (
    bankId: string,
    grid: Omit<ConditionGrid, 'id' | 'createdAt' | 'updatedAt'>,
  ) => ConditionGrid;
  updateConditionGrid: (bankId: string, gridId: string, updates: Partial<ConditionGrid>) => void;
  archiveConditionGrid: (bankId: string, gridId: string) => void;
}

// Lit un File en data-URL base64 (`data:application/pdf;base64,…`) — format
// stocké dans ArchivedDocument.fileData et attendu par l'onglet de publication
// (SplitScreenValidator) comme par le lien de téléchargement.
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader a échoué'));
    reader.readAsDataURL(file);
  });
}

function reconcileGridsFromDocuments(args: ReconcileArgs): void {
  const {
    bankId, bank, documents, existingGrids,
    addConditionGrid, updateConditionGrid, archiveConditionGrid,
  } = args;

  const currency = bank.zone === 'UEMOA' ? 'XOF' : 'XAF';
  const now = new Date();

  const activeDocs = documents.filter(
    (d) =>
      d.isActive &&
      ((d.extractedValues && Object.keys(d.extractedValues).length > 0) ||
        (d.extractedCustomFees && d.extractedCustomFees.length > 0)),
  );

  // Lookup table : pour chaque grille, retrouver le doc lié (s'il existe)
  // par id ; fallback par nom de fichier pour matcher l'historique d'avant
  // ce fix (les anciens uploads posaient deux UUIDs distincts entre
  // conditions.documents[i].id et grid.sourceDocument.id).
  const findGridForDoc = (doc: ArchivedDocument): ConditionGrid | undefined => {
    const byId = existingGrids.find((g) => g.sourceDocument?.id === doc.id);
    if (byId) return byId;
    return existingGrids.find(
      (g) => g.sourceDocument?.name && g.sourceDocument.name === doc.name,
    );
  };

  // 1. Archive les grilles dont le doc lié n'est plus actif ou n'existe plus
  const activeDocIds = new Set(activeDocs.map((d) => d.id));
  const activeDocNames = new Set(activeDocs.map((d) => d.name));
  for (const grid of existingGrids) {
    if (grid.status !== 'active') continue;
    const linkedId = grid.sourceDocument?.id;
    const linkedName = grid.sourceDocument?.name;
    const stillActive =
      (linkedId && activeDocIds.has(linkedId)) ||
      (linkedName && activeDocNames.has(linkedName));
    if (!stillActive) {
      archiveConditionGrid(bankId, grid.id);
    }
  }

  // 2. Upsert une grille par document actif. Toutes les grilles produites
  //    restent status='active' — le resolver split-by-grid (qui filtre
  //    g.status !== 'draft') prend en compte plusieurs grilles actives
  //    simultanées et choisit la bonne par couverture de date.
  for (const doc of activeDocs) {
    const perDocConditions = applyExtractedValuesToConditions(
      getEmptyFullConditions(),
      (doc.extractedValues ?? {}) as Record<string, number | string | boolean | null | undefined>,
    );

    // Cast en BankConditions — la forme riche FullBankConditions est stockée
    // tel quel dans grid.conditions ; les algorithmes d'audit lisent les
    // champs nominaux (tenueCompte.particulierLocal, fraisCartes.*, …).
    const conditionsForGrid: BankConditions = {
      ...(perDocConditions as unknown as BankConditions),
      id: uuidv4(),
      bankCode: bank.code,
      bankName: bank.name,
      country: bank.country,
      currency,
      effectiveDate: doc.effectiveDate ? new Date(doc.effectiveDate) : now,
      ...(doc.expirationDate ? { expirationDate: new Date(doc.expirationDate) } : {}),
      // Les rubriques auto-créées à l'import deviennent des FeeSchedule →
      // elles entrent dans le calcul d'anomalies (OverchargeAnalyzer,
      // GhostFeeDetector, ComplianceAudit lisent conditions.fees).
      fees: customFeesToFeeSchedules(doc.extractedCustomFees ?? []),
      interestRates: [],
      isActive: true,
    };

    const effDate = doc.effectiveDate ? new Date(doc.effectiveDate) : now;
    const expDate = doc.expirationDate ? new Date(doc.expirationDate) : undefined;

    const existing = findGridForDoc(doc);
    if (existing) {
      updateConditionGrid(bankId, existing.id, {
        conditions: conditionsForGrid,
        effectiveDate: effDate,
        expirationDate: expDate,
        status: 'active',
        segment: doc.segment ?? existing.segment,
        sourceDocument: doc,
        updatedAt: now,
      });
    } else {
      addConditionGrid(bankId, {
        bankId,
        name: doc.name.replace(/\.[^.]+$/, '') || 'Conditions importées',
        version: effDate.toISOString().slice(0, 7),
        effectiveDate: effDate,
        expirationDate: expDate,
        status: 'active',
        segment: doc.segment,
        conditions: conditionsForGrid,
        sourceDocument: doc,
        notes: `Grille dérivée du document « ${doc.name} »${doc.segment ? ` (${doc.segment})` : ''}.`,
      });
    }
  }

  // activeGridId est maintenu par le store via addConditionGrid (positionne
  // sur la première grille active s'il n'y en a aucune) et archiveConditionGrid
  // (réassigne automatiquement si on archive l'active courante). Pas besoin
  // d'appel explicite à setActiveGrid — qui aurait archivé les autres grilles
  // actives (effet secondaire indésirable ici).
}

function getZoneFromCountry(country: string): MonetaryZone | null {
  if (country in CEMAC_COUNTRIES) return 'CEMAC';
  if (country in UEMOA_COUNTRIES) return 'UEMOA';
  return null;
}

interface BanksPageProps {
  /**
   * Segment tarifaire d'import (console admin : onglets « Particuliers » /
   * « Entreprises »). Quand fourni : filtre d'emblée les grilles sur ce
   * segment, étiquette les nouvelles grilles importées, et pré-sélectionne le
   * segment dans l'onglet « Validation IA » (publication L2). Absent = vue
   * cliente standard, tous segments.
   */
  defaultSegment?: TariffSegment;
  /**
   * Console admin : affiche une pastille par banque indiquant le nombre de
   * barèmes importés couvrant les Particuliers / Entreprises (référentiel L2).
   */
  showConditionsCoverage?: boolean;
}

export function BanksPage({ defaultSegment, showConditionsCoverage }: BanksPageProps = {}) {
  const {
    banks,
    addBank,
    updateBank,
    updateConditions,
    deleteBank: _deleteBank,
    selectedBankId,
    setSelectedBank,
    getAllGrids,
    getActiveGrid,
    addConditionGrid,
    updateConditionGrid,
    archiveConditionGrid,
    deleteConditionGrid,
    setActiveGrid,
  } = useBankStore();

  // Pastille de couverture (console admin) : nb de barèmes importés par banque,
  // ventilés Particuliers / Entreprises, d'après le journal du référentiel L2.
  const [segCounts, setSegCounts] = useState<Map<string, BankSegmentCounts>>(new Map());
  useEffect(() => {
    if (!showConditionsCoverage) return;
    let cancelled = false;
    void fetchReferenceJournal().then((rows) => {
      if (!cancelled) setSegCounts(bankSegmentCounts(rows));
    });
    return () => { cancelled = true; };
  }, [showConditionsCoverage]);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('banks');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoneFilter, setZoneFilter] = useState<MonetaryZone | 'all'>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  // Modal states
  const [showAddBank, setShowAddBank] = useState(false);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [showConditions, setShowConditions] = useState(false);
  // Quand on ouvre la modale via « Éditer la grille X », on lui passe l'id
  // du document source — la modale scrolle jusqu'à lui dans l'onglet
  // Documents et applique ses extractedValues pour montrer SES valeurs
  // (pas la fusion cross-doc du blob legacy bank.conditions).
  const [focusDocumentId, setFocusDocumentId] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingBankId, setUploadingBankId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Conditions verification modal state — opened after extraction so the user
  // can review/edit/validate before the grid is committed to the store.
  const [verification, setVerification] = useState<{
    file: File;
    payload: VerificationPayload;
    bankId: string;
    bank: Bank;
  } | null>(null);

  // File d'attente d'import multi-fichiers : permet d'importer plusieurs
  // grilles (périodes/années précédentes) en une seule sélection. Chaque
  // fichier passe à tour de rôle par la modale de vérification.
  const [pendingImports, setPendingImports] = useState<{ file: File; bankId: string }[]>([]);

  // Mode de validation de la file d'import en cours :
  //   null            → import « legacy » mono-banque (vérif + éditeur ouvert)
  //   'verify'        → import groupé, vérification par fichier
  //   'auto'          → import groupé, auto-commit (rubriques ≥ seuil)
  //   'auto-doubt'    → import groupé, auto-commit sauf fichier douteux → vérif
  const [importMode, setImportMode] = useState<BatchValidationMode | null>(null);
  const [showBatchImport, setShowBatchImport] = useState(false);

  // Selected bank
  const selectedBank = useMemo(() => {
    return selectedBankId ? banks.find(b => b.id === selectedBankId) ?? null : null;
  }, [banks, selectedBankId]);

  // Bank grids
  const selectedBankGrids = useMemo(() => {
    if (!selectedBank) return [];
    return getAllGrids(selectedBank.id);
  }, [selectedBank, getAllGrids]);

  // Filtered banks
  const filteredBanks = useMemo(() => {
    let result = banks;

    if (zoneFilter !== 'all') {
      result = result.filter(
        (bank) => bank.zone === zoneFilter || getZoneFromCountry(bank.country) === zoneFilter
      );
    }

    if (countryFilter !== 'all') {
      result = result.filter((bank) => bank.country === countryFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (bank) =>
          bank.name.toLowerCase().includes(term) ||
          bank.code.toLowerCase().includes(term) ||
          AFRICAN_COUNTRIES[bank.country]?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [banks, zoneFilter, countryFilter, searchTerm]);

  // All grids for grid history view
  const allGrids = useMemo(() => {
    let grids: (ConditionGrid & { bankName: string; bankCountry: string })[] = [];

    banks.forEach(bank => {
      const bankGrids = getAllGrids(bank.id);
      bankGrids.forEach(grid => {
        grids.push({
          ...grid,
          bankName: bank.name,
          bankCountry: bank.country,
        });
      });
    });

    // Apply filters
    if (zoneFilter !== 'all') {
      grids = grids.filter(g => getZoneFromCountry(g.bankCountry) === zoneFilter);
    }
    if (countryFilter !== 'all') {
      grids = grids.filter(g => g.bankCountry === countryFilter);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      grids = grids.filter(g =>
        g.name.toLowerCase().includes(term) ||
        g.bankName.toLowerCase().includes(term)
      );
    }

    // Sort by date (most recent first)
    return grids.sort((a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );
  }, [banks, getAllGrids, zoneFilter, countryFilter, searchTerm]);

  // Available countries for filter
  const availableCountries = useMemo(() => {
    if (zoneFilter === 'CEMAC') return CEMAC_COUNTRIES;
    if (zoneFilter === 'UEMOA') return UEMOA_COUNTRIES;
    return AFRICAN_COUNTRIES;
  }, [zoneFilter]);

  // Handle document upload and extraction. PDFs go through the verification
  // modal (split-screen: source PDF + editable rubric mapping). The grid is
  // only committed to the store when the user validates the modal.
  // Traite la file d'import : extrait le prochain fichier exploitable et ouvre
  // la modale de vérification. Les fichiers vides/en erreur sont ignorés (avec
  // notification) et l'on passe automatiquement au suivant.
  // Un fichier est « douteux » (mode auto-doubt → on ouvre la vérification) si
  // aucune ligne n'atteint le seuil d'auto-validation, ou si la confiance
  // moyenne est basse.
  const hasImportDoubt = (payload: VerificationPayload): boolean => {
    if (payload.rows.length === 0) return true;
    const eligible = payload.rows.filter((r) => r.confidence >= AUTO_VALIDATE_CONFIDENCE).length;
    return eligible === 0 || payload.stats.averageConfidence < 0.75;
  };

  // Traite la file d'import. `mode` = null → import mono-banque « legacy »
  // (vérification systématique + ouverture de l'éditeur à la fin). Sinon import
  // GROUPÉ multi-banques : 'verify' (vérif par fichier), 'auto' (auto-commit),
  // 'auto-doubt' (auto-commit sauf fichiers douteux). Les fichiers en erreur /
  // sans condition sont ignorés (notification) et l'on passe au suivant.
  const processNextImport = async (
    queue: { file: File; bankId: string }[],
    mode: BatchValidationMode | null = null,
  ) => {
    let remaining = queue;
    while (remaining.length > 0) {
      const [head, ...rest] = remaining;
      const bank = banks.find((b) => b.id === head.bankId);
      if (!bank) {
        remaining = rest;
        continue;
      }
      setIsUploading(true);
      setUploadingBankId(head.bankId);
      try {
        const result = await extractConditions(head.file, { bankCode: bank.code });
        if (result.rawPairs.length === 0) {
          alert(`Aucune condition n'a pu être extraite de « ${head.file.name} ». Fichier ignoré.`);
          remaining = rest;
          continue;
        }
        const payload = buildConditionsPayload({
          fileName: head.file.name,
          bankCode: bank.code,
          pairs: result.rawPairs,
          matches: result.matches,
          detectedSegment: result.detectedSegment,
          detectedEffectiveDate: result.detectedEffectiveDate,
          detectedPeriodLabel: result.detectionEvidence?.periodLabel,
        });

        const wantsVerify =
          mode === null || mode === 'verify' || (mode === 'auto-doubt' && hasImportDoubt(payload));

        if (wantsVerify) {
          // On mémorise le reste de la file + le mode, puis on ouvre la vérif.
          setPendingImports(rest);
          setImportMode(mode);
          setVerification({ file: head.file, payload, bankId: head.bankId, bank });
          return;
        }

        // Auto-commit : on valide les rubriques ≥ seuil sans écran de vérif.
        const commit = buildAutoCommitResult(payload);
        await commitConditions({ file: head.file, bank, bankId: head.bankId }, commit, { openEditor: false });
        remaining = rest;
        continue;
      } catch (error) {
        console.error('Erreur extraction conditions:', error);
        alert(`Erreur lors de l'extraction de « ${head.file.name} ». Fichier ignoré.`);
        remaining = rest;
        continue;
      } finally {
        setIsUploading(false);
        setUploadingBankId(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
    // File épuisée.
    setPendingImports([]);
    setImportMode(null);
  };

  // Lance un import GROUPÉ multi-banques depuis la modale d'assignation.
  const runBatchImport = async (
    assignments: { file: File; bankId: string }[],
    mode: BatchValidationMode,
  ) => {
    setShowBatchImport(false);
    if (assignments.length === 0) return;
    await processNextImport(assignments, mode);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>, bankId: string) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const bank = banks.find((b) => b.id === bankId);
    if (!bank) return;
    // Chaque fichier = une période/grille potentielle (années précédentes incluses).
    await processNextImport(files.map((file) => ({ file, bankId })));
  };

  // Crée et enregistre une ConditionGrid à partir d'un CommitResult, pour un
  // fichier + une banque donnés. Partagé par la modale de vérification ET
  // l'auto-commit de l'import groupé (aucun accès à l'état `verification` ni à
  // `selectedBank` : la banque cible est explicite → correct en multi-banques).
  const commitConditions = async (
    ctx: { file: File; bank: Bank; bankId: string },
    commit: CommitResult,
    opts: { openEditor: boolean },
  ) => {
    const { file, bank, bankId } = ctx;

    // On embarque le PDF source (base64) sur le document archivé : sans lui,
    // l'onglet « Publier au référentiel » filtre le document (Boolean(fileData))
    // et affiche « Aucun document à valider », et le lien de téléchargement
    // (href={doc.fileData}) est mort. Repli chaîne vide si la lecture échoue —
    // la grille reste créée, seul le PDF manque.
    let fileData = '';
    try {
      fileData = await fileToDataUrl(file);
    } catch (err) {
      console.error('Erreur conversion PDF → base64:', err);
    }

    // Sépare les rubriques validées en deux canaux (comme l'import de la
    // modale) :
    //   • clés du REGISTRE → extractedValues, PUIS traduites vers l'espace de
    //     noms du formulaire (tenueCompte.*, fraisCartes.*, …) via
    //     applyExtractedValuesToConditions — le SEUL espace lu par la grille
    //     (GridSummaryCard) et par les algorithmes d'audit.
    //   • clés CUSTOM      → CustomFee[] → fees[] (détecteurs ghost-fee /
    //     surfacturation).
    // AVANT ce correctif on faisait setByPath(structured, 'accountFees.…') :
    // les valeurs atterrissaient dans un espace de noms que PERSONNE ne lit,
    // d'où « paires détectées » mais « aucune donnée » importée.
    const extractedValues: Record<string, number> = {};
    const customFees: CustomFee[] = [];
    if (commit.conditions) {
      for (const [rubricKey, val] of Object.entries(commit.conditions)) {
        // Ignore les lignes purement qualitatives (valeur numérique nulle).
        if (val.qualitative && val.value === 0) continue;
        if (isCustomRubricKey(rubricKey)) {
          const parsed = parseCustomRubricKey(rubricKey);
          customFees.push({
            id: uuidv4(),
            label: val.label ?? parsed?.slug ?? 'Rubrique',
            amount: Number.isFinite(val.value) ? val.value : 0,
            type: val.unit === '%' ? 'percent' : 'fixed',
            frequency: 'per_operation',
            category: val.category ?? parsed?.category ?? 'divers',
          });
        } else {
          extractedValues[rubricKey] = val.value;
        }
      }
    }
    const mappedCount = Object.keys(extractedValues).length;
    const customCount = customFees.length;

    // Registre → formulaire (tenueCompte.particulierLocal, …).
    const fullConditions = applyExtractedValuesToConditions(
      getEmptyFullConditions(),
      extractedValues,
    );

    // Document source archivé — un SEUL objet partagé par documents[] et
    // sourceDocument (id commun → reconcileGridsFromDocuments le retrouve par
    // id). Porte extractedValues/CustomFees pour que la ré-édition et la
    // réconciliation de grille repartent exactement des mêmes valeurs.
    const archivedDoc: ArchivedDocument = {
      id: uuidv4(),
      name: file.name,
      type: 'conditions',
      uploadDate: new Date(),
      effectiveDate: new Date(),
      fileData,
      fileSize: file.size,
      extractedAt: new Date(),
      extractedValues: mappedCount > 0 ? extractedValues : undefined,
      extractedCustomFees: customCount > 0 ? customFees : undefined,
      ...(defaultSegment ? { segment: defaultSegment } : {}),
      isActive: true,
    };

    const baseConditions: BankConditions = {
      ...(fullConditions as unknown as BankConditions),
      id: uuidv4(),
      bankCode: bank.code,
      bankName: bank.name,
      country: bank.country,
      currency: bank.zone === 'UEMOA' ? 'XOF' : 'XAF',
      effectiveDate: new Date(),
      fees: customFeesToFeeSchedules(customFees),
      interestRates: [],
      isActive: true,
      documents: [archivedDoc],
    };

    const newGrid: Omit<ConditionGrid, 'id' | 'createdAt' | 'updatedAt'> = {
      bankId,
      name: `Conditions ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`,
      version: new Date().toISOString().slice(0, 7),
      effectiveDate: new Date(),
      status: 'active',
      // Étiquette la grille avec le segment de l'onglet d'import admin
      // (Particuliers / Entreprises) quand on est dans ce contexte.
      ...(defaultSegment ? { segment: defaultSegment } : {}),
      conditions: baseConditions,
      sourceDocument: archivedDoc,
      notes: `${commit.validated} rubrique(s) validée(s), ${commit.rejected} rejetée(s).`,
    };

    // Archive la grille active DE CETTE banque (pas celle de selectedBank).
    const currentActive = getActiveGrid(bankId);
    if (currentActive) {
      archiveConditionGrid(bankId, currentActive.id);
    }
    const createdGrid = addConditionGrid(bankId, newGrid);
    setActiveGrid(bankId, createdGrid.id);

    // Ouverture de l'éditeur uniquement en import mono-banque (jamais en batch).
    if (opts.openEditor) {
      setSelectedBank(bankId);
      setShowConditions(true); // open the legacy editor on the new grid for fine-tuning
      if (mappedCount === 0 && customCount === 0) {
        // Soft warning — grid is created and document archived; user can fill manually.
        setTimeout(() => {
          alert(
            'Aucune rubrique n\'a été automatiquement mappée. La grille a été créée et le document archivé '
            + '— tu peux maintenant saisir les valeurs manuellement dans les onglets.'
          );
        }, 200);
      }
    }

    return { mappedCount, customCount };
  };

  // La modale de vérification a validé un fichier → commit puis on enchaîne la
  // file (même mode). L'éditeur ne s'ouvre qu'en import mono-banque (mode null)
  // et seulement pour le dernier fichier de la file.
  const handleVerifiedConditionsCommit = async (_args: CommitArgs, commit: CommitResult) => {
    if (!verification) {
      return;
    }
    const { bankId, bank, file } = verification;
    const mode = importMode;
    const next = pendingImports;

    setVerification(null);
    setPendingImports([]);

    await commitConditions(
      { file, bank, bankId },
      commit,
      { openEditor: mode === null && next.length === 0 },
    );

    if (next.length > 0) {
      void processNextImport(next, mode);
    } else {
      setImportMode(null);
    }
  };

  const handleSaveBank = (data: Partial<Bank>) => {
    if (editingBank) {
      updateBank(editingBank.id, data);
    } else {
      addBank({ ...data, conditions: null, isActive: true } as Omit<Bank, 'id'>);
    }
    setShowAddBank(false);
    setEditingBank(null);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: ConditionGrid['status']) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Active</Badge>;
      case 'archived':
        return <Badge variant="secondary" className="flex items-center gap-1"><Archive className="w-3 h-3" />Archivee</Badge>;
      case 'draft':
        return <Badge variant="warning" className="flex items-center gap-1"><FileText className="w-3 h-3" />Brouillon</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {/* Compact Header with Filters */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-primary-100">
        {/* Left: Title + View Toggle */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-primary-900">Banques</h1>

          {/* View Mode Toggle */}
          <div className="flex bg-primary-100 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('banks')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'banks' ? 'bg-white text-primary-900 shadow-sm' : 'text-primary-500 hover:text-primary-900'
              }`}
            >
              <Landmark className="w-3 h-3" />
              Liste
            </button>
            <button
              onClick={() => setViewMode('grids')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'grids' ? 'bg-white text-primary-900 shadow-sm' : 'text-primary-500 hover:text-primary-900'
              }`}
            >
              <History className="w-3 h-3" />
              Grilles
            </button>
          </div>

          {/* Zone badges as quick filters */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setZoneFilter(zoneFilter === 'CEMAC' ? 'all' : 'CEMAC')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                zoneFilter === 'CEMAC'
                  ? 'bg-blue-500 text-white'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              CEMAC {banks.filter(b => b.zone === 'CEMAC' || getZoneFromCountry(b.country) === 'CEMAC').length}
            </button>
            <button
              onClick={() => setZoneFilter(zoneFilter === 'UEMOA' ? 'all' : 'UEMOA')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
                zoneFilter === 'UEMOA'
                  ? 'bg-green-500 text-white'
                  : 'bg-green-50 text-green-600 hover:bg-green-100'
              }`}
            >
              UEMOA {banks.filter(b => b.zone === 'UEMOA' || getZoneFromCountry(b.country) === 'UEMOA').length}
            </button>
            <span className="text-xs text-primary-400 px-1">
              {allGrids.filter(g => g.status === 'active').length} grilles
            </span>
          </div>
        </div>

        {/* Right: Filters + Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-sm w-32 sm:w-44"
            />
          </div>

          {/* Zone Filter (mobile) */}
          <Select
            value={zoneFilter}
            onChange={(e) => {
              setZoneFilter(e.target.value as MonetaryZone | 'all');
              setCountryFilter('all');
            }}
            className="h-9 text-sm w-28 md:hidden"
          >
            <option value="all">Zone</option>
            <option value="CEMAC">CEMAC</option>
            <option value="UEMOA">UEMOA</option>
          </Select>

          {/* Country Filter */}
          <Select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="h-9 text-sm w-36"
          >
            <option value="all">Tous les pays</option>
            {Object.entries(availableCountries).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </Select>

          {(zoneFilter !== 'all' || countryFilter !== 'all' || searchTerm) && (
            <button
              className="p-1.5 text-primary-400 hover:text-primary-600"
              onClick={() => {
                setZoneFilter('all');
                setCountryFilter('all');
                setSearchTerm('');
              }}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="h-9 text-sm px-3"
            onClick={() => setShowBatchImport(true)}
            title="Importer des conditions pour plusieurs banques en une fois"
          >
            <Upload className="w-4 h-4 mr-1" />
            Import multi-banques
          </Button>
          <Button size="sm" className="h-9 text-sm px-3" onClick={() => setShowAddBank(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Banque
          </Button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'banks' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bank List */}
          <Card className="lg:col-span-1">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">Banques ({filteredBanks.length})</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-primary-100 max-h-[calc(100vh-180px)] overflow-y-auto">
                {filteredBanks.map((bank) => {
                  const bankActiveGrid = getActiveGrid(bank.id);

                  return (
                    <div
                      key={bank.id}
                      onClick={() => setSelectedBank(bank.id)}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        selectedBankId === bank.id ? 'bg-primary-100' : 'hover:bg-primary-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-primary-100`}>
                            <Landmark className={`w-3.5 h-3.5 text-primary-600`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-primary-900 truncate">{bank.name}</p>
                            <p className="text-[10px] text-primary-500 truncate">
                              {AFRICAN_COUNTRIES[bank.country]} • {bank.code}
                              {bankActiveGrid && <span className="text-primary-600 ml-1">• Grille</span>}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {showConditionsCoverage && (() => {
                            const c = segCounts.get(bank.code);
                            const p = c?.particulier ?? 0;
                            const e = c?.entreprise ?? 0;
                            return (
                              <span className="flex items-center gap-1" title={`${p} barème(s) Particuliers · ${e} barème(s) Entreprises`}>
                                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${p > 0 ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-primary-200 bg-primary-50 text-primary-400'}`}>
                                  P {p}
                                </span>
                                <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${e > 0 ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-primary-200 bg-primary-50 text-primary-400'}`}>
                                  E {e}
                                </span>
                              </span>
                            );
                          })()}
                          <ChevronRight className="w-4 h-4 text-primary-300" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredBanks.length === 0 && (
                  <div className="p-6 text-center">
                    <Landmark className="w-8 h-8 text-primary-300 mx-auto mb-2" />
                    <p className="text-xs text-primary-500">Aucune banque</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Bank Detail & Grid Viewer */}
          <div className="lg:col-span-2 space-y-3">
            {selectedBank ? (
              <>
                {/* Compact Bank Header */}
                <div className="flex items-center justify-between bg-white rounded-lg border border-primary-200 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-primary-100">
                      <Landmark className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-primary-900">{selectedBank.name}</h2>
                      <p className="text-xs text-primary-500">
                        {AFRICAN_COUNTRIES[selectedBank.country]} • {selectedBank.code} •{' '}
                        <span className="text-primary-600">
                          {selectedBank.zone === 'UEMOA' || getZoneFromCountry(selectedBank.country) === 'UEMOA' ? 'XOF' : 'XAF'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="file"
                      ref={fileInputRef}
                      multiple
                      accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tiff,.bmp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                      onChange={(e) => handlePdfUpload(e, selectedBank.id)}
                      className="hidden"
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading && uploadingBankId === selectedBank.id}
                    >
                      {isUploading && uploadingBankId === selectedBank.id ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3 mr-1" />
                      )}
                      PDF
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={() => setShowConditions(true)}>
                      <Pencil className="w-3 h-3 mr-1" />
                      Editer
                    </Button>
                  </div>
                </div>

                {/* Panneau Grilles tarifaires — switcher + détail */}
                <BankGridsPanel
                  bank={selectedBank}
                  grids={selectedBankGrids}
                  zone={selectedBank.zone ?? getZoneFromCountry(selectedBank.country)}
                  onUploadPdf={() => fileInputRef.current?.click()}
                  onEditGrid={(grid) => {
                    setFocusDocumentId(grid?.sourceDocument?.id ?? null);
                    setShowConditions(true);
                  }}
                  onViewSource={(grid) => {
                    setFocusDocumentId(grid.sourceDocument?.id ?? null);
                    setShowConditions(true);
                  }}
                  onDeleteGrid={(grid) => deleteConditionGrid(grid.bankId, grid.id)}
                  onChangeSegment={(grid, segment) =>
                    updateConditionGrid(grid.bankId, grid.id, { segment: segment ?? undefined })
                  }
                  initialSegment={defaultSegment}
                />
              </>
            ) : (
              <Card className="p-8 text-center">
                <Landmark className="w-10 h-10 text-primary-300 mx-auto mb-2" />
                <p className="text-sm text-primary-500">Selectionnez une banque</p>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Grid History Table View */
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm">Grilles ({allGrids.length})</CardTitle>
          </CardHeader>
          <CardBody className="p-0">
            {allGrids.length > 0 ? (
              <div className="overflow-x-auto max-h-[calc(100vh-180px)]">
                <table className="w-full text-xs">
                  <thead className="bg-primary-50 border-b border-primary-200 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-medium text-primary-500">Banque</th>
                      <th className="text-left px-2 py-1.5 font-medium text-primary-500">Grille</th>
                      <th className="text-left px-2 py-1.5 font-medium text-primary-500">Ver.</th>
                      <th className="text-left px-2 py-1.5 font-medium text-primary-500">Date</th>
                      <th className="text-left px-2 py-1.5 font-medium text-primary-500">Statut</th>
                      <th className="text-left px-2 py-1.5 font-medium text-primary-500">Pays</th>
                      <th className="text-right px-2 py-1.5 font-medium text-primary-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-100">
                    {allGrids.map((grid) => (
                      <tr key={grid.id} className="hover:bg-primary-50">
                        <td className="px-2 py-1.5">
                          <span className="font-medium text-primary-900">{grid.bankName}</span>
                        </td>
                        <td className="px-2 py-1.5 text-primary-700 truncate max-w-[120px]">{grid.name}</td>
                        <td className="px-2 py-1.5 text-primary-500">v{grid.version}</td>
                        <td className="px-2 py-1.5 text-primary-600">
                          {formatDate(grid.effectiveDate)}
                        </td>
                        <td className="px-2 py-1.5">{getStatusBadge(grid.status)}</td>
                        <td className="px-2 py-1.5 text-primary-600">
                          {AFRICAN_COUNTRIES[grid.bankCountry]}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              className="p-1 text-primary-400 hover:text-primary-600"
                              onClick={() => {
                                const bank = banks.find(b => b.id === grid.bankId);
                                if (bank) {
                                  setSelectedBank(bank.id);
                                  setFocusDocumentId(grid.sourceDocument?.id ?? null);
                                  setShowConditions(true);
                                }
                              }}
                              title="Voir / éditer cette grille"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {grid.status !== 'active' && (
                              <button
                                className="p-1 text-primary-500 hover:text-primary-600"
                                onClick={() => updateConditionGrid(grid.bankId, grid.id, { status: 'active' })}
                                title="Réactiver cette grille (sans toucher aux autres)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              className="p-1 text-red-400 hover:text-red-600"
                              onClick={() => {
                                if (confirm('Supprimer?')) {
                                  deleteConditionGrid(grid.bankId, grid.id);
                                }
                              }}
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center">
                <History className="w-10 h-10 text-primary-300 mx-auto mb-2" />
                <p className="text-sm text-primary-500">Aucune grille</p>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Modals */}
      <BankFormModal
        isOpen={showAddBank || !!editingBank}
        onClose={() => {
          setShowAddBank(false);
          setEditingBank(null);
        }}
        onSave={handleSaveBank}
        bank={editingBank}
      />

      <BankConditionsModal
        isOpen={showConditions}
        onClose={() => {
          setShowConditions(false);
          setFocusDocumentId(null);
        }}
        bank={selectedBank}
        focusDocumentId={focusDocumentId}
        defaultSegment={defaultSegment}
        onSaveConditions={(bankId, conditions) => {
          // 1. Persiste la version riche du formulaire dans bank.conditions
          //    (champ legacy utilisé pour l'affichage et la rétrocompatibilité)
          updateConditions(bankId, conditions);

          // 2. Réconcilie bank.conditionGrids[] depuis conditions.documents[].
          //    Chaque document actif avec extractedValues devient une
          //    ConditionGrid distincte couvrant sa propre période — c'est
          //    sur ces grilles que BankConditionsResolver.splitTransactionsByGrid
          //    s'appuie pour appliquer la bonne grille tarifaire à chaque
          //    transaction selon sa date. Sans cette étape, deux PDFs
          //    « En vigueur » dans la modale ne produiraient qu'une seule
          //    grille et l'audit utiliserait le mauvais tarif sur l'une
          //    des deux périodes.
          const bank = banks.find((b) => b.id === bankId);
          if (!bank) return;
          reconcileGridsFromDocuments({
            bankId,
            bank,
            documents: (conditions.documents as ArchivedDocument[] | undefined) ?? [],
            existingGrids: bank.conditionGrids ?? [],
            addConditionGrid,
            updateConditionGrid,
            archiveConditionGrid,
          });
        }}
        onUploadDocument={(_bankId, _document) => {
          // Handled by the verification modal flow inside BankConditionsModal
        }}
      />

      {/* Conditions verification modal — opens after PDF extraction */}
      <BatchImportModal
        open={showBatchImport}
        banks={banks}
        onClose={() => setShowBatchImport(false)}
        onRun={runBatchImport}
      />

      {verification && (
        <ImportVerificationModal
          open
          file={verification.file}
          initialPayload={verification.payload}
          onCommit={handleVerifiedConditionsCommit}
          onCancel={() => {
            setVerification(null);
            // On saute ce fichier mais on poursuit la file d'import restante
            // (même mode de validation).
            const mode = importMode;
            if (pendingImports.length > 0) {
              const next = pendingImports;
              setPendingImports([]);
              void processNextImport(next, mode);
            } else {
              setImportMode(null);
            }
          }}
        />
      )}
    </div>
  );
}
