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
  Search, Landmark, CheckCircle2, AlertTriangle, Loader2, CalendarClock, FileText,
} from 'lucide-react';
import {
  fetchReferenceJournal, coverageForSegment, hasOpenGapToday,
  CONCRETE_SEGMENTS, SEGMENT_LABELS,
  type ReferenceJournalRow, type JournalSegment,
} from '../../cdc/services/referenceJournal';

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

export function ReferenceJournalPanel() {
  const [rows, setRows] = useState<ReferenceJournalRow[] | null>(null);
  const [search, setSearch] = useState('');
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

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
    return Array.from(map.entries())
      .map(([code, e]) => ({ code, ...e }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [rows, search]);

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
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une banque…"
            className="h-9 w-56 rounded-lg border border-primary-200 pl-8 pr-3 text-sm focus:border-primary-400 focus:outline-none"
          />
        </div>
      </div>

      {banks.length === 0 && (
        <div className="rounded-xl border border-primary-200 bg-white p-8 text-center text-sm text-primary-500">
          Aucun barème au référentiel. Importez et publiez des conditions via les onglets « Conditions ».
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
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
