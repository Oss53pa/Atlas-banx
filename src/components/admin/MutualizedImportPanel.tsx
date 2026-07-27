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

import { useRef, useState } from 'react';
import { Plus, Trash2, UploadCloud, CheckCircle2, AlertCircle, Loader2, FileText, Sparkles } from 'lucide-react';
import { submitValidatedReference } from '../../cdc/services/submitValidatedReference';
import { extractConditions } from '../../extraction/conditions';
import { extractionResultToFields } from '../banks/extractionToFields';
import { getSupabaseClient } from '../../lib/supabase';
import type { ExtractedField } from '../../cdc/components/SplitScreenValidator';

const BANK_REFERENCES_BUCKET = 'bank-references';

/** SHA-256 (hex) des octets réels d'un fichier. */
async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Nettoie un nom de fichier pour un chemin storage sûr. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
}

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

  // Extraction PDF (OCR inclus via extractConditions)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{ pct: number; message: string } | null>(null);
  const [extractWarnings, setExtractWarnings] = useState<string[]>([]);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setResult(null);
    setExtractWarnings([]);
    setSelectedFile(file);
    setFileName(file.name);
    setIsExtracting(true);
    setExtractProgress({ pct: 0, message: 'Lecture du PDF…' });

    try {
      // Extraction position-aware — bascule automatiquement en OCR si le PDF
      // est scanné (extractConditions détecte l'absence de couche texte).
      const extraction = await extractConditions(file, {
        bankCode: bankCode.trim() || undefined,
        onProgress: (p) => setExtractProgress({ pct: p.pct, message: p.message }),
      });

      setExtractWarnings(extraction.warnings ?? []);

      const fields = extractionResultToFields(extraction);
      if (fields.length > 0) {
        setRows(
          fields.map((f) => ({
            rubricCode: f.rubricCode,
            label: f.label,
            value: f.value == null ? '' : String(f.value),
            unit: f.unit ?? '',
          })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'extraction du PDF.");
    } finally {
      setIsExtracting(false);
      setExtractProgress(null);
    }
  };

  const updateRow = (index: number, patch: Partial<ConditionRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (index: number) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const canSubmit =
    bankCode.trim() !== '' &&
    (selectedFile !== null || sourcePdfUrl.trim() !== '') &&
    rows.some((r) => r.rubricCode.trim() !== '') &&
    !isSubmitting &&
    !isExtracting;

  /** Téléverse le PDF dans le bucket mutualisé et renvoie {path, hash}. */
  async function uploadSourcePdf(file: File, code: string): Promise<{ path: string; hash: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase non configuré — upload impossible.');

    const hash = await hashFile(file);
    // Chemin déterministe par empreinte : dédoublonne les ré-uploads du même PDF.
    const path = `${code}/${hash.slice(0, 16)}_${safeName(file.name)}`;

    const { error: upErr } = await supabase.storage
      .from(BANK_REFERENCES_BUCKET)
      .upload(path, file, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw new Error(`Upload PDF échoué : ${upErr.message}`);

    return { path: `${BANK_REFERENCES_BUCKET}/${path}`, hash };
  }

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

      // PDF : soit un fichier téléversé (→ bucket + hash des octets réels),
      // soit une URL archivée saisie manuellement.
      let pdfUrl = sourcePdfUrl.trim();
      let sourceHashSha256: string | undefined;
      if (selectedFile) {
        const uploaded = await uploadSourcePdf(selectedFile, bankCode.trim());
        pdfUrl = uploaded.path;
        sourceHashSha256 = uploaded.hash;
      }

      const res = await submitValidatedReference({
        bankCode: bankCode.trim(),
        pdfUrl,
        fields,
        effectiveFrom: new Date(effectiveFrom),
        sourceHashSha256,
      });

      setResult(res);
      // Réinitialise les conditions + le fichier, conserve la banque.
      setRows([{ ...EMPTY_ROW }]);
      setSelectedFile(null);
      setFileName(null);
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
        {/* Upload PDF + extraction IA/OCR */}
        <div className="rounded-xl border border-dashed border-amber-400/25 bg-amber-400/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/5 text-amber-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">Extraction automatique</p>
                <p className="text-xs text-white/45">
                  Téléversez le PDF officiel — extraction IA + OCR si scanné. Vérifiez ensuite les valeurs.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-medium text-amber-200 hover:bg-amber-400/10 disabled:opacity-40"
            >
              {isExtracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {isExtracting ? 'Extraction…' : 'Choisir un PDF'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </div>

          {fileName && !isExtracting && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> {fileName} — {rows.length} condition(s) pré-remplie(s).
            </p>
          )}
          {extractProgress && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-white/50">
                <span>{extractProgress.message}</span>
                <span>{Math.round(extractProgress.pct)}%</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${extractProgress.pct}%` }} />
              </div>
            </div>
          )}
          {extractWarnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {extractWarnings.map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-amber-200/70">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" /> {w}
                </li>
              ))}
            </ul>
          )}
        </div>

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
            {selectedFile ? (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70">
                <FileText className="h-3.5 w-3.5 text-amber-300" />
                <span className="truncate">{fileName ?? 'PDF téléversé'}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setFileName(null); }}
                  className="ml-auto text-xs text-white/40 hover:text-red-300"
                >
                  retirer
                </button>
              </div>
            ) : (
              <input
                value={sourcePdfUrl}
                onChange={(e) => setSourcePdfUrl(e.target.value)}
                placeholder="https://…/conditions.pdf"
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/25 focus:border-amber-400/50 focus:outline-none"
                disabled={isSubmitting}
              />
            )}
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
