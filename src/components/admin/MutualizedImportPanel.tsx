// ============================================================================
// Atlas Studio — Import des conditions bancaires MUTUALISÉES (L2)
// ============================================================================
// Réservé aux administrateurs Atlas Studio. Les conditions saisies ici
// alimentent le référentiel banque L2, partagé par TOUS les clients — un
// client ne peut jamais y écrire (RLS : écriture L2 réservée au back-office).
//
// Le formulaire crée une version de référence en brouillon puis la soumet à
// validation (workflow 2 yeux : un second admin valide/publie).
// ============================================================================

import { useState } from 'react';
import { Plus, Trash2, UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { submitValidatedReference } from '../../cdc/services/submitValidatedReference';
import type { ExtractedField } from '../../cdc/components/SplitScreenValidator';

interface ConditionRow {
  rubricCode: string;
  label: string;
  value: string;
  unit: string;
}

const EMPTY_ROW: ConditionRow = { rubricCode: '', label: '', value: '', unit: '' };

export function MutualizedImportPanel() {
  const [bankCode, setBankCode] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [sourcePdfUrl, setSourcePdfUrl] = useState('');
  const [rows, setRows] = useState<ConditionRow[]>([{ ...EMPTY_ROW }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ versionId: string; conditionsCount: number } | null>(null);

  const updateRow = (index: number, patch: Partial<ConditionRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const canSubmit =
    bankCode.trim() !== '' &&
    sourcePdfUrl.trim() !== '' &&
    rows.some((r) => r.rubricCode.trim() !== '') &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsSubmitting(true);

    try {
      // Convertit les lignes du formulaire en champs validés attendus par le
      // pipeline CDC. Saisie manuelle → pas de bbox (origine hors PDF).
      const fields: ExtractedField[] = rows
        .filter((r) => r.rubricCode.trim() !== '')
        .map((r, i) => ({
          id: `manual-${i}`,
          rubricCode: r.rubricCode.trim(),
          label: r.label.trim() || r.rubricCode.trim(),
          value: r.value.trim() === '' ? null : r.value.trim(),
          unit: r.unit.trim() || undefined,
          confidence: 'high',
          bbox: null,
        }));

      const res = await submitValidatedReference({
        bankCode: bankCode.trim(),
        pdfUrl: sourcePdfUrl.trim(),
        fields,
        effectiveFrom: new Date(effectiveFrom),
      });

      setResult(res);
      // Réinitialise les conditions, conserve la banque pour un enchaînement.
      setRows([{ ...EMPTY_ROW }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la soumission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Import des conditions mutualisées</h2>
        <p className="mt-1 text-sm text-white/50">
          Référentiel banque L2 — partagé par tous les clients. La version créée est soumise à
          validation par un second administrateur (workflow deux yeux) avant publication.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* En-tête version */}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-white/40">Code banque</span>
            <input
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value.toUpperCase())}
              placeholder="NSIA-CI"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
              disabled={isSubmitting}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-white/40">Entrée en vigueur</span>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-400/50 focus:outline-none"
              disabled={isSubmitting}
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-white/40">PDF source (URL)</span>
            <input
              value={sourcePdfUrl}
              onChange={(e) => setSourcePdfUrl(e.target.value)}
              placeholder="https://…/conditions.pdf"
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
              disabled={isSubmitting}
            />
          </label>
        </div>

        {/* Conditions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-white/40">
              Conditions ({rows.length})
            </span>
            <button
              type="button"
              onClick={addRow}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/5"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1.4fr_1.4fr_0.8fr_0.6fr_auto] gap-2">
                <input
                  value={row.rubricCode}
                  onChange={(e) => updateRow(i, { rubricCode: e.target.value })}
                  placeholder="decouvert.taux_autorise"
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
                  disabled={isSubmitting}
                />
                <input
                  value={row.label}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  placeholder="Libellé (optionnel)"
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
                  disabled={isSubmitting}
                />
                <input
                  value={row.value}
                  onChange={(e) => updateRow(i, { value: e.target.value })}
                  placeholder="11,5"
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
                  disabled={isSubmitting}
                />
                <input
                  value={row.unit}
                  onChange={(e) => updateRow(i, { unit: e.target.value })}
                  placeholder="%"
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={isSubmitting || rows.length === 1}
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 px-2 text-white/40 hover:text-red-400 disabled:opacity-30"
                  aria-label="Supprimer la ligne"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-sm text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              Version <span className="font-mono">{result.versionId.slice(0, 8)}</span> créée avec{' '}
              {result.conditionsCount} condition(s), soumise à validation. Un second administrateur
              doit la valider puis la publier.
            </span>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-ink-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Soumission…</>
          ) : (
            <><UploadCloud className="h-4 w-4" /> Soumettre au référentiel mutualisé</>
          )}
        </button>
      </form>
    </div>
  );
}
