// ============================================================================
// ATLASBANX — Journal de couverture du référentiel L2 (console admin)
// ============================================================================
// Pour chaque banque : le journal des versions de barème importées (période,
// type de client, statut, nb de conditions) + une lecture de couverture par
// segment qui MET EN ÉVIDENCE LES PÉRIODES MANQUANTES (trous et couverture
// expirée).
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import {
  Search, Landmark, CheckCircle2, AlertTriangle, Loader2, CalendarClock, FileText, Download, Upload,
  Eye, X, FileSearch, ShieldCheck,
} from 'lucide-react';
import {
  fetchReferenceJournal, coverageForSegment, hasOpenGapToday, bankHasMissingPeriods, journalToCsv,
  CONCRETE_SEGMENTS, SEGMENT_LABELS,
  fetchReferenceVersionDetail, rubricLabel, formatConditionValue,
  type ReferenceJournalRow, type JournalSegment, type ReferenceVersionDetail,
} from '../../cdc/services/referenceJournal';

interface ReferenceJournalPanelProps {
  /** Ouvre l'onglet d'import scopé sur la banque + le segment donnés. */
  onImport?: (bankCode: string, segment: JournalSegment) => void;
}

/**
 * Rend lisible une valeur tarifaire exprimée par une FORMULE (barème par
 * tranches, % avec min/max…) stockée en JSONB. On affiche les champs usuels
 * quand ils existent, sinon un JSON compact — pour que l'admin puisse VÉRIFIER
 * la condition contre le PDF source (au lieu d'un simple libellé « Formule »).
 */
function formatFormula(f: unknown): string {
  if (f === null || f === undefined) return '—';
  if (typeof f === 'string' || typeof f === 'number') return String(f);
  if (typeof f === 'object') {
    const o = f as Record<string, unknown>;
    const parts: string[] = [];
    const pct = o.percent ?? o.percentage ?? o.taux;
    if (pct !== undefined) parts.push(`${pct} %`);
    if (o.min !== undefined) parts.push(`min ${o.min}`);
    if (o.max !== undefined) parts.push(`max ${o.max}`);
    if (o.fixed !== undefined) parts.push(`fixe ${o.fixed}`);
    if (Array.isArray(o.tiers)) parts.push(`${o.tiers.length} tranche(s)`);
    if (parts.length > 0) return parts.join(' · ');
    try { return JSON.stringify(f); } catch { return 'Formule'; }
  }
  return 'Formule';
}

function fmtDate(iso: string | null, open = '∞'): string {
  if (!iso) return open;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
}

const SEGMENT_CHIP: Record<JournalSegment, string> = {
  particulier: 'bg-blue-50 text-blue-700 border-blue-200',
  pme: 'bg-amber-50 text-amber-700 border-amber-200',
  corporate: 'bg-violet-50 text-violet-700 border-violet-200',
  tous: 'bg-primary-50 text-primary-500 border-primary-200',
};

const STATUS_CHIP: Record<string, string> = {
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  validated: 'bg-blue-50 text-blue-700 border-blue-200',
  submitted: 'bg-amber-50 text-amber-700 border-amber-200',
  draft: 'bg-primary-50 text-primary-500 border-primary-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_LABEL: Record<string, string> = {
  published: 'Publié', validated: 'Validé', submitted: 'Soumis', draft: 'Brouillon', rejected: 'Rejeté',
};

