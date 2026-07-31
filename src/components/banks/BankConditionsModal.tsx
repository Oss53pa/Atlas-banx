import { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Landmark,
  Building2,
  CreditCard,
  ArrowLeftRight,
  FileText,
  Percent,
  AlertTriangle,
  Settings,
  Upload,
  Trash2,
  Eye,
  FileUp,
  Loader2,
  MapPin,
  Sparkles,
  Plus,
  Save,
  ChevronDown,
  ChevronUp,
  Banknote,
  Receipt,
  Shield,
  Phone,
  Smartphone,
  Lock,
  Users,
  Building,
  Globe,
  Wallet,
} from 'lucide-react';
import { Button, Badge } from '../ui';
import type { Bank, BankConditions, ArchivedDocument, TariffSegment, ValidatedConditionLine } from '../../types';
import { ValidationTabContent } from './ValidationTabContent';
import { useAuthStore } from '../../store/authStore';
import { AFRICAN_COUNTRIES, ZONE_CURRENCIES } from '../../types';
import { getDocumentEngine, type ExtractionReport } from '../../extraction';
import { extractConditions, listApprovedRubrics } from '../../extraction/conditions';
import {
  type FullBankConditions,
  type CustomFee,
  getEmptyFullConditions,
  mergeBankConditions,
  applyExtractedValuesToConditions,
} from '../../extraction/conditionsForm';
import { normalizeForMatch } from '../../extraction/normalize';
import { sha256HexOfFile } from '../../utils/crypto';
import { ExtractionReportPanel } from './ExtractionReportPanel';
import {
  ImportVerificationModal,
  buildConditionsPayload,
  type CommitArgs,
  type CommitResult,
  type VerificationPayload,
} from '../import-verification';
import { v4 as uuidv4 } from 'uuid';

// Valid custom-fee categories = the edit-form tab ids. Auto-created fees
// must land in one of these so they render under the right tab.
const CUSTOM_FEE_TABS = new Set([
  'compte', 'guichet', 'cartes', 'virements', 'cheques', 'credits', 'ebanking', 'divers',
]);

/** Coerce an arbitrary category string to a valid tab id (fallback: divers). */
function normalizeCategory(category?: string): string {
  return category && CUSTOM_FEE_TABS.has(category) ? category : 'divers';
}

/** Dedup signature for a custom fee — category + accent/space-insensitive label. */
function customFeeSignature(category: string, label: string): string {
  return `${category}::${normalizeForMatch(label)}`;
}

// Determine zone from country code
function getZoneFromCountry(country: string): 'CEMAC' | 'UEMOA' | null {
  const cemacCountries = ['CM', 'CF', 'CG', 'GA', 'GQ', 'TD'];
  const uemoaCountries = ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'];
  if (cemacCountries.includes(country)) return 'CEMAC';
  if (uemoaCountries.includes(country)) return 'UEMOA';
  return null;
}

interface BankConditionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bank: Bank | null;
  onSaveConditions: (bankId: string, conditions: Partial<BankConditions>) => void;
  onUploadDocument: (bankId: string, document: ArchivedDocument) => void;
  /**
   * Si fourni à l'ouverture : la modale bascule sur l'onglet Documents,
   * scroll jusqu'au document correspondant et applique ses valeurs extraites
   * dans le formulaire. Utilisé pour « Éditer la grille X » depuis la liste
   * des grilles dans BanksPage — l'utilisateur arrive directement sur la
   * vue d'édition de cette grille tarifaire en particulier.
   */
  focusDocumentId?: string | null;
  /**
   * Segment tarifaire d'import (console admin). Pré-sélectionne le barème dans
   * l'onglet « Validation IA » lors de la publication L2.
   */
  defaultSegment?: TariffSegment;
}

// FullBankConditions, REGISTRY_TO_FORM_PATH, getEmptyFullConditions,
// mergeBankConditions et applyExtractedValuesToConditions vivent dans
// src/extraction/conditionsForm.ts — partagés avec BanksPage qui en a besoin
// pour synthétiser une ConditionGrid par document actif au save.


type TabId = 'compte' | 'guichet' | 'cartes' | 'virements' | 'cheques' | 'credits' | 'ebanking' | 'divers' | 'documents' | 'validation';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'documents', label: 'Documents', icon: <FileUp className="w-4 h-4" /> },
  { id: 'compte', label: 'Compte', icon: <Building2 className="w-4 h-4" /> },
  { id: 'guichet', label: 'Opérations guichet', icon: <Banknote className="w-4 h-4" /> },
  { id: 'cartes', label: 'Cartes', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'virements', label: 'Virements', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'cheques', label: 'Chèques', icon: <FileText className="w-4 h-4" /> },
  { id: 'credits', label: 'Crédits & Agios', icon: <Percent className="w-4 h-4" /> },
  { id: 'ebanking', label: 'E-Banking', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'divers', label: 'Divers', icon: <Settings className="w-4 h-4" /> },
  { id: 'validation', label: 'Publier au référentiel', icon: <Sparkles className="w-4 h-4" /> },
];


