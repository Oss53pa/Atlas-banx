// ============================================================================
// RubricProposalsPanel — validation des rubriques proposées (admin)
// ============================================================================
// Quand un import contient une rubrique absente de l'application, l'opérateur
// la PROPOSE. Ce panneau liste les propositions en attente et permet à un
// administrateur de les VALIDER (la rubrique devient connue de l'application)
// ou de les REJETER. Voir migration 052 (RLS + RPC admin).
// ============================================================================

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Tag, RefreshCw, Inbox } from 'lucide-react';
import {
  listRubricProposals,
  approveRubricProposal,
  rejectRubricProposal,
  type RubricProposal,
  type ProposalStatus,
} from '../../extraction/conditions';

const STATUS_TABS: { id: ProposalStatus; label: string }[] = [
  { id: 'proposed', label: 'En attente' },
  { id: 'approved', label: 'Validées' },
  { id: 'rejected', label: 'Rejetées' },
];

const UNIT_LABEL: Record<string, string> = {
  amount: 'Montant (FCFA)',
  percent: 'Taux (%)',
  days: 'Jours',
};

export function RubricProposalsPanel() {
  const [status, setStatus] = useState<ProposalStatus>('proposed');
  const [rows, setRows] = useState<RubricProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listRubricProposals(status));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const counts = rows.length;

  const act = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      if (action === 'approve') {
        await approveRubricProposal(id);
        window.dispatchEvent(new CustomEvent('atlas-toast', { detail: {
          type: 'success', message: 'Rubrique validée — désormais connue de l\'application.',
        } }));
      } else {
        const reason = window.prompt('Motif du rejet (facultatif) :') ?? undefined;
        await rejectRubricProposal(id, reason);
        window.dispatchEvent(new CustomEvent('atlas-toast', { detail: {
          type: 'info', message: 'Proposition rejetée.',
        } }));
      }
      await load();
    } catch (err) {
      window.dispatchEvent(new CustomEvent('atlas-toast', { detail: {
        type: 'error',
        message: `Action impossible : ${err instanceof Error ? err.message : 'erreur'}`,
      } }));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-accent-200 bg-accent-50 text-accent-600">
            <Tag className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary-900">Rubriques proposées</p>
            <p className="text-[11px] text-primary-500">
              Validez une rubrique absente pour qu'elle devienne connue de l'application.
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 px-2.5 py-1.5 text-xs text-primary-600 hover:bg-primary-100"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Rafraîchir
        </button>
      </div>

      {/* Onglets de statut */}
      <div className="mb-3 flex gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatus(t.id)}
            className={`rounded-pill px-3 py-1 text-xs font-medium transition-colors ${
              status === t.id ? 'bg-primary-900 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-primary-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : counts === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-primary-200 py-16 text-primary-400">
          <Inbox className="h-7 w-7" />
          <p className="text-sm">
            {status === 'proposed' ? 'Aucune rubrique en attente de validation.' : 'Aucune rubrique.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-xl border border-primary-100 bg-white p-3.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-primary-900 truncate">{p.label}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-100 text-primary-600">
                    {p.category}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-50 text-accent-700 border border-accent-200">
                    {UNIT_LABEL[p.unit] ?? p.unit}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-primary-400 truncate">{p.rubricKey}</p>
                {p.sourceLabel && p.sourceLabel !== p.label && (
                  <p className="mt-0.5 text-[11px] text-primary-500 truncate">
                    Extrait : « {p.sourceLabel} »
                  </p>
                )}
                {p.bankCode && (
                  <p className="mt-0.5 text-[11px] text-primary-400">Banque : {p.bankCode}</p>
                )}
                {p.status === 'rejected' && p.rejectionReason && (
                  <p className="mt-0.5 text-[11px] text-rose-600">Motif : {p.rejectionReason}</p>
                )}
              </div>

              {p.status === 'proposed' ? (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => void act(p.id, 'approve')}
                    disabled={busyId === p.id}
                    className="inline-flex items-center gap-1 rounded-pill border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                  >
                    {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Valider
                  </button>
                  <button
                    onClick={() => void act(p.id, 'reject')}
                    disabled={busyId === p.id}
                    className="inline-flex items-center gap-1 rounded-pill border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Rejeter
                  </button>
                </div>
              ) : (
                <span
                  className={`shrink-0 inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-medium ${
                    p.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {p.status === 'approved' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {p.status === 'approved' ? 'Validée' : 'Rejetée'}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
