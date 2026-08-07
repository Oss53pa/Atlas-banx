// ============================================================================
// ValidationTabContent — onglet Validation IA dans BankConditionsModal
// ============================================================================
// Wrap le SplitScreenValidator (CDC §7.2) :
//   - panneau gauche : PDF du dernier document archivé
//   - panneau droit : champs extraits par le vrai extracteur de conditions
//   - sélection bidirectionnelle bbox ↔ champ
//   - validation finale → publication d'une nouvelle version L2
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { FileX, Sparkles, CheckCircle2, AlertTriangle, Loader2, FileUp } from 'lucide-react';
import type { Bank, ArchivedDocument } from '../../types';
import { SplitScreenValidator, type ExtractedField } from '../../cdc/components/SplitScreenValidator';
import { submitValidatedReference } from '../../cdc/services/submitValidatedReference';
import { extractConditions } from '../../extraction/conditions';
import { extractionResultToFields, validatedConditionsToFields } from './extractionToFields';

type ExtractionState =
  | { status: 'idle' }
  | { status: 'extracting' }
  | { status: 'done'; count: number; warnings: string[] }
  | { status: 'error'; message: string };

/**
 * Charge le PDF (data-URL ou URL distante) et le convertit en `File`,
 * format attendu par `extractConditions`.
 */
async function fetchPdfAsFile(pdfUrl: string, name: string): Promise<File> {
  const res = await fetch(pdfUrl);
  const blob = await res.blob();
  return new File([blob], name || 'document.pdf', {
    type: blob.type || 'application/pdf',
  });
}

// Zone monétaire déduite du pays — nécessaire pour l'auto-création de la
// banque dans le référentiel CDC (cdc_banks) si son code n'y existe pas encore.
function resolveZone(bank: Bank): 'UEMOA' | 'CEMAC' {
  if (bank.zone === 'UEMOA' || bank.zone === 'CEMAC') return bank.zone;
  const uemoa = ['BJ', 'BF', 'CI', 'GW', 'ML', 'NE', 'SN', 'TG'];
  return uemoa.includes(bank.country) ? 'UEMOA' : 'CEMAC';
}

// Segment tarifaire du référentiel L2 mutualisé (taxonomie CDC). Distingue
// l'import des conditions particuliers / PME / entreprises demandé côté admin.
type Segment = '' | 'particulier' | 'pme' | 'corporate';
const SEGMENTS: { value: Segment; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'particulier', label: 'Particuliers' },
  { value: 'pme', label: 'PME' },
  { value: 'corporate', label: 'Entreprises' },
];

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; conditionsCount: number; published: boolean }
  | { status: 'error'; message: string };

interface ValidationTabContentProps {
  bank: Bank;
  archivedDocuments: ArchivedDocument[];
  /** Segment L2 pré-sélectionné (onglet d'import admin Particuliers/Entreprises). */
  defaultSegment?: Segment;
  /** Bascule vers l'onglet « Documents » (pour importer un document source). */
  onGoToDocuments?: () => void;
}