export function ReferenceJournalPanel({ onImport }: ReferenceJournalPanelProps = {}) {
  const [rows, setRows] = useState<ReferenceJournalRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [missingOnly, setMissingOnly] = useState(false);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Détail d'une version (conditions importées + source), affiché en modale.
  const [detail, setDetail] = useState<ReferenceVersionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = (versionId: string) => {
    setDetail(null);
    setDetailLoading(true);
    void fetchReferenceVersionDetail(versionId)
      .then((d) => setDetail(d))
      .finally(() => setDetailLoading(false));
  };
  const closeDetail = () => { setDetail(null); setDetailLoading(false); };

  useEffect(() => {
    let cancelled = false;
    void fetchReferenceJournal().then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, []);

  const banks = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    const map = new Map<string, { name: string; zone: string; country: string; rows: ReferenceJournalRow[] }>();
    for (const r of rows) {
      if (q && !r.bankName.toLowerCase().includes(q) && !r.bankCode.toLowerCase().includes(q)) continue;
      const e = map.get(r.bankCode) ?? { name: r.bankName, zone: r.zone, country: r.countryIso, rows: [] };
      e.rows.push(r);
      map.set(r.bankCode, e);
    }
    let list = Array.from(map.entries()).map(([code, e]) => ({ code, ...e }));
    if (missingOnly) list = list.filter((b) => bankHasMissingPeriods(b.rows, today));
    return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [rows, search, missingOnly, today]);

  // Synthèse globale (sur TOUT le référentiel, indépendamment des filtres).
  const summary = useMemo(() => {
    if (!rows) return { totalBanks: 0, withMissing: 0, versions: 0 };
    const map = new Map<string, ReferenceJournalRow[]>();
    for (const r of rows) {
      const l = map.get(r.bankCode) ?? [];
      l.push(r);
      map.set(r.bankCode, l);
    }
    let withMissing = 0;
    for (const [, list] of map) if (bankHasMissingPeriods(list, today)) withMissing++;
    return { totalBanks: map.size, withMissing, versions: rows.length };
  }, [rows, today]);

  const exportCsv = () => {
    const flat = banks.flatMap((b) => b.rows);
    const csv = journalToCsv(flat, today);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-referentiel-l2-${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (rows === null) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-primary-500">
        <Loader2 className="h-5 w-5 animate-spin" /> Chargement du journal…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-primary-900">Journal des conditions importées</h2>
          <p className="text-sm text-primary-500">
            Par banque, type de client et période — les <span className="font-medium text-red-600">périodes manquantes</span> sont mises en évidence.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            missingOnly ? 'border-red-300 bg-red-50 text-red-700' : 'border-primary-200 bg-white text-primary-600 hover:bg-primary-50'
          }`}>
            <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} className="h-3.5 w-3.5 rounded border-primary-300 text-red-600 focus:ring-red-400" />
            <AlertTriangle className="h-3.5 w-3.5" /> Périodes manquantes
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une banque…"
              className="h-9 w-48 rounded-lg border border-primary-200 pl-8 pr-3 text-sm focus:border-primary-400 focus:outline-none"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={banks.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Exporter CSV
          </button>
        </div>
      </div>

      {/* Synthèse */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-primary-700">
          <Landmark className="h-3.5 w-3.5 text-primary-400" />
          <strong className="text-primary-900">{summary.totalBanks}</strong> banque{summary.totalBanks > 1 ? 's' : ''} référencée{summary.totalBanks > 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setMissingOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
            summary.withMissing > 0
              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          title={summary.withMissing > 0 ? 'Filtrer sur les banques à compléter' : undefined}
        >
          {summary.withMissing > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          <strong>{summary.withMissing}</strong> avec périodes manquantes
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3 py-1.5 text-primary-700">
          <FileText className="h-3.5 w-3.5 text-primary-400" />
          <strong className="text-primary-900">{summary.versions}</strong> version{summary.versions > 1 ? 's' : ''} de barème
        </span>
      </div>

      {banks.length === 0 && (
        <div className="rounded-xl border border-primary-200 bg-white p-8 text-center text-sm text-primary-500">
          {missingOnly && rows.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Aucune banque avec périodes manquantes.
            </span>
          ) : (
            'Aucun barème au référentiel. Importez et publiez des conditions via les onglets « Conditions ».'
          )}
        </div>
      )}

      {banks.map((bank) => (
        <div key={bank.code} className="rounded-xl border border-primary-200 bg-white">
          {/* En-tête banque */}
          <div className="flex items-center justify-between gap-3 border-b border-primary-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <Landmark className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-primary-900">{bank.name}</p>
                <p className="text-[11px] text-primary-500">{bank.country} · {bank.code} · {bank.zone}</p>
              </div>
            </div>
            <span className="text-[11px] text-primary-400">{bank.rows.length} version(s)</span>
          </div>

          {/* Couverture par segment — met en évidence les trous */}
          <div className="space-y-2 border-b border-primary-100 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-400">
              <CalendarClock className="h-3.5 w-3.5" /> Couverture par type de client
            </p>
            <div className="space-y-1.5">
              {CONCRETE_SEGMENTS.map((seg) => {
                const spans = coverageForSegment(bank.rows, seg);
                const openGap = hasOpenGapToday(spans, today);
                const none = spans.length === 0;
                const hasGap = none || spans.some((s) => !s.covered) || openGap;
                return (
                  <div key={seg} className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex w-28 shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${SEGMENT_CHIP[seg]}`}>
                      {SEGMENT_LABELS[seg]}
                    </span>
                    {none ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Aucun barème publié
                      </span>
                    ) : (
                      <>
                        {spans.map((s, i) =>
                          s.covered ? (
                            <span key={i} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> {fmtDate(s.from)} → {fmtDate(s.to)}
                            </span>
                          ) : (
                            <span key={i} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              <AlertTriangle className="h-3 w-3" /> Manquant : {fmtDate(s.from)} → {fmtDate(s.to)}
                            </span>
                          ),
                        )}
                        {openGap && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            <AlertTriangle className="h-3 w-3" /> Manquant depuis {fmtDate(spans[spans.length - 1].to)}
                          </span>
                        )}
                      </>
                    )}
                    {hasGap && onImport && (
                      <button
                        onClick={() => onImport(bank.code, seg)}
                        className="inline-flex items-center gap-1 rounded-md border border-primary-900 bg-primary-900 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-primary-800"
                        title={`Importer un barème ${SEGMENT_LABELS[seg]} pour ${bank.name}`}
                      >
                        <Upload className="h-3 w-3" /> Importer ce barème
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Journal des versions */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-primary-100 bg-primary-50/60 text-left text-[11px] text-primary-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Période</th>
                  <th className="px-3 py-2 font-medium">Types de client</th>
                  <th className="px-3 py-2 font-medium">Version</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 text-right font-medium">Conditions</th>
                  <th className="px-3 py-2 text-right font-medium">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-100">
                {bank.rows
                  .slice()
                  .sort((a, b) => (a.effectiveFrom ?? '') < (b.effectiveFrom ?? '') ? 1 : -1)
                  .map((r) => (
                    <tr key={r.versionId} className="hover:bg-primary-50/50">
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-primary-800">
                        {fmtDate(r.effectiveFrom)} → {fmtDate(r.effectiveTo)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {r.segments.length === 0 ? (
                            <span className="text-primary-400">—</span>
                          ) : (
                            r.segments.map((s) => (
                              <span key={s} className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${SEGMENT_CHIP[s]}`}>
                                {SEGMENT_LABELS[s]}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-primary-600">
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary-400" /> {r.versionLabel ?? '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_CHIP[r.validationStatus] ?? STATUS_CHIP.draft}`}>
                          {STATUS_LABEL[r.validationStatus] ?? r.validationStatus}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-primary-700">{r.conditionsCount}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => openDetail(r.versionId)}
                          className="inline-flex items-center gap-1 rounded-md border border-primary-200 bg-white px-2 py-1 text-[11px] font-medium text-primary-700 hover:bg-primary-50"
                          title="Voir les conditions importées et la source"
                        >
                          <Eye className="h-3 w-3" /> Voir
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Modale — détail des conditions importées + source */}
      {(detailLoading || detail) && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-4 sm:p-8"
          onClick={closeDetail}
        >
          <div
            className="mt-4 w-full max-w-3xl rounded-xl border border-primary-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3 border-b border-primary-100 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                  <FileSearch className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-primary-900">
                    {detail?.versionLabel ?? 'Barème importé'}
                  </p>
                  {detail && (
                    <p className="text-[11px] text-primary-500">
                      {fmtDate(detail.effectiveFrom)} → {fmtDate(detail.effectiveTo)} · {STATUS_LABEL[detail.validationStatus] ?? detail.validationStatus} · {detail.conditions.length} condition(s)
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeDetail}
                className="rounded-md p-1.5 text-primary-400 hover:bg-primary-50 hover:text-primary-700"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-primary-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Chargement du détail…
              </div>
            ) : detail ? (
              <div className="max-h-[70vh] overflow-y-auto p-5">
                {/* Source du barème */}
                <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50/50 p-3">
                  <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> Source importée
                  </p>
                  {detail.sourcePdfUrl && /^https?:\/\//.test(detail.sourcePdfUrl) ? (
                    <a
                      href={detail.sourcePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> Ouvrir le PDF source
                    </a>
                  ) : (
                    <p className="text-xs text-primary-700">
                      <span className="text-primary-500">Référence : </span>
                      <span className="font-mono">{detail.sourcePdfUrl ?? '—'}</span>
                    </p>
                  )}
                  {detail.sourceHash && (
                    <p className="mt-1 break-all text-[10px] text-primary-400">
                      Empreinte SHA-256 : <span className="font-mono">{detail.sourceHash}</span>
                    </p>
                  )}
                </div>

                {/* Conditions importées */}
                {detail.conditions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-primary-500">Aucune condition dans ce barème.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-primary-100">
                    <table className="w-full text-xs">
                      <thead className="border-b border-primary-100 bg-primary-50/60 text-left text-[11px] text-primary-500">
                        <tr>
                          <th className="px-3 py-2 font-medium">Rubrique</th>
                          <th className="px-3 py-2 font-medium">Type de client</th>
                          <th className="px-3 py-2 text-right font-medium">Valeur</th>
                          <th className="px-3 py-2 text-right font-medium">Page</th>
                          <th className="px-3 py-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary-100">
                        {detail.conditions.map((c) => (
                          <tr key={c.id} className="hover:bg-primary-50/50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-primary-800">{rubricLabel(c.rubricCode)}</div>
                              <div className="font-mono text-[10px] text-primary-400">{c.rubricCode}</div>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${SEGMENT_CHIP[(c.profil ?? 'tous') as JournalSegment] ?? SEGMENT_CHIP.tous}`}>
                                {SEGMENT_LABELS[(c.profil ?? 'tous') as JournalSegment] ?? (c.profil ?? 'Tous segments')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-primary-900">
                              {c.valueNumeric === null && c.valueFormula
                                ? <span className="font-mono text-[10px] font-normal text-primary-600">{formatFormula(c.valueFormula)}</span>
                                : formatConditionValue(c.rubricCode, c.valueNumeric)}
                            </td>
                            <td className="px-3 py-2 text-right text-primary-500">{c.pdfPage ?? '—'}</td>
                            <td className="px-3 py-2 text-primary-600">{c.notes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-16 text-center text-sm text-primary-500">Détail indisponible.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
