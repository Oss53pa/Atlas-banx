// ============================================================================
// ValidationTabContent — onglet Validation IA dans BankConditionsModal
// ============================================================================
// Wrap le SplitScreenValidator (CDC §7.2) :
//   - panneau gauche : PDF du dernier document archivé
//   - panneau droit : champs extraits par PROPH3T (mock pour l'instant)
//   - sélection bidirectionnelle bbox ↔ champ
//   - validation finale → publication d'une nouvelle version L2
// ============================================================================

import { useMemo, useState } from 'react';
import { FileX, Sparkles, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import type { Bank, ArchivedDocument } from '../../types';
import { SplitScreenValidator, type ExtractedField } from '../../cdc/components/SplitScreenValidator';
import { submitValidatedReference } from '../../cdc/services/submitValidatedReference';

type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success'; conditionsCount: number }
  | { status: 'error'; message: string };

interface ValidationTabContentProps {
  bank: Bank;
  archivedDocuments: ArchivedDocument[];
}

export function ValidationTabContent({ bank, archivedDocuments }: ValidationTabContentProps) {
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

  const [fields, setFields] = useState<ExtractedField[]>(() =>
    document ? buildSeedFields(document.id) : [],
  );
  const [activeFieldId, setActiveFieldId] = useState<string | undefined>();
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });

  if (!document) {
    return (
      <div className="flex items-center justify-center py-16 px-6 text-center">
        <div className="max-w-md">
          <FileX className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-ink-900">Aucun document à valider</h3>
          <p className="text-sm text-ink-500 mt-2">
            Importez un document (CG bancaires, convention) dans l'onglet
            « Documents » pour démarrer une session de validation IA.
          </p>
          <p className="text-xs text-ink-400 mt-3 inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            PROPH3T extraira les conditions tarifaires en split-screen.
          </p>
        </div>
      </div>
    );
  }

  const pdfUrl = document.fileData ?? '';

  const handleValidateAll = async () => {
    if (submitState.status === 'submitting') return;
    setSubmitState({ status: 'submitting' });
    try {
      const result = await submitValidatedReference({
        bankCode: bank.code,
        pdfUrl,
        fields,
      });
      setSubmitState({ status: 'success', conditionsCount: result.conditionsCount });
    } catch (err) {
      setSubmitState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Échec de la soumission.',
      });
    }
  };

  return (
    <div className="h-[600px] -mx-6 -my-4">
      <div className="px-4 py-2 border-b border-canvas-200 bg-canvas-50 text-xs text-ink-500">
        Document : <span className="font-mono text-ink-700">{document.name}</span>
        {' · '}Banque : <span className="font-semibold text-ink-700">{bank.name}</span>
      </div>

      {submitState.status === 'submitting' && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-xs text-blue-700 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Création de la version L2 et soumission à validation…
        </div>
      )}
      {submitState.status === 'success' && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-100 text-xs text-green-700 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Version soumise à validation ({submitState.conditionsCount} condition
          {submitState.conditionsCount > 1 ? 's' : ''}). Un pair doit désormais la
          valider puis la publier (workflow 2 yeux).
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

// ============================================================================
// Mock seed fields (à remplacer par extraction PROPH3T effective)
// ============================================================================

function buildSeedFields(documentId: string): ExtractedField[] {
  void documentId;
  return [
    {
      id: 'fld-1',
      rubricCode: 'compte.tenue_mensuelle',
      label: 'Tenue de compte mensuelle',
      value: '2 500',
      unit: 'FCFA',
      bbox: { page: 1, x: 100, y: 700, w: 80, h: 14 },
      confidence: 'high',
    },
    {
      id: 'fld-2',
      rubricCode: 'decouverts.taux_autorise',
      label: 'Taux découvert autorisé',
      value: '11.5',
      unit: '%',
      bbox: { page: 2, x: 120, y: 500, w: 60, h: 14 },
      confidence: 'medium',
    },
    {
      id: 'fld-3',
      rubricCode: 'decouverts.commission_mouvement',
      label: 'Commission de mouvement',
      value: '0.25',
      unit: '%',
      bbox: { page: 2, x: 120, y: 460, w: 60, h: 14 },
      confidence: 'low',
    },
  ];
}