export function BankConditionsModal({
  isOpen,
  onClose,
  bank,
  onSaveConditions,
  focusDocumentId,
  defaultSegment,
}: BankConditionsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('documents');

  // L'onglet « Validation IA » alimente le référentiel MUTUALISÉ (L2), partagé
  // par tous les clients : réservé aux administrateurs Atlas Studio. Les clients
  // gèrent leurs conditions particulières via les autres onglets. La véritable
  // barrière est la RLS (écriture L2 = is_admin()) ; ce filtre masque juste
  // l'entrée côté client.
  // NB : le type généré de profile.role diverge du schéma réel (admin/client/
  // super_admin) ; comparaison via string, alignée sur public.is_admin().
  const role = useAuthStore((s) => s.profile?.role) as string | undefined;
  const isAdmin = role === 'admin' || role === 'super_admin';
  const visibleTabs = TABS.filter((t) => t.id !== 'validation' || isAdmin);

  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionReport, setExtractionReport] = useState<ExtractionReport | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<{ stage: string; pct: number; message: string } | null>(null);
  // ⚠ hasChanges N'EST PLUS un useState — c'est un *computed value* dérivé
  // du diff conditions ↔ baseline. Aucun setState concurrent ne peut plus
  // l'écraser : la valeur est recalculée à chaque render. Le seul moyen
  // de "saver" (= rendre le bouton désactivé) est de mettre à jour
  // `baseline` (le state ci-dessous) — ce qui ne se produit qu'au mount
  // pour une nouvelle banque, ou explicitement après un Save.
  const [baseline, setBaseline] = useState<string>('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  // Success toast after save. When showSaveSuccess === true, a banner displays
  // "Conditions bancaires importées avec succès". The modal then auto-closes
  // ~1.5s later — EXCEPT from the « Publier au référentiel » tab, where it
  // stays open so the user can save then publish without losing context.
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Verification modal — opens after extraction so the user can review the
  // raw label/value pairs and validate before they're applied to the form.
  const [verification, setVerification] = useState<{
    file: File;
    payload: VerificationPayload;
    contentHash?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs vers chaque carte document de l'onglet Documents — utilisés pour
  // scroller jusqu'au document ciblé par focusDocumentId à l'ouverture
  // (« Éditer cette grille » depuis BanksPage).
  const docCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // État local pour les conditions éditables — squelette vide à l'initialisation.
  // Les valeurs réelles sont chargées dans le useEffect ci-dessous, soit depuis
  // bank.conditions (import PDF / saisie précédente), soit zéro partout.
  const [conditions, setConditions] = useState<FullBankConditions>(getEmptyFullConditions());

  // ⚠ Approche définitive : la baseline est un state, le dirty flag est
  // computed à chaque render via useMemo. Aucun useEffect, aucun
  // setState n'intervient sur le dirty flag — il EST le diff,
  // littéralement.
  const lastInitBankIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !bank) {
      if (!isOpen) {
        lastInitBankIdRef.current = null;
        setBaseline('');
      }
      return;
    }
    if (lastInitBankIdRef.current === bank.id) return;
    lastInitBankIdRef.current = bank.id;

    // Le squelette vide définit la STRUCTURE attendue par le formulaire.
    // bank.conditions (= données réelles importées ou saisies) est mergé
    // par-dessus, section par section, pour qu'aucune sous-clé ne soit
    // `undefined`. Pas de valeurs hardcodées : si la banque n'a pas de
    // données, tous les frais s'affichent à 0 et l'utilisateur les remplit.
    let initial = mergeBankConditions(
      getEmptyFullConditions(),
      bank.conditions as Partial<FullBankConditions> | null | undefined,
    );

    // Si la modale a été ouverte sur un document spécifique (« Éditer cette
    // grille » depuis BanksPage), on applique ses extractedValues par-dessus
    // pour que le formulaire affiche les valeurs propres à cette grille
    // tarifaire — pas le merge cross-doc du blob legacy bank.conditions.
    if (focusDocumentId) {
      const focusedDoc = initial.documents.find((d) => d.id === focusDocumentId);
      if (focusedDoc?.extractedValues) {
        initial = applyExtractedValuesToConditions(
          initial,
          focusedDoc.extractedValues as Record<string, number | string | boolean | null | undefined>,
        );
      }
      setActiveTab('documents');
    }

    setConditions(initial);
    setBaseline(serializeForDiff(initial));
  }, [bank, isOpen, focusDocumentId]);

  // hasChanges est COMPUTED, pas un state. Rien ne peut l'écraser.
  // Si baseline est vide (modale jamais initialisée), on considère qu'il
  // y a des changements dès que conditions n'est pas le squelette vide
  // — sinon le bouton Enregistrer reste bloqué à jamais.
  const hasChanges = useMemo(() => {
    if (!isOpen || !bank) return false;
    const current = serializeForDiff(conditions);
    if (!baseline) {
      // Baseline pas encore défini — comparer au squelette vide
      return current !== serializeForDiff(getEmptyFullConditions());
    }
    return current !== baseline;
  }, [conditions, baseline, isOpen, bank]);

  // Diagnostic — expose state to window for debugging.
  // Open the console and inspect `window.__atlasbanx_modal` to see why
  // the Save button is in its current state.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const current = serializeForDiff(conditions);
      (window as unknown as Record<string, unknown>).__atlasbanx_modal = {
        bankId: bank?.id ?? null,
        bankName: bank?.name ?? null,
        isOpen,
        baselineLength: baseline.length,
        currentLength: current.length,
        baselineSample: baseline.slice(0, 200),
        currentSample: current.slice(0, 200),
        match: current === baseline,
        hasChanges,
        conditionsDocCount: conditions.documents.length,
      };
    }
  }, [conditions, baseline, hasChanges, isOpen, bank]);

  // No-op stub for code paths that still call setHasChanges — retained
  // for ergonomic compatibility. The dirty flag derives from the data;
  // these calls are now informational hints (not authoritative).
  const setHasChanges = (_v: boolean): void => {
    // Intentional no-op. The diff drives the UI, not imperative flags.
  };
  void setHasChanges; // keep referenced for legacy call sites

  // Scroll vers le document ciblé à l'ouverture (focusDocumentId fourni
  // par BanksPage quand on clique « Éditer cette grille »). On attend
  // un tick pour que l'onglet Documents soit monté et la liste rendue.
  useEffect(() => {
    if (!isOpen || !focusDocumentId || activeTab !== 'documents') return;
    const timeoutId = window.setTimeout(() => {
      const el = docCardRefs.current[focusDocumentId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => window.clearTimeout(timeoutId);
  }, [isOpen, focusDocumentId, activeTab]);

  if (!isOpen || !bank) return null;

  const zone = bank.zone || getZoneFromCountry(bank.country);
  const currency = zone ? ZONE_CURRENCIES[zone] : { code: 'XAF', name: 'Franc CFA' };
  const countryName = AFRICAN_COUNTRIES[bank.country] || bank.country;

  // Fonction pour mettre à jour une valeur
  const updateValue = (path: string, value: string | number | boolean) => {
    setConditions(prev => {
      const newConditions = { ...prev };
      const keys = path.split('.');
      let current: Record<string, unknown> = newConditions as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      return newConditions;
    });
    setHasChanges(true);
  };

  // Ajouter une carte
  const addCard = () => {
    const newCard = {
      id: uuidv4(),
      nom: 'Nouvelle carte',
      type: 'debit' as const,
      reseau: 'VISA' as const,
      cotisationAnnuelle: 0,
      fraisEmission: 0,
      plafondRetraitJour: 0,
      plafondPaiementJour: 0,
      plafondRetraitMois: 0,
      plafondPaiementMois: 0,
      validiteAnnees: 2,
    };
    setConditions(prev => ({
      ...prev,
      cartes: [...prev.cartes, newCard],
    }));
    setHasChanges(true);
  };

  // Supprimer une carte
  const removeCard = (id: string) => {
    setConditions(prev => ({
      ...prev,
      cartes: prev.cartes.filter(c => c.id !== id),
    }));
    setHasChanges(true);
  };

  // Mettre à jour une carte
  const updateCard = (id: string, field: string, value: string | number) => {
    setConditions(prev => ({
      ...prev,
      cartes: prev.cartes.map(c =>
        c.id === id ? { ...c, [field]: value } : c
      ),
    }));
    setHasChanges(true);
  };

  // Ajouter un frais personnalisé
  const addCustomFee = () => {
    const newFee: CustomFee = {
      id: uuidv4(),
      label: 'Nouveau frais',
      amount: 0,
      type: 'fixed',
      frequency: 'once',
      category: activeTab,
    };
    setConditions(prev => ({
      ...prev,
      customFees: [...prev.customFees, newFee],
    }));
    setHasChanges(true);
  };

  // Supprimer un frais personnalisé
  const removeCustomFee = (id: string) => {
    setConditions(prev => ({
      ...prev,
      customFees: prev.customFees.filter(f => f.id !== id),
    }));
    setHasChanges(true);
  };

  // Toggle section
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Sauvegarder les conditions — persiste, affiche un toast de succès.
  // Ferme la modale après 1,5 s SAUF depuis l'onglet « Publier au référentiel » :
  // on y est en pleine session de validation, fermer ferait perdre le contexte
  // (on veut enregistrer PUIS publier sans quitter). Depuis cet onglet, on
  // garde la modale ouverte.
  const handleSave = () => {
    onSaveConditions(bank.id, conditions as any);
    // Re-baseline → diff devient 0 → hasChanges devient false → bouton désactivé.
    setBaseline(serializeForDiff(conditions));
    setShowSaveSuccess(true);
    const keepOpen = activeTab === 'validation';
    setTimeout(() => {
      setShowSaveSuccess(false);
      if (!keepOpen) onClose();
    }, 1500);
  };

  // Upload document — PDF goes through the verification modal so the user
  // can review the extracted label/value pairs before they're applied.
  // Excel / image still use the legacy engine flow.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so re-uploading the same file fires onChange
    e.target.value = '';

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    setIsUploading(true);
    setExtractionReport(null);
    setExtractionProgress(null);

    try {
      // ─── Détection de doublon (par empreinte SHA-256 du contenu) ─────
      // On refuse d'importer deux fois le MÊME fichier de conditions pour
      // cette banque. Le contrôle porte sur le contenu binaire : un fichier
      // renommé mais identique est quand même détecté.
      let contentHash: string | undefined;
      try {
        contentHash = await sha256HexOfFile(file);
      } catch {
        contentHash = undefined; // pas de hash → on n'empêche pas l'import
      }
      if (contentHash) {
        const dup = conditions.documents.find((d) => d.contentHash === contentHash);
        if (dup) {
          setIsUploading(false);
          setExtractionProgress(null);
          const when = dup.uploadDate instanceof Date
            ? dup.uploadDate.toLocaleDateString('fr-FR')
            : new Date(dup.uploadDate).toLocaleDateString('fr-FR');
          window.dispatchEvent(new CustomEvent('atlas-toast', { detail: {
            type: 'warning',
            message: `Ce document est déjà importé pour cette banque (« ${dup.name} », le ${when}). Import ignoré pour éviter un doublon.`,
          } }));
          return;
        }
      }

      // ─── PDF route: verification modal (split-screen review) ─────────
      if (isPdf && bank) {
        setIsExtracting(true);
        setExtractionProgress({ stage: 'load', pct: 0, message: 'Chargement du PDF…' });
        const result = await extractConditions(file, {
          bankCode: bank.code,
          onProgress: (p) => setExtractionProgress(p),
        });

        if (result.rawPairs.length === 0) {
          setIsExtracting(false);
          setIsUploading(false);
          setExtractionProgress(null);
          alert('Aucune condition n\'a pu être extraite du document. Vérifie le format du PDF.');
          return;
        }

        // Rubriques déjà validées au référentiel → reconnues automatiquement
        // (plus de proposition à refaire pour celles-là).
        const approvedKeys = (await listApprovedRubrics().catch(() => []))
          .map((r) => r.rubricKey);

        const payload = buildConditionsPayload({
          fileName: file.name,
          bankCode: bank.code,
          pairs: result.rawPairs,
          matches: result.matches,
          detectedSegment: result.detectedSegment,
          detectedEffectiveDate: result.detectedEffectiveDate,
          detectedPeriodLabel: result.detectionEvidence?.periodLabel,
          approvedRubricKeys: approvedKeys,
        });

        setVerification({ file, payload, contentHash });
        setIsExtracting(false);
        setIsUploading(false);
        setExtractionProgress(null);
        return;
      }

      // ─── Non-PDF route: legacy engine (Excel, CSV, image) ────────────
      const base64 = await fileToBase64(file);
      setIsExtracting(true);

      const engine = getDocumentEngine();
      const report = await engine.extract(file, {
        bankCode: bank?.code,
        onProgress: (p) => setExtractionProgress(p),
      });
      setExtractionReport(report);

      // Collect extracted values from the report to store on the document
      const legacyValues: Record<string, number | string | boolean | null> = {};
      if (report.success) {
        for (const [key, field] of Object.entries(report.fields)) {
          if (field.value !== null && field.value !== undefined) {
            legacyValues[key] = field.value as number | string | boolean;
          }
        }
      }

      const document: ArchivedDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: 'conditions',
        uploadDate: new Date(),
        effectiveDate: new Date(),
        fileData: base64,
        fileSize: file.size,
        extractedAt: report.success && report.stats.extracted > 0 ? new Date() : undefined,
        extractedValues: Object.keys(legacyValues).length > 0 ? legacyValues : undefined,
        contentHash,
        isActive: true,
      };

      setConditions(prev => ({
        ...prev,
        documents: [...prev.documents, document],
      }));
      setHasChanges(true);

    } catch (error) {
      console.error('Erreur upload:', error);
      alert('Erreur lors de l\'extraction du document. Veuillez réessayer.');
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
      setExtractionProgress(null);
    }
  };

  // Commit handler for the verification modal — apply the validated rubrics
  // into the conditions form and archive the source document.
  const handleVerifiedConditionsCommit = async (
    _args: CommitArgs,
    commit: CommitResult,
  ): Promise<void> => {
    if (!verification) return;
    const { file } = verification;

    // Mark dirty IMMEDIATELY — going through the import flow at all is
    // a user-confirmed intent to mutate the grid. We fire setHasChanges
    // first, then again at the end as a belt-and-braces guarantee.
    setHasChanges(true);

    // Split validated rubrics into two channels:
    //   • registry keys  → typed conditions form (via REGISTRY_TO_FORM_PATH)
    //   • custom keys     → CustomFee[] under the matching tab category,
    //                       DEDUPLICATED so re-importing never creates doubles.
    const values: Record<string, number | string> = {};
    // docCustomFees = ALL custom rubrics from THIS import (deduped within the
    // batch only) → attached to the archived document so they ride into the
    // grid and thus into the anomaly calculation.
    const docCustomFees: CustomFee[] = [];
    // customToAdd = subset not already present at bank level (avoids doubles
    // in the bank-wide customFees list).
    const customToAdd: CustomFee[] = [];
    const batchSigs = new Set<string>();
    const existingCustomSigs = new Set(
      conditions.customFees.map((f) => customFeeSignature(f.category, f.label)),
    );
    if (commit.conditions) {
      for (const [rubricKey, val] of Object.entries(commit.conditions)) {
        if (val.custom) {
          const label = (val.label ?? rubricKey).trim();
          const category = normalizeCategory(val.category);
          const sig = customFeeSignature(category, label);
          if (batchSigs.has(sig)) continue; // dedup within this import
          batchSigs.add(sig);
          const fee: CustomFee = {
            id: uuidv4(),
            label,
            amount: Number.isFinite(val.value) ? val.value : 0,
            type: val.unit === '%' ? 'percent' : 'fixed',
            frequency: 'per_operation',
            category,
          };
          docCustomFees.push(fee);
          if (!existingCustomSigs.has(sig)) customToAdd.push(fee); // dedup vs existing
          continue;
        }
        // Registry rubric → typed form. Skip pure qualitative-zero rows.
        if (val.qualitative && val.value === 0) continue;
        values[rubricKey] = val.value;
      }
    }

    const mappedCount = Object.keys(values).length;
    if (mappedCount > 0) {
      handleApplyExtraction(values); // sets hasChanges(true) too
    }
    if (customToAdd.length > 0) {
      setConditions((prev) => ({
        ...prev,
        customFees: [...prev.customFees, ...customToAdd],
      }));
    }
    const classifiedCount = mappedCount + docCustomFees.length;

    // Archive the source document so it's listed in the Documents tab.
    // Stamp it with the detected segment + effective date so the grid built
    // from it resolves correctly during segment-aware audits.
    const detectedSegment = verification.payload.detectedSegment ?? undefined;
    const detectedEffectiveDate = verification.payload.detectedEffectiveDate
      ? new Date(verification.payload.detectedEffectiveDate)
      : new Date();
    // Lignes VALIDÉES par l'utilisateur (corrections/suppressions comprises) →
    // portées sur le document pour piloter la publication L2 (au lieu d'une
    // ré-extraction aveugle). Seules les lignes validées sont incluses.
    const validatedConditions: ValidatedConditionLine[] = Object.entries(commit.conditions ?? {})
      .map(([rubricKey, c]) => ({
        rubricKey,
        label: c.label ?? rubricKey,
        value: c.value,
        unit: c.unit,
        qualitative: c.qualitative,
        custom: c.custom,
        category: c.category,
      }));

    let archiveError: unknown = null;
    try {
      const base64 = await fileToBase64(file);
      const document: ArchivedDocument = {
        id: `doc-${Date.now()}`,
        name: file.name,
        type: 'conditions',
        uploadDate: new Date(),
        effectiveDate: detectedEffectiveDate,
        fileData: base64,
        fileSize: file.size,
        extractedAt: new Date(),
        extractedValues: mappedCount > 0 ? values : undefined,
        extractedCustomFees: docCustomFees.length > 0 ? docCustomFees : undefined,
        segment: detectedSegment,
        contentHash: verification.contentHash,
        validatedConditions: validatedConditions.length > 0 ? validatedConditions : undefined,
        isActive: true,
      };
      setConditions(prev => ({
        ...prev,
        documents: [...prev.documents, document],
      }));
    } catch (err) {
      archiveError = err;
      console.warn('[BankConditionsModal] failed to archive source document:', err);
    }

    // Belt-and-braces: re-fire setHasChanges(true) AFTER all awaits to
    // guarantee the final state is dirty regardless of React batching.
    setHasChanges(true);

    // Alerte de non-correspondance : le type de client DÉTECTÉ dans le document
    // ne correspond pas à l'onglet d'import courant → on prévient l'admin (et le
    // « Type de client » du document reste corrigeable dans la liste).
    if (detectedSegment && defaultSegment && detectedSegment !== defaultSegment) {
      const lbl = (s: TariffSegment) => (s === 'particuliers' ? 'Particuliers' : s === 'entreprises' ? 'Entreprises' : 'Associations');
      window.dispatchEvent(new CustomEvent('atlas-toast', { detail: {
        type: 'warning',
        message: `Ce document a été détecté comme « ${lbl(detectedSegment)} », mais vous importez dans « ${lbl(defaultSegment)} ». Vérifiez le « Type de client » du document et corrigez-le si besoin avant de publier.`,
      } }));
    }

    // Close the verification modal first — keeps the UI snappy.
    setVerification(null);

    // Defer the alert to the next tick so it doesn't block the React
    // commit phase. Using setTimeout(_, 0) keeps the alert async to React.
    if (classifiedCount === 0 && !archiveError) {
      setTimeout(() => {
        alert(
          'Aucune rubrique n\'a été automatiquement classée — le document a été archivé. '
          + 'Tu peux saisir les valeurs manuellement dans les onglets ci-dessus, '
          + 'puis cliquer sur Enregistrer.'
        );
      }, 0);
    }
    if (archiveError) {
      setTimeout(() => {
        alert('Le document n\'a pas pu être archivé. Détail : ' + (archiveError instanceof Error ? archiveError.message : 'inconnu'));
      }, 0);
    }
  };

  /**
   * Project a document's extracted values onto the form state. Wraps the
   * shared helper so the form re-renders.
   */
  const handleApplyExtraction = (values: Record<string, number | string | boolean | null>) => {
    setConditions(prev => applyExtractedValuesToConditions(prev, values));
    setHasChanges(true);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Supprimer un document
  const removeDocument = (id: string) => {
    setConditions(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id),
    }));
    setHasChanges(true);
  };

  // Composant pour un champ éditable
  const EditableField = ({
    label,
    value,
    onChange,
    type = 'number',
    suffix = '',
    min,
    max,
    step,
  }: {
    label: string;
    value: number | string | boolean;
    onChange: (value: string | number | boolean) => void;
    type?: 'number' | 'percent' | 'text' | 'checkbox';
    suffix?: string;
    min?: number;
    max?: number;
    step?: number;
  }) => {
    if (type === 'checkbox') {
      return (
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-primary-700">{label}</span>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
            className="w-5 h-5 rounded border-primary-300 text-primary-900 focus:ring-primary-500"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between py-2 border-b border-primary-50">
        <span className="text-sm text-primary-700 flex-1">{label}</span>
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value as number}
            onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step || (type === 'percent' ? 0.01 : 1)}
            className="w-28 px-2 py-1 text-right text-sm border border-primary-200 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
          <span className="text-xs text-primary-500 w-12">{suffix || (type === 'percent' ? '%' : currency.code)}</span>
        </div>
      </div>
    );
  };

  // Composant section pliable
  const CollapsibleSection = ({
    title,
    icon,
    children,
    id,
  }: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    id: string;
  }) => {
    const isExpanded = expandedSections[id] !== false; // Par défaut ouvert

    return (
      <div className="border border-primary-200 rounded-lg overflow-hidden mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-3 bg-primary-50 hover:bg-primary-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-primary-900">{title}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-primary-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-primary-500" />
          )}
        </button>
        {isExpanded && (
          <div className="p-4 bg-white">{children}</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Success toast — displayed for 1.5s after save, then modal auto-closes */}
      {showSaveSuccess && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-elevation-3 flex items-center gap-3 animate-fade-in-up">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-semibold">Conditions bancaires importées avec succès</span>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-primary-200 bg-primary-900 text-white rounded-t-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold !text-white">{bank.name}</h2>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {countryName}
                </span>
                <Badge variant={zone === 'CEMAC' ? 'info' : 'success'} className="text-xs">
                  {zone} - {currency.code}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="warning" className="animate-pulse">
                Modifications non sauvegardées
              </Badge>
            )}
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={!hasChanges}
              className="bg-white text-primary-900 hover:bg-primary-100"
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps : sidebar de navigation (verticale) + contenu de la section */}
        <div className="flex-1 flex min-h-0">
          {/* Sidebar — toutes les sections visibles, sans débordement horizontal */}
          <nav className="w-56 shrink-0 overflow-y-auto border-r border-primary-200 bg-primary-50 py-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium border-l-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-900 bg-white text-primary-900'
                    : 'border-transparent text-primary-500 hover:bg-white/60 hover:text-primary-800'
                }`}
              >
                <span className="shrink-0">{tab.icon}</span>
                <span className="truncate text-left">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
          {/* Onglet Compte */}
          {activeTab === 'compte' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="tenue"
                title="Frais de tenue de compte (mensuel)"
                icon={<Building2 className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Particulier résident"
                  value={conditions.tenueCompte.particulierLocal}
                  onChange={(v) => updateValue('tenueCompte.particulierLocal', v)}
                />
                <EditableField
                  label="Particulier non-résident"
                  value={conditions.tenueCompte.particulierEtranger}
                  onChange={(v) => updateValue('tenueCompte.particulierEtranger', v)}
                />
                <EditableField
                  label="Professionnel / Auto-entrepreneur"
                  value={conditions.tenueCompte.professionnel}
                  onChange={(v) => updateValue('tenueCompte.professionnel', v)}
                />
                <EditableField
                  label="Entreprise / Personne morale"
                  value={conditions.tenueCompte.entreprise}
                  onChange={(v) => updateValue('tenueCompte.entreprise', v)}
                />
                <EditableField
                  label="Association / ONG"
                  value={conditions.tenueCompte.association}
                  onChange={(v) => updateValue('tenueCompte.association', v)}
                />
                <EditableField
                  label="Compte épargne"
                  value={conditions.tenueCompte.compteEpargne}
                  onChange={(v) => updateValue('tenueCompte.compteEpargne', v)}
                />
                <EditableField
                  label="Compte devises"
                  value={conditions.tenueCompte.compteDevises}
                  onChange={(v) => updateValue('tenueCompte.compteDevises', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="ouverture"
                title="Ouverture de compte"
                icon={<Plus className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Frais ouverture particulier"
                  value={conditions.ouvertureCompte.particulier}
                  onChange={(v) => updateValue('ouvertureCompte.particulier', v)}
                />
                <EditableField
                  label="Frais ouverture entreprise"
                  value={conditions.ouvertureCompte.entreprise}
                  onChange={(v) => updateValue('ouvertureCompte.entreprise', v)}
                />
                <EditableField
                  label="Dépôt minimum initial"
                  value={conditions.ouvertureCompte.minimumDepot}
                  onChange={(v) => updateValue('ouvertureCompte.minimumDepot', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="cloture"
                title="Clôture de compte"
                icon={<X className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Clôture compte particulier"
                  value={conditions.clotureCompte.particulier}
                  onChange={(v) => updateValue('clotureCompte.particulier', v)}
                />
                <EditableField
                  label="Clôture compte entreprise"
                  value={conditions.clotureCompte.entreprise}
                  onChange={(v) => updateValue('clotureCompte.entreprise', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="releves"
                title="Relevés et attestations"
                icon={<FileText className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Relevé mensuel (papier)"
                  value={conditions.releves.mensuelPapier}
                  onChange={(v) => updateValue('releves.mensuelPapier', v)}
                />
                <EditableField
                  label="Relevé mensuel (email)"
                  value={conditions.releves.mensuelEmail}
                  onChange={(v) => updateValue('releves.mensuelEmail', v)}
                />
                <EditableField
                  label="Duplicata de relevé"
                  value={conditions.releves.duplicata}
                  onChange={(v) => updateValue('releves.duplicata', v)}
                />
                <EditableField
                  label="Relevé annuel"
                  value={conditions.releves.releveAnnuel}
                  onChange={(v) => updateValue('releves.releveAnnuel', v)}
                />
                <EditableField
                  label="Attestation de solde"
                  value={conditions.releves.attestationSolde}
                  onChange={(v) => updateValue('releves.attestationSolde', v)}
                />
                <EditableField
                  label="Certificat de non-engagement"
                  value={conditions.releves.certificatNonEngagement}
                  onChange={(v) => updateValue('releves.certificatNonEngagement', v)}
                />
                <EditableField
                  label="RIB / IBAN"
                  value={conditions.releves.rib}
                  onChange={(v) => updateValue('releves.rib', v)}
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet Guichet */}
          {activeTab === 'guichet' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="especes"
                title="Opérations en espèces"
                icon={<Banknote className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Versement espèces (frais fixes)"
                  value={conditions.guichet.versementEspeces}
                  onChange={(v) => updateValue('guichet.versementEspeces', v)}
                />
                <EditableField
                  label="Versement espèces (commission)"
                  value={conditions.guichet.versementEspecesCommission}
                  onChange={(v) => updateValue('guichet.versementEspecesCommission', v)}
                  type="percent"
                />
                <EditableField
                  label="Retrait espèces (frais fixes)"
                  value={conditions.guichet.retraitEspeces}
                  onChange={(v) => updateValue('guichet.retraitEspeces', v)}
                />
                <EditableField
                  label="Retrait espèces (commission)"
                  value={conditions.guichet.retraitEspecesCommission}
                  onChange={(v) => updateValue('guichet.retraitEspecesCommission', v)}
                  type="percent"
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="change"
                title="Change manuel"
                icon={<Globe className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Frais fixes change"
                  value={conditions.guichet.changeManuel}
                  onChange={(v) => updateValue('guichet.changeManuel', v)}
                />
                <EditableField
                  label="Commission achat devises"
                  value={conditions.guichet.achatDevises}
                  onChange={(v) => updateValue('guichet.achatDevises', v)}
                  type="percent"
                />
                <EditableField
                  label="Commission vente devises"
                  value={conditions.guichet.venteDevises}
                  onChange={(v) => updateValue('guichet.venteDevises', v)}
                  type="percent"
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet Cartes */}
          {activeTab === 'cartes' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-primary-900">Cartes bancaires</h3>
                <Button onClick={addCard} size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une carte
                </Button>
              </div>

              {conditions.cartes.map((card) => (
                <div key={card.id} className="border border-primary-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between p-3 bg-primary-50">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary-600" />
                      <input
                        type="text"
                        value={card.nom}
                        onChange={(e) => updateCard(card.id, 'nom', e.target.value)}
                        className="font-medium text-primary-900 bg-transparent border-none focus:ring-0 p-0"
                      />
                      <Badge variant={card.type === 'credit' ? 'warning' : 'info'}>
                        {card.type === 'credit' ? 'Crédit' : card.type === 'prepaid' ? 'Prépayée' : 'Débit'}
                      </Badge>
                    </div>
                    <button
                      onClick={() => removeCard(card.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-primary-500 mb-1">Réseau</label>
                      <select
                        value={card.reseau}
                        onChange={(e) => updateCard(card.id, 'reseau', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-primary-200 rounded"
                      >
                        <option value="VISA">VISA</option>
                        <option value="MASTERCARD">MASTERCARD</option>
                        <option value="GIMAC">GIMAC</option>
                        <option value="GIM-UEMOA">GIM-UEMOA</option>
                        <option value="AUTRE">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-primary-500 mb-1">Type</label>
                      <select
                        value={card.type}
                        onChange={(e) => updateCard(card.id, 'type', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-primary-200 rounded"
                      >
                        <option value="debit">Débit</option>
                        <option value="credit">Crédit</option>
                        <option value="prepaid">Prépayée</option>
                      </select>
                    </div>
                    <EditableField
                      label="Cotisation annuelle"
                      value={card.cotisationAnnuelle}
                      onChange={(v) => updateCard(card.id, 'cotisationAnnuelle', v as string | number)}
                    />
                    <EditableField
                      label="Frais d'émission"
                      value={card.fraisEmission}
                      onChange={(v) => updateCard(card.id, 'fraisEmission', v as string | number)}
                    />
                    <EditableField
                      label="Plafond retrait/jour"
                      value={card.plafondRetraitJour}
                      onChange={(v) => updateCard(card.id, 'plafondRetraitJour', v as string | number)}
                    />
                    <EditableField
                      label="Plafond paiement/jour"
                      value={card.plafondPaiementJour}
                      onChange={(v) => updateCard(card.id, 'plafondPaiementJour', v as string | number)}
                    />
                    <EditableField
                      label="Validité (années)"
                      value={card.validiteAnnees}
                      onChange={(v) => updateCard(card.id, 'validiteAnnees', v as string | number)}
                      suffix="ans"
                    />
                  </div>
                </div>
              ))}

              <CollapsibleSection
                id="fraisCartes"
                title="Frais liés aux cartes"
                icon={<Receipt className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Retrait DAB propre réseau"
                  value={conditions.fraisCartes.retraitDabPropre}
                  onChange={(v) => updateValue('fraisCartes.retraitDabPropre', v)}
                />
                <EditableField
                  label="Retrait DAB autre banque"
                  value={conditions.fraisCartes.retraitDabAutre}
                  onChange={(v) => updateValue('fraisCartes.retraitDabAutre', v)}
                />
                <EditableField
                  label="Retrait DAB international"
                  value={conditions.fraisCartes.retraitDabInternational}
                  onChange={(v) => updateValue('fraisCartes.retraitDabInternational', v)}
                />
                <EditableField
                  label="Paiement TPE propre réseau"
                  value={conditions.fraisCartes.paiementTpePropre}
                  onChange={(v) => updateValue('fraisCartes.paiementTpePropre', v)}
                />
                <EditableField
                  label="Paiement TPE autre banque"
                  value={conditions.fraisCartes.paiementTpeAutre}
                  onChange={(v) => updateValue('fraisCartes.paiementTpeAutre', v)}
                />
                <EditableField
                  label="Paiement TPE international"
                  value={conditions.fraisCartes.paiementTpeInternational}
                  onChange={(v) => updateValue('fraisCartes.paiementTpeInternational', v)}
                  type="percent"
                />
                <EditableField
                  label="Paiement internet"
                  value={conditions.fraisCartes.paiementInternet}
                  onChange={(v) => updateValue('fraisCartes.paiementInternet', v)}
                  type="percent"
                />
                <EditableField
                  label="Opposition sur carte"
                  value={conditions.fraisCartes.oppositionCarte}
                  onChange={(v) => updateValue('fraisCartes.oppositionCarte', v)}
                />
                <EditableField
                  label="Renouvellement anticipé"
                  value={conditions.fraisCartes.renouvellementAnticipe}
                  onChange={(v) => updateValue('fraisCartes.renouvellementAnticipe', v)}
                />
                <EditableField
                  label="Code PIN oublié"
                  value={conditions.fraisCartes.codeOublie}
                  onChange={(v) => updateValue('fraisCartes.codeOublie', v)}
                />
                <EditableField
                  label="Carte capturée"
                  value={conditions.fraisCartes.carteCaptee}
                  onChange={(v) => updateValue('fraisCartes.carteCaptee', v)}
                />
                <EditableField
                  label="Consultation solde DAB"
                  value={conditions.fraisCartes.consultationSolde}
                  onChange={(v) => updateValue('fraisCartes.consultationSolde', v)}
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet Virements */}
          {activeTab === 'virements' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="virInternes"
                title="Virements internes"
                icon={<ArrowLeftRight className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Virement interne gratuit"
                  value={conditions.virements.interneGratuit}
                  onChange={(v) => updateValue('virements.interneGratuit', v)}
                  type="checkbox"
                />
                {!conditions.virements.interneGratuit && (
                  <EditableField
                    label="Frais virement interne"
                    value={conditions.virements.interneFrais}
                    onChange={(v) => updateValue('virements.interneFrais', v)}
                  />
                )}
              </CollapsibleSection>

              <CollapsibleSection
                id="virNationaux"
                title="Virements nationaux"
                icon={<Building className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Même banque (agence différente)"
                  value={conditions.virements.nationalMemeBank}
                  onChange={(v) => updateValue('virements.nationalMemeBank', v)}
                />
                <EditableField
                  label="Autre banque (frais fixes)"
                  value={conditions.virements.nationalAutreBank}
                  onChange={(v) => updateValue('virements.nationalAutreBank', v)}
                />
                <EditableField
                  label="Autre banque (commission)"
                  value={conditions.virements.nationalAutreBankCommission}
                  onChange={(v) => updateValue('virements.nationalAutreBankCommission', v)}
                  type="percent"
                />
                <EditableField
                  label="Virement instantané"
                  value={conditions.virements.instantane}
                  onChange={(v) => updateValue('virements.instantane', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="virZone"
                title={`Virements zone ${zone || 'CEMAC/UEMOA'}`}
                icon={<Globe className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Frais fixes"
                  value={conditions.virements.zoneMonetaire}
                  onChange={(v) => updateValue('virements.zoneMonetaire', v)}
                />
                <EditableField
                  label="Commission"
                  value={conditions.virements.zoneMonetaireCommission}
                  onChange={(v) => updateValue('virements.zoneMonetaireCommission', v)}
                  type="percent"
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="virInternational"
                title="Virements internationaux"
                icon={<Globe className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Frais fixes"
                  value={conditions.virements.international}
                  onChange={(v) => updateValue('virements.international', v)}
                />
                <EditableField
                  label="Commission"
                  value={conditions.virements.internationalCommission}
                  onChange={(v) => updateValue('virements.internationalCommission', v)}
                  type="percent"
                />
                <EditableField
                  label="Frais SWIFT"
                  value={conditions.virements.swift}
                  onChange={(v) => updateValue('virements.swift', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="virAutres"
                title="Autres virements"
                icon={<Settings className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Ordre permanent"
                  value={conditions.virements.permanent}
                  onChange={(v) => updateValue('virements.permanent', v)}
                />
                <EditableField
                  label="Rejet de virement"
                  value={conditions.virements.rejetVirement}
                  onChange={(v) => updateValue('virements.rejetVirement', v)}
                />
                <EditableField
                  label="Virement reçu"
                  value={conditions.virements.recuVirement}
                  onChange={(v) => updateValue('virements.recuVirement', v)}
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet Chèques */}
          {activeTab === 'cheques' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="carnets"
                title="Carnets de chèques"
                icon={<FileText className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Carnet 25 feuilles"
                  value={conditions.cheques.carnet25}
                  onChange={(v) => updateValue('cheques.carnet25', v)}
                />
                <EditableField
                  label="Carnet 50 feuilles"
                  value={conditions.cheques.carnet50}
                  onChange={(v) => updateValue('cheques.carnet50', v)}
                />
                <EditableField
                  label="Carnet 100 feuilles"
                  value={conditions.cheques.carnet100}
                  onChange={(v) => updateValue('cheques.carnet100', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="typesCheques"
                title="Types de chèques"
                icon={<Receipt className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Chèque de guichet"
                  value={conditions.cheques.chequeGuichet}
                  onChange={(v) => updateValue('cheques.chequeGuichet', v)}
                />
                <EditableField
                  label="Chèque certifié"
                  value={conditions.cheques.chequeCertifie}
                  onChange={(v) => updateValue('cheques.chequeCertifie', v)}
                />
                <EditableField
                  label="Chèque de banque"
                  value={conditions.cheques.chequeBanque}
                  onChange={(v) => updateValue('cheques.chequeBanque', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="incidentsCheques"
                title="Incidents sur chèques"
                icon={<AlertTriangle className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Opposition sur chèque"
                  value={conditions.cheques.oppositionCheque}
                  onChange={(v) => updateValue('cheques.oppositionCheque', v)}
                />
                <EditableField
                  label="Chèque impayé émis"
                  value={conditions.cheques.chequeImpaye}
                  onChange={(v) => updateValue('cheques.chequeImpaye', v)}
                />
                <EditableField
                  label="Chèque retourné"
                  value={conditions.cheques.chequeRetourne}
                  onChange={(v) => updateValue('cheques.chequeRetourne', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="encaissement"
                title="Encaissement de chèques"
                icon={<Wallet className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Encaissement sur place"
                  value={conditions.cheques.encaissementPlace}
                  onChange={(v) => updateValue('cheques.encaissementPlace', v)}
                />
                <EditableField
                  label="Encaissement déplacé"
                  value={conditions.cheques.encaissementDeplacement}
                  onChange={(v) => updateValue('cheques.encaissementDeplacement', v)}
                />
                <EditableField
                  label="Encaissement étranger (frais)"
                  value={conditions.cheques.encaissementEtranger}
                  onChange={(v) => updateValue('cheques.encaissementEtranger', v)}
                />
                <EditableField
                  label="Encaissement étranger (commission)"
                  value={conditions.cheques.encaissementEtrangerCommission}
                  onChange={(v) => updateValue('cheques.encaissementEtrangerCommission', v)}
                  type="percent"
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet Crédits */}
          {activeTab === 'credits' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="decouvert"
                title="Découverts"
                icon={<AlertTriangle className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Taux découvert autorisé (TEG)"
                  value={conditions.credits.decouvertAutorise}
                  onChange={(v) => updateValue('credits.decouvertAutorise', v)}
                  type="percent"
                />
                <EditableField
                  label="Taux découvert non autorisé"
                  value={conditions.credits.decouvertNonAutorise}
                  onChange={(v) => updateValue('credits.decouvertNonAutorise', v)}
                  type="percent"
                />
                <EditableField
                  label="Commission de mouvement"
                  value={conditions.credits.commissionMouvement}
                  onChange={(v) => updateValue('credits.commissionMouvement', v)}
                  type="percent"
                />
                <EditableField
                  label="Commission plus forte découverte"
                  value={conditions.credits.commissionPlusForte}
                  onChange={(v) => updateValue('credits.commissionPlusForte', v)}
                  type="percent"
                />
                <EditableField
                  label="Taux d'usure légal"
                  value={conditions.credits.tauxUsure}
                  onChange={(v) => updateValue('credits.tauxUsure', v)}
                  type="percent"
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="credits"
                title="Crédits"
                icon={<Percent className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Frais de dossier crédit"
                  value={conditions.credits.fraisDossierCredit}
                  onChange={(v) => updateValue('credits.fraisDossierCredit', v)}
                  type="percent"
                />
                <EditableField
                  label="Crédit conso - taux min"
                  value={conditions.credits.creditConsommationMin}
                  onChange={(v) => updateValue('credits.creditConsommationMin', v)}
                  type="percent"
                />
                <EditableField
                  label="Crédit conso - taux max"
                  value={conditions.credits.creditConsommationMax}
                  onChange={(v) => updateValue('credits.creditConsommationMax', v)}
                  type="percent"
                />
                <EditableField
                  label="Crédit immobilier - taux min"
                  value={conditions.credits.creditImmobilierMin}
                  onChange={(v) => updateValue('credits.creditImmobilierMin', v)}
                  type="percent"
                />
                <EditableField
                  label="Crédit immobilier - taux max"
                  value={conditions.credits.creditImmobilierMax}
                  onChange={(v) => updateValue('credits.creditImmobilierMax', v)}
                  type="percent"
                />
                <EditableField
                  label="Crédit PME/TPE"
                  value={conditions.credits.creditPME}
                  onChange={(v) => updateValue('credits.creditPME', v)}
                  type="percent"
                />
                <EditableField
                  label="Pénalité de retard"
                  value={conditions.credits.penaliteRetard}
                  onChange={(v) => updateValue('credits.penaliteRetard', v)}
                  type="percent"
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet E-Banking */}
          {activeTab === 'ebanking' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="abonnement"
                title="Abonnements"
                icon={<Smartphone className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Abonnement mensuel"
                  value={conditions.ebanking.abonnementMensuel}
                  onChange={(v) => updateValue('ebanking.abonnementMensuel', v)}
                />
                <EditableField
                  label="Abonnement annuel"
                  value={conditions.ebanking.abonnementAnnuel}
                  onChange={(v) => updateValue('ebanking.abonnementAnnuel', v)}
                />
                <EditableField
                  label="Consultation gratuite"
                  value={conditions.ebanking.consultationGratuite}
                  onChange={(v) => updateValue('ebanking.consultationGratuite', v)}
                  type="checkbox"
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="operations"
                title="Opérations en ligne"
                icon={<Globe className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Par opération"
                  value={conditions.ebanking.parOperation}
                  onChange={(v) => updateValue('ebanking.parOperation', v)}
                />
                <EditableField
                  label="Virement en ligne"
                  value={conditions.ebanking.virementEnLigne}
                  onChange={(v) => updateValue('ebanking.virementEnLigne', v)}
                />
                <EditableField
                  label="Mobile Banking"
                  value={conditions.ebanking.mobileBanking}
                  onChange={(v) => updateValue('ebanking.mobileBanking', v)}
                />
                <EditableField
                  label="USSD"
                  value={conditions.ebanking.ussd}
                  onChange={(v) => updateValue('ebanking.ussd', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="alertes"
                title="Alertes SMS"
                icon={<Phone className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Par SMS"
                  value={conditions.ebanking.smsAlerte}
                  onChange={(v) => updateValue('ebanking.smsAlerte', v)}
                />
                <EditableField
                  label="Abonnement SMS (mensuel)"
                  value={conditions.ebanking.smsAlerteAbonnement}
                  onChange={(v) => updateValue('ebanking.smsAlerteAbonnement', v)}
                />
              </CollapsibleSection>
            </div>
          )}

          {/* Onglet Divers */}
          {activeTab === 'divers' && (
            <div className="max-w-4xl mx-auto space-y-4">
              <CollapsibleSection
                id="coffres"
                title="Location de coffres"
                icon={<Lock className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Coffre petit (annuel)"
                  value={conditions.divers.coffrePetit}
                  onChange={(v) => updateValue('divers.coffrePetit', v)}
                />
                <EditableField
                  label="Coffre moyen (annuel)"
                  value={conditions.divers.coffreMoyen}
                  onChange={(v) => updateValue('divers.coffreMoyen', v)}
                />
                <EditableField
                  label="Coffre grand (annuel)"
                  value={conditions.divers.coffreGrand}
                  onChange={(v) => updateValue('divers.coffreGrand', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="garanties"
                title="Garanties et cautions"
                icon={<Shield className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Assurance compte"
                  value={conditions.divers.assuranceCompte}
                  onChange={(v) => updateValue('divers.assuranceCompte', v)}
                />
                <EditableField
                  label="Garantie bancaire (commission)"
                  value={conditions.divers.garantieBancaire}
                  onChange={(v) => updateValue('divers.garantieBancaire', v)}
                  type="percent"
                />
                <EditableField
                  label="Garantie locative"
                  value={conditions.divers.garantieLocative}
                  onChange={(v) => updateValue('divers.garantieLocative', v)}
                />
                <EditableField
                  label="Caution marché (commission)"
                  value={conditions.divers.cautionMarche}
                  onChange={(v) => updateValue('divers.cautionMarche', v)}
                  type="percent"
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="incidents"
                title="Incidents et contentieux"
                icon={<AlertTriangle className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Lettre d'injonction"
                  value={conditions.divers.lettreInjonction}
                  onChange={(v) => updateValue('divers.lettreInjonction', v)}
                />
                <EditableField
                  label="Saisie attribution"
                  value={conditions.divers.saisieAttribution}
                  onChange={(v) => updateValue('divers.saisieAttribution', v)}
                />
                <EditableField
                  label="Mainlevée"
                  value={conditions.divers.mainLevee}
                  onChange={(v) => updateValue('divers.mainLevee', v)}
                />
                <EditableField
                  label="Frais d'inactivité"
                  value={conditions.divers.fraisInactivite}
                  onChange={(v) => updateValue('divers.fraisInactivite', v)}
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="succession"
                title="Succession et procurations"
                icon={<Users className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Procuration"
                  value={conditions.divers.procuration}
                  onChange={(v) => updateValue('divers.procuration', v)}
                />
                <EditableField
                  label="Succession (frais fixes)"
                  value={conditions.divers.successionFrais}
                  onChange={(v) => updateValue('divers.successionFrais', v)}
                />
                <EditableField
                  label="Succession (commission)"
                  value={conditions.divers.successionCommission}
                  onChange={(v) => updateValue('divers.successionCommission', v)}
                  type="percent"
                />
              </CollapsibleSection>

              <CollapsibleSection
                id="taxes"
                title="Taxes et timbres"
                icon={<Receipt className="w-5 h-5 text-primary-600" />}
              >
                <EditableField
                  label="Droit de timbre"
                  value={conditions.divers.droitTimbre}
                  onChange={(v) => updateValue('divers.droitTimbre', v)}
                />
                <EditableField
                  label="TVA sur services"
                  value={conditions.divers.tvaServices}
                  onChange={(v) => updateValue('divers.tvaServices', v)}
                  type="percent"
                />
              </CollapsibleSection>

              {/* Frais personnalisés */}
              <div className="border border-primary-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-primary-50">
                  <div className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary-600" />
                    <span className="font-medium text-primary-900">Frais personnalisés</span>
                  </div>
                  <Button onClick={addCustomFee} size="sm" variant="secondary">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </div>
                {conditions.customFees.filter(f => f.category === activeTab).length > 0 && (
                  <div className="p-4 space-y-2">
                    {conditions.customFees
                      .filter(f => f.category === activeTab)
                      .map(fee => (
                        <div key={fee.id} className="flex items-center gap-2 p-2 bg-primary-50 rounded">
                          <input
                            type="text"
                            value={fee.label}
                            onChange={(e) => {
                              setConditions(prev => ({
                                ...prev,
                                customFees: prev.customFees.map(f =>
                                  f.id === fee.id ? { ...f, label: e.target.value } : f
                                ),
                              }));
                              setHasChanges(true);
                            }}
                            className="flex-1 px-2 py-1 text-sm border border-primary-200 rounded"
                            placeholder="Libellé"
                          />
                          <input
                            type="number"
                            value={fee.amount}
                            onChange={(e) => {
                              setConditions(prev => ({
                                ...prev,
                                customFees: prev.customFees.map(f =>
                                  f.id === fee.id ? { ...f, amount: Number(e.target.value) } : f
                                ),
                              }));
                              setHasChanges(true);
                            }}
                            className="w-24 px-2 py-1 text-sm border border-primary-200 rounded text-right"
                          />
                          <span className="text-xs text-primary-500">{currency.code}</span>
                          <button
                            onClick={() => removeCustomFee(fee.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Onglet Documents */}
          {activeTab === 'documents' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Zone d'upload */}
              <div
                onClick={() => !isUploading && !isExtracting && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isUploading || isExtracting
                    ? 'border-primary-400 bg-primary-50 cursor-wait'
                    : 'border-primary-300 hover:border-primary-400 hover:bg-primary-50'
                }`}
              >
                {isUploading || isExtracting ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                    <p className="text-primary-700 font-medium">
                      {isExtracting ? 'Extraction des données...' : 'Téléchargement...'}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-primary-900">
                      Importer un document de conditions tarifaires
                    </p>
                    <p className="text-sm text-primary-500 mt-2">
                      PDF · Excel · Image — extraction automatique multi-format
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tiff,.bmp,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Progress en cours d'extraction */}
              {isExtracting && extractionProgress && (
                <div className="rounded-lg p-4 bg-canvas-50 border border-primary-200/60 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-accent-600 animate-spin shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-ink-900 truncate">
                        {extractionProgress.message}
                      </p>
                      <p className="text-xs text-ink-500 tabular-nums shrink-0 ml-2">
                        {Math.round(extractionProgress.pct * 100)}%
                      </p>
                    </div>
                    <div className="h-1.5 bg-canvas-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-ink-700 to-accent-500 transition-all duration-300 ease-premium"
                        style={{ width: `${Math.round(extractionProgress.pct * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Rapport d'extraction premium */}
              {extractionReport && !isExtracting && (
                <ExtractionReportPanel
                  report={extractionReport}
                  onApply={handleApplyExtraction}
                />
              )}

              {/* Liste des documents avec sélection "en vigueur" */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-semibold text-primary-900">Documents archivés</h3>
                  {conditions.documents.length > 0 && (
                    <span className="text-[11px] text-primary-500">
                      {conditions.documents.filter((d) => d.isActive).length} en vigueur / {conditions.documents.length}
                    </span>
                  )}
                </div>
                <div className="mb-4 p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900">
                    Cliquez sur <strong>« Appliquer »</strong> pour qu'un document soit pris en compte par l'audit.
                    Plusieurs documents peuvent être actifs simultanément — chacun fournit la grille tarifaire
                    pour les transactions tombant dans sa période « En vigueur du / au ». L'audit choisit la bonne
                    grille pour chaque transaction. Le formulaire affiche les valeurs du dernier document appliqué.
                  </p>
                </div>
                {/* Publication au référentiel L2 (mutualisé) — indispensable pour
                    que l'audit express + les audits partagés comparent au tarif. */}
                {isAdmin && conditions.documents.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50/70 flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-emerald-900">
                        <strong>« Appliquer » alimente la grille locale de ce client.</strong> Pour que ce barème serve à
                        l'<strong>audit mutualisé</strong> (audit express + audits partagés), il faut le <strong>publier au
                        référentiel L2</strong> — c'est ce référentiel que l'audit compare au tarif officiel.
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('validation')}
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Publier au référentiel →
                    </button>
                  </div>
                )}
                {conditions.documents.length === 0 ? (
                  <div className="text-center py-8 text-primary-500">
                    <FileUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucun document archivé</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {conditions.documents.map(doc => {
                      const hasValues = doc.extractedValues && Object.keys(doc.extractedValues).length > 0;
                      const toInputDate = (d: Date | string | undefined) => {
                        if (!d) return '';
                        const dt = new Date(d);
                        if (isNaN(dt.getTime())) return '';
                        return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
                      };
                      const updateDocDate = (field: 'effectiveDate' | 'expirationDate', value: string) => {
                        // effectiveDate is required — ignore empty values to prevent undefined
                        if (field === 'effectiveDate' && !value) return;
                        setConditions(prev => ({
                          ...prev,
                          documents: prev.documents.map(d =>
                            d.id === doc.id
                              ? { ...d, [field]: value ? new Date(value + 'T00:00:00Z') : undefined }
                              : d,
                          ),
                        }));
                        setHasChanges(true);
                      };
                      const isFocused = doc.id === focusDocumentId;
                      return (
                        <div
                          key={doc.id}
                          ref={(el) => { docCardRefs.current[doc.id] = el; }}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            isFocused
                              ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-300'
                              : doc.isActive
                                ? 'bg-emerald-50 border-emerald-400 shadow-sm'
                                : 'bg-white border-primary-200 hover:border-primary-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className={`w-6 h-6 shrink-0 ${doc.isActive ? 'text-emerald-600' : 'text-primary-500'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-primary-900 truncate" title={doc.name}>{doc.name}</p>
                              <p className="text-xs text-primary-500">
                                {(() => {
                                  const d = new Date(doc.uploadDate);
                                  return isNaN(d.getTime())
                                    ? '—'
                                    : `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
                                })()}
                                {' • '}{(doc.fileSize / 1024).toFixed(0)} Ko
                                {doc.extractedAt && ` • ${hasValues ? Object.keys(doc.extractedValues!).length + ' champs extraits' : 'Données extraites'}`}
                              </p>
                              {/* Type de client du document — VISIBLE et CORRIGEABLE.
                                  Évite d'importer un relevé/barème entreprise dans les
                                  particuliers sans s'en rendre compte. */}
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] uppercase tracking-wide text-primary-400">Type de client</span>
                                <select
                                  value={doc.segment ?? ''}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const seg = (e.target.value || undefined) as TariffSegment | undefined;
                                    setConditions((prev) => ({
                                      ...prev,
                                      documents: prev.documents.map((d) => (d.id === doc.id ? { ...d, segment: seg } : d)),
                                    }));
                                    setHasChanges(true);
                                  }}
                                  className="rounded border border-primary-300 bg-white px-1.5 py-0.5 text-[11px] font-medium text-primary-800"
                                >
                                  <option value="">Non précisé</option>
                                  <option value="particuliers">Particuliers</option>
                                  <option value="entreprises">Entreprises</option>
                                  <option value="associations">Associations</option>
                                </select>
                                {defaultSegment && doc.segment && doc.segment !== defaultSegment && (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                    <AlertTriangle className="h-3 w-3" /> diffère de l'onglet {defaultSegment === 'particuliers' ? 'Particuliers' : defaultSegment === 'entreprises' ? 'Entreprises' : 'Associations'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Toggle « Appliquer » / « ✓ En vigueur » indépendant
                                par document. Plusieurs documents peuvent être
                                actifs simultanément — au save, chaque doc actif
                                avec extractedValues devient une ConditionGrid
                                avec ses propres dates « En vigueur du / au »,
                                pour que le resolver split-by-grid de l'audit
                                puisse appliquer la bonne grille tarifaire à
                                chaque transaction selon sa date. */}
                            <button
                              type="button"
                              onClick={() => {
                                const willActivate = !doc.isActive;
                                setConditions(prev => ({
                                  ...prev,
                                  documents: prev.documents.map(d =>
                                    d.id === doc.id ? { ...d, isActive: willActivate } : d,
                                  ),
                                }));
                                if (willActivate && doc.extractedValues && Object.keys(doc.extractedValues).length > 0) {
                                  handleApplyExtraction(doc.extractedValues as Record<string, number | string | boolean | null>);
                                }
                                setHasChanges(true);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                                doc.isActive
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-primary-100 text-primary-700 hover:bg-accent-100 hover:text-accent-800 border border-primary-300'
                              }`}
                              aria-pressed={doc.isActive}
                              title={doc.isActive ? 'Conditions en vigueur — cliquer pour désactiver' : 'Appliquer ces conditions'}
                            >
                              {doc.isActive ? (
                                <>
                                  <span aria-hidden="true">✓</span>
                                  En vigueur
                                </>
                              ) : (
                                'Appliquer'
                              )}
                            </button>
                            <a
                              href={doc.fileData}
                              download={doc.name}
                              className="p-2 text-primary-600 hover:bg-primary-100 rounded"
                              title="Télécharger"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => removeDocument(doc.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          </div>
                          {/* Période de validité */}
                          <div className="mt-2 pt-2 border-t border-primary-100 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-medium text-primary-600 whitespace-nowrap">
                                En vigueur du
                              </label>
                              <input
                                type="date"
                                value={toInputDate(doc.effectiveDate)}
                                onChange={(e) => updateDocDate('effectiveDate', e.target.value)}
                                className="text-xs border border-primary-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-accent-400 focus:border-accent-400"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-[11px] font-medium text-primary-600 whitespace-nowrap">
                                au
                              </label>
                              <input
                                type="date"
                                value={toInputDate(doc.expirationDate)}
                                onChange={(e) => updateDocDate('expirationDate', e.target.value)}
                                className="text-xs border border-primary-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-accent-400 focus:border-accent-400"
                                placeholder="Indéterminée"
                              />
                            </div>
                            {!doc.expirationDate && (
                              <span className="text-[10px] text-amber-600 italic">
                                Pas de date de fin — valable indéfiniment
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Onglet Validation IA — split-screen PDF↔champ via SplitScreenValidator */}
          {/* Mutualisé (L2) → admins Atlas Studio uniquement. */}
          {activeTab === 'validation' && isAdmin && (
            <ValidationTabContent
              bank={bank}
              archivedDocuments={conditions.documents}
              onGoToDocuments={() => setActiveTab('documents')}
              defaultSegment={
                defaultSegment === 'particuliers' ? 'particulier'
                  : defaultSegment === 'entreprises' ? 'corporate'
                  : undefined
              }
            />
          )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-primary-200 bg-primary-50 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-primary-500">
              Dernière modification: {(() => {
                if (!bank.updatedAt) return 'N/A';
                const d = new Date(bank.updatedAt);
                return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('fr-FR');
              })()}
            </p>
            {/* Visual diagnostic — surfaces why the Save button is in its
                current state. Tells the user "you have N pending changes"
                or "no pending changes" so the disabled state is never
                a mystery. */}
            <p className="text-[11px] text-primary-400 font-mono">
              {(() => {
                const current = serializeForDiff(conditions);
                const baselineLen = baseline.length;
                const currentLen = current.length;
                const diff = baselineLen === 0
                  ? 'État initial — aucun changement à sauvegarder'
                  : currentLen === baselineLen && current === baseline
                    ? 'Aucune modification depuis le dernier chargement'
                    : `Changements détectés : ${Math.abs(currentLen - baselineLen)} octets de diff`;
                return `${hasChanges ? '⬤' : '○'} ${diff}`;
              })()}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer les modifications
            </Button>
          </div>
        </div>
      </div>

      {/* Conditions verification modal — opens after PDF extraction in the
          Documents tab so the user can review pairs before applying them */}
      {verification && (
        <ImportVerificationModal
          open
          file={verification.file}
          initialPayload={verification.payload}
          onCommit={handleVerifiedConditionsCommit}
          onCancel={() => setVerification(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// DIFF-BASED DIRTY FLAG HELPER
// ============================================================================
// Stable JSON serialization of the conditions blob, used to compare current
// state against the baseline snapshot. Document `fileData` (base64 PDF) is
// excluded — its presence doesn't matter for dirtiness, only the doc list.
function serializeForDiff(c: FullBankConditions): string {
  const stripped = {
    ...c,
    documents: c.documents.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      fileSize: d.fileSize,
      // Date objects don't survive JSON identity — convert to ISO
      uploadDate: d.uploadDate ? new Date(d.uploadDate).toISOString() : null,
      effectiveDate: d.effectiveDate ? new Date(d.effectiveDate).toISOString() : null,
      extractedAt: d.extractedAt ? new Date(d.extractedAt).toISOString() : null,
      isActive: d.isActive,
      // Note: fileData (base64) intentionally omitted — not relevant for diff
    })),
  };
  try {
    return JSON.stringify(stripped, (_key, value) => {
      if (value instanceof Date) return value.toISOString();
      return value;
    });
  } catch {
    return '';
  }
}
