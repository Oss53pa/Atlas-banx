// ============================================================================
// ATLASBANX — Import GROUPÉ multi-banques
// ============================================================================
// L'utilisateur dépose plusieurs fichiers de conditions ; chacun est
// auto-associé à une banque d'après son nom (corrigeable), puis l'ensemble est
// importé selon le mode de validation choisi. La file est ensuite traitée par
// processNextImport (dans BanksPage), qui enchaîne fichier par fichier.
// ============================================================================

import { useMemo, useRef, useState } from 'react';
import { Upload, X, FileText, Trash2, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { Button } from '../ui';
import type { Bank } from '../../types';
import { matchBankByFilename } from './batchImportMatch';

export type BatchValidationMode = 'verify' | 'auto' | 'auto-doubt';

interface BatchFileRow {
  id: string;
  file: File;
  bankId: string | null;
  /** 'auto' = deviné avec confiance · 'ambiguous' = à vérifier · 'none' = à assigner. */
  suggestion: 'auto' | 'ambiguous' | 'none';
}

interface Props {
  open: boolean;
  banks: Bank[];
  onClose: () => void;
  onRun: (assignments: { file: File; bankId: string }[], mode: BatchValidationMode) => void;
}

const ACCEPT =
  '.pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tiff,.bmp,application/pdf,' +
  'application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*';

const MODES: { value: BatchValidationMode; label: string; help: string }[] = [
  { value: 'verify', label: 'Vérifier chaque fichier', help: 'La modale de vérification s’ouvre pour chaque fichier (contrôle complet).' },
  { value: 'auto-doubt', label: 'Auto + vérif si doute', help: 'Import direct quand la confiance est haute ; vérification ouverte pour les fichiers douteux.' },
  { value: 'auto', label: 'Tout auto-commit', help: 'Import direct de tous les fichiers (rubriques ≥ seuil de confiance), sans vérification.' },
];

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function BatchImportModal({ open, banks, onClose, onRun }: Props) {
  const [rows, setRows] = useState<BatchFileRow[]>([]);
  const [mode, setMode] = useState<BatchValidationMode>('verify');
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedBanks = useMemo(
    () => [...banks].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    [banks],
  );

  if (!open) return null;

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newRows: BatchFileRow[] = Array.from(files).map((file) => {
      const m = matchBankByFilename(file.name, banks);
      return {
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        bankId: m.bankId,
        suggestion: m.bankId ? (m.ambiguous ? 'ambiguous' : 'auto') : 'none',
      };
    });
    setRows((prev) => [...prev, ...newRows]);
  };

  const setBank = (id: string, bankId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, bankId: bankId || null, suggestion: bankId ? 'auto' : 'none' } : r)),
    );
  };
  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const assignedCount = rows.filter((r) => r.bankId).length;
  const canRun = assignedCount > 0;

  const launch = () => {
    const assignments = rows
      .filter((r): r is BatchFileRow & { bankId: string } => Boolean(r.bankId))
      .map((r) => ({ file: r.file, bankId: r.bankId }));
    onRun(assignments, mode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col rounded-xl bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-primary-100">
          <div>
            <h2 className="text-base font-semibold text-primary-900">Import groupé — plusieurs banques</h2>
            <p className="text-xs text-primary-500 mt-0.5">
              Chaque fichier est associé automatiquement à une banque d’après son nom — corrige si besoin.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-primary-400 hover:text-primary-700 rounded-md hover:bg-primary-50" title="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="border-2 border-dashed border-primary-300 rounded-xl p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <Upload className="w-9 h-9 text-primary-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-primary-900">Déposer / sélectionner les fichiers de conditions</p>
            <p className="text-xs text-primary-500 mt-1">PDF · Excel · Image — un fichier = une grille pour une banque</p>
            <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
          </div>

          {/* Assignments table */}
          {rows.length > 0 && (
            <div className="border border-primary-100 rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-primary-50 border-b border-primary-100 text-primary-500">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">Fichier</th>
                    <th className="text-left font-medium px-3 py-2 w-[46%]">Banque</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-50">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-primary-400 shrink-0" />
                          <span className="truncate text-primary-800" title={r.file.name}>{r.file.name}</span>
                          <span className="text-[10px] text-primary-400 shrink-0">{fmtSize(r.file.size)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-1.5">
                          <SuggestionBadge kind={r.suggestion} />
                          <select
                            value={r.bankId ?? ''}
                            onChange={(e) => setBank(r.id, e.target.value)}
                            className={`h-7 min-w-0 flex-1 rounded-md border px-1.5 text-[11px] text-primary-800 focus:outline-none focus:border-primary-400 ${
                              r.bankId ? 'border-primary-200 bg-white' : 'border-red-300 bg-red-50'
                            }`}
                          >
                            <option value="">— à assigner —</option>
                            {sortedBanks.map((b) => (
                              <option key={b.id} value={b.id}>{b.name} ({b.country})</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-2 py-2 align-middle text-right">
                        <button onClick={() => removeRow(r.id)} className="p-1 text-primary-400 hover:text-red-600" title="Retirer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mode selector */}
          {rows.length > 0 && (
            <fieldset className="space-y-1.5">
              <legend className="text-xs font-semibold text-primary-700 mb-1">Validation des conditions extraites</legend>
              {MODES.map((m) => (
                <label
                  key={m.value}
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    mode === m.value ? 'border-primary-400 bg-primary-50' : 'border-primary-200 hover:bg-primary-50/50'
                  }`}
                >
                  <input type="radio" name="batch-mode" className="mt-0.5" checked={mode === m.value} onChange={() => setMode(m.value)} />
                  <span>
                    <span className="block text-xs font-medium text-primary-900">{m.label}</span>
                    <span className="block text-[11px] text-primary-500">{m.help}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-primary-100 bg-canvas-50">
          <span className="text-xs text-primary-500">
            {rows.length === 0
              ? 'Aucun fichier'
              : `${assignedCount}/${rows.length} fichier${rows.length > 1 ? 's' : ''} assigné${assignedCount > 1 ? 's' : ''}`}
            {rows.length > assignedCount && rows.length > 0 && (
              <span className="text-red-500"> · {rows.length - assignedCount} à assigner</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Annuler</Button>
            <Button size="sm" onClick={launch} disabled={!canRun}>
              Lancer l’import ({assignedCount})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionBadge({ kind }: { kind: BatchFileRow['suggestion'] }) {
  if (kind === 'auto') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" aria-label="Association automatique" />;
  }
  if (kind === 'ambiguous') {
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" aria-label="À vérifier" />;
  }
  return <HelpCircle className="w-4 h-4 text-red-400 shrink-0" aria-label="À assigner" />;
}