export function ValidationTabContent({ bank, archivedDocuments, defaultSegment, onGoToDocuments }: ValidationTabContentProps) {
  // On prend le document le plus récent qui a un PDF
  const document = useMemo(() => {
    const sorted = [...archivedDocuments]
      .filter((d) => Boolean(d.fileData))
      .sort((a, b) => {
        const da = new Date(a.uploadDate ?? 0).getTime();
        const db = new Date(b.uploadDate ?? 0).getTime();
        return db - da;
      });
    return sorted[0] ?? null;
  }, [archivedDocuments]);

  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [activeFieldId, setActiveFieldId] = useState<string | undefined>();
  const [segment, setSegment] = useState<Segment>(defaultSegment ?? '');
  // Auto-validation (phase de démarrage) : publie directement sans second
  // validateur. Cochée par défaut tant qu'Atlas Studio n'a qu'un administrateur
  // — décocher quand un second admin existe pour revenir au workflow deux yeux.
  const [autoPublish, setAutoPublish] = useState(true);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [extractionState, setExtractionState] = useState<ExtractionState>({ status: 'idle' });

  const pdfUrl = document?.fileData ?? '';
  const fromValidated = Boolean(document?.validatedConditions?.length);

  // Source des champs :
  //   1) PRIORITÉ aux lignes VALIDÉES par l'utilisateur à l'import (corrections
  //      et suppressions comprises) → on publie exactement ce qu'il a validé ;
  //   2) sinon, ré-extraction du document (documents importés avant cette
  //      fonctionnalité, ou saisie hors écran de vérification).
  useEffect(() => {
    if (!document || !pdfUrl) {
      setFields([]);
      setExtractionState({ status: 'idle' });
      return;
    }

    // 1) Lignes validées présentes → on les utilise telles quelles.
    if (document.validatedConditions && document.validatedConditions.length > 0) {
      const mapped = validatedConditionsToFields(document.validatedConditions);
      setFields(mapped);
      setExtractionState({ status: 'done', count: mapped.length, warnings: [] });
      return;
    }

    // 2) Repli : ré-extraction du PDF.
    let cancelled = false;
    setExtractionState({ status: 'extracting' });
    (async () => {
      try {
        const file = await fetchPdfAsFile(pdfUrl, document.name);
        const result = await extractConditions(file, { bankCode: bank.code });
        if (cancelled) return;
        const mapped = extractionResultToFields(result);
        setFields(mapped);
        setExtractionState({
          status: 'done',
          count: mapped.length,
          warnings: result.warnings ?? [],
        });
      } catch (err) {
        if (cancelled) return;
        // Fallback gracieux : liste vide + notice non bloquante, jamais de crash.
        setFields([]);
        setExtractionState({
          status: 'error',
          message: err instanceof Error ? err.message : "Échec de l'extraction.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [document, pdfUrl, bank.code]);

  if (!document) {
    return (
      <div className="flex items-center justify-center py-16 px-6 text-center">
        <div className="max-w-md">
          <FileX className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink-900">Aucun document à valider</h3>
          <p className="text-sm text-ink-500 mt-2">
            Pour publier un barème au référentiel, importez d'abord le document
            source (CG bancaires, convention) de <span className="font-medium text-ink-700">{bank.name}</span> dans
            l'onglet « Documents ». La publication part toujours d'un document.
          </p>
          {onGoToDocuments && (
            <button
              onClick={onGoToDocuments}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-ink-800"
            >
              <FileUp className="w-4 h-4" />
              Aller à l'onglet « Documents »
            </button>
          )}
          <p className="text-xs text-ink-400 mt-3 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            PROPH3T extraira les conditions tarifaires en split-screen.
          </p>
        </div>
      </div>
    );
  }

  const handleValidateAll = async () => {
    if (submitState.status === 'submitting') return;
    setSubmitState({ status: 'submitting' });
    try {
      const result = await submitValidatedReference({
        bankCode: bank.code,
        pdfUrl,
        fields,
        segment: segment || undefined,
        autoPublish,
        bankMeta: {
          legalName: bank.name,
          countryIso: bank.country,
          zone: resolveZone(bank),
        },
      });
      setSubmitState({
        status: 'success',
        conditionsCount: result.conditionsCount,
        published: Boolean(result.published),
      });
    } catch (err) {
      setSubmitState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Échec de la soumission.',
      });
    }
  };

  return (
    <div className="h-[600px] -mx-6 -my-4">
      <div className="px-4 py-2 border-b border-canvas-200 bg-canvas-50 text-xs text-ink-500 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span>
          Document : <span className="font-mono text-ink-700">{document.name}</span>
          {' · '}Banque : <span className="font-semibold text-ink-700">{bank.name}</span>
        </span>
        {/* Segment tarifaire du barème mutualisé publié */}
        <span className="ml-auto flex items-center gap-1.5">
          <span className="uppercase tracking-wide text-[10px] text-ink-400">Barème pour</span>
          <span className="inline-flex overflow-hidden rounded-lg border border-canvas-300">
            {SEGMENTS.map((s) => (
              <button
                key={s.value || 'all'}
                type="button"
                onClick={() => setSegment(s.value)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  segment === s.value
                    ? 'bg-ink-900 text-white'
                    : 'bg-white text-ink-500 hover:bg-canvas-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </span>
        </span>
      </div>

      {/* Auto-validation (phase de démarrage) */}
      <div className="px-4 py-2 border-b border-canvas-200 bg-white flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-ink-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-canvas-300 text-ink-900 focus:ring-ink-400"
          />
          <span>
            <strong>Publier directement</strong> (auto-validation)
          </span>
        </label>
        <span className="text-[10px] text-ink-400 text-right max-w-[60%]">
          {autoPublish
            ? 'Phase de démarrage : le barème sera publié sans second validateur et servira aussitôt aux audits.'
            : 'Décoché : soumission au workflow deux yeux (un second admin valide puis publie).'}
        </span>
      </div>

      {/* Statut d'extraction (temps réel) */}
      {extractionState.status === 'extracting' && (
        <div className="px-4 py-2 bg-canvas-50 border-b border-canvas-200 text-xs text-ink-600 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Extraction des conditions en cours…
        </div>
      )}
      {extractionState.status === 'done' && (
        <div className={`px-4 py-2 border-b text-xs flex flex-col gap-1 ${
          fromValidated ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-canvas-50 border-canvas-200 text-ink-600'
        }`}>
          <span className="inline-flex items-center gap-2">
            {fromValidated ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-ink-400" />}
            {fromValidated ? (
              <>
                {extractionState.count} ligne{extractionState.count > 1 ? 's' : ''} issue
                {extractionState.count > 1 ? 's' : ''} de <strong>vos corrections</strong> à l'import
                {' '}— publiées telles quelles (aucune ré-extraction).
              </>
            ) : (
              <>
                {extractionState.count} champ{extractionState.count > 1 ? 's' : ''} extrait
                {extractionState.count > 1 ? 's' : ''}
                {extractionState.count === 0 && ' — aucune condition détectée, ajoutez les champs manuellement.'}
              </>
            )}
          </span>
          {extractionState.warnings.length > 0 && (
            <span className="inline-flex items-start gap-1.5 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>{extractionState.warnings.join(' · ')}</span>
            </span>
          )}
        </div>
      )}
      {extractionState.status === 'error' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Extraction indisponible ({extractionState.message}). Vous pouvez ajouter les
          champs manuellement.
        </div>
      )}

      {submitState.status === 'submitting' && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Création de la version L2 et soumission à validation…
        </div>
      )}
      {submitState.status === 'success' && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {submitState.published ? (
            <>
              Barème <strong>publié</strong> ({submitState.conditionsCount} condition
              {submitState.conditionsCount > 1 ? 's' : ''}) — auto-validation. Il est
              désormais actif : les audits utilisent ce barème officiel.
            </>
          ) : (
            <>
              Version soumise à validation ({submitState.conditionsCount} condition
              {submitState.conditionsCount > 1 ? 's' : ''}). Un pair doit désormais la
              valider puis la publier (workflow 2 yeux).
            </>
          )}
        </div>
      )}
      {submitState.status === 'error' && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {submitState.message}
        </div>
      )}
      <SplitScreenValidator
        pdfUrl={pdfUrl}
        fields={fields}
        activeFieldId={activeFieldId}
        onActivateField={setActiveFieldId}
        onFieldChange={(id, patch) => {
          setFields((xs) => xs.map((f) => (f.id === id ? { ...f, ...patch } : f)));
        }}
        onAddFieldFromBbox={(bbox) => {
          const id = 'fld-' + Math.random().toString(36).slice(2, 8);
          setFields((xs) => [...xs, {
            id,
            rubricCode: 'compte.tenue_mensuelle',
            label: 'Nouveau champ (à éditer)',
            value: '',
            unit: 'FCFA',
            bbox,
            confidence: 'low',
          }]);
          setActiveFieldId(id);
        }}
        onValidateAll={handleValidateAll}
      />
    </div>
  );
}
