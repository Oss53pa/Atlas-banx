// ============================================================================
// ATLASBANX — Rapport d'audit express (funnel Particulier, éphémère)
// ============================================================================
// Construit un rapport détaillé à partir des transactions extraites d'un relevé,
// sans compte ni stockage durable. Réutilise le comptage de périodes et les
// forfaits. Volontairement autonome (pur) pour être testable et exportable.
// ============================================================================

import { countAuditedMonths, planForMonths, type AuditPlan } from '../auditPlans';

export interface ExpressTxn {
  date?: Date;
  description: string;
  /** Signé : positif = crédit, négatif = débit. */
  amount: number;
}

export interface ExpressReport {
  periodStart: Date | null;
  periodEnd: Date | null;
  monthsAudited: number;
  plan: AuditPlan | null;
  txCount: number;
  totalDebit: number;
  totalCredit: number;
  feesTotal: number;
  feeLines: ExpressTxn[];
}

// Lignes assimilables à des frais bancaires (heuristique de repérage).
const FEE_RE = /frais|commission|agios|tenue|abonnement|cotisation|t[ée]l[ée]paiement/i;

export function buildExpressReport(txns: readonly ExpressTxn[]): ExpressReport {
  const dated = txns.filter((t) => t.date instanceof Date && !Number.isNaN(t.date.getTime()));
  const times = dated.map((t) => (t.date as Date).getTime());
  const periodStart = times.length ? new Date(Math.min(...times)) : null;
  const periodEnd = times.length ? new Date(Math.max(...times)) : null;
  const monthsAudited =
    periodStart && periodEnd ? countAuditedMonths([{ start: periodStart, end: periodEnd }]) : 0;

  let totalDebit = 0;
  let totalCredit = 0;
  let feesTotal = 0;
  const feeLines: ExpressTxn[] = [];
  for (const t of txns) {
    if (t.amount < 0) totalDebit += -t.amount;
    else totalCredit += t.amount;
    if (t.amount < 0 && FEE_RE.test(t.description)) {
      feesTotal += -t.amount;
      feeLines.push(t);
    }
  }

  return {
    periodStart,
    periodEnd,
    monthsAudited,
    plan: planForMonths(monthsAudited),
    txCount: txns.length,
    totalDebit,
    totalCredit,
    feesTotal,
    feeLines,
  };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}
function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '—';
}

/** Rend le rapport en HTML autonome (pour téléchargement / impression). */
export function reportToHtml(r: ExpressReport): string {
  const rows = r.feeLines
    .map(
      (f) =>
        `<tr><td>${fmtDate(f.date ?? null)}</td><td>${escapeHtml(f.description)}</td>` +
        `<td style="text-align:right">${fmt(-f.amount)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport d'audit express — AtlasBanx</title>
<style>body{font-family:system-ui,sans-serif;max-width:720px;margin:2rem auto;color:#1a1a2e}
h1{font-size:1.4rem}table{width:100%;border-collapse:collapse;margin-top:.5rem}
td,th{border-bottom:1px solid #eee;padding:.4rem .3rem;font-size:.9rem;text-align:left}
.kpi{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0}
.kpi div{flex:1;min-width:120px;background:#f7f7fb;border-radius:8px;padding:.8rem}
.kpi b{display:block;font-size:1.2rem}</style></head><body>
<h1>Rapport d'audit express — AtlasBanx</h1>
<p>Période auditée : <b>${fmtDate(r.periodStart)} → ${fmtDate(r.periodEnd)}</b>
(${r.monthsAudited} mois · forfait ${r.plan?.label ?? 'sur mesure'})</p>
<div class="kpi">
<div>Transactions<b>${r.txCount}</b></div>
<div>Total débits (FCFA)<b>${fmt(r.totalDebit)}</b></div>
<div>Total crédits (FCFA)<b>${fmt(r.totalCredit)}</b></div>
<div>Frais repérés (FCFA)<b>${fmt(r.feesTotal)}</b></div>
</div>
<h2 style="font-size:1.1rem">Frais et commissions repérés</h2>
<table><thead><tr><th>Date</th><th>Libellé</th><th style="text-align:right">Montant</th></tr></thead>
<tbody>${rows || '<tr><td colspan="3">Aucun frais repéré.</td></tr>'}</tbody></table>
<p style="color:#888;font-size:.8rem;margin-top:1.5rem">Rapport généré localement, sans conservation de vos données (audit éphémère).</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
}
