// ============================================================================
// ATLASBANX — Rendu HTML du rapport d'audit COMPLET (funnel particulier)
// ============================================================================
// Rend le résultat de l'audit complet (AnalysisService) en HTML autonome,
// téléchargeable. Même contenu que l'audit Entreprise/Cabinet.
// ============================================================================

import { ANOMALY_TYPE_LABELS, type AnalysisResult } from '../../types';

export interface AuditReportMeta {
  periodStart: Date | null;
  periodEnd: Date | null;
  months: number;
  planLabel: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}
function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '—';
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
}

export function auditReportToHtml(result: AnalysisResult, meta: AuditReportMeta): string {
  const anomalyRows = result.anomalies
    .map(
      (a) =>
        `<tr><td>${esc(ANOMALY_TYPE_LABELS[a.type] ?? a.type)}</td>` +
        `<td>${esc(a.severity)}</td>` +
        `<td style="text-align:right">${fmt(a.amount)}</td>` +
        `<td>${esc(a.description ?? a.recommendation ?? '')}</td></tr>`,
    )
    .join('');

  const findings = (result.summary?.keyFindings ?? [])
    .map((f) => `<li>${esc(f)}</li>`)
    .join('');
  const recos = (result.summary?.recommendations ?? [])
    .map((r) => `<li>${esc(r)}</li>`)
    .join('');

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Rapport d'audit bancaire — AtlasBanx</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;color:#1a1a2e;padding:0 1rem}
h1{font-size:1.5rem}h2{font-size:1.1rem;margin-top:1.8rem}
table{width:100%;border-collapse:collapse;margin-top:.5rem}
td,th{border-bottom:1px solid #eee;padding:.45rem .3rem;font-size:.85rem;text-align:left;vertical-align:top}
.kpi{display:flex;gap:1rem;flex-wrap:wrap;margin:1rem 0}
.kpi div{flex:1;min-width:130px;background:#f7f7fb;border-radius:8px;padding:.8rem}
.kpi b{display:block;font-size:1.25rem}
.badge{display:inline-block;padding:.15rem .6rem;border-radius:999px;font-size:.8rem;font-weight:600}
.OK{background:#e7f6ec;color:#137a3e}.WARNING{background:#fff4e0;color:#a86400}.CRITICAL{background:#fde8e8;color:#b42318}
ul{padding-left:1.1rem}</style></head><body>
<h1>Rapport d'audit bancaire — AtlasBanx</h1>
<p>Période auditée : <b>${fmtDate(meta.periodStart)} → ${fmtDate(meta.periodEnd)}</b>
(${meta.months} mois · forfait ${esc(meta.planLabel)})</p>
<p>Synthèse : <span class="badge ${result.summary?.status ?? 'OK'}">${result.summary?.status ?? 'OK'}</span>
&nbsp;${esc(result.summary?.message ?? '')}</p>
<div class="kpi">
<div>Transactions<b>${result.statistics.totalTransactions}</b></div>
<div>Anomalies<b>${result.statistics.totalAnomalies}</b></div>
<div>Montant récupérable (FCFA)<b>${fmt(result.statistics.totalAnomalyAmount)}</b></div>
</div>
${findings ? `<h2>Constats clés</h2><ul>${findings}</ul>` : ''}
<h2>Anomalies détectées</h2>
<table><thead><tr><th>Type</th><th>Gravité</th><th style="text-align:right">Montant</th><th>Détail</th></tr></thead>
<tbody>${anomalyRows || '<tr><td colspan="4">Aucune anomalie détectée.</td></tr>'}</tbody></table>
${recos ? `<h2>Recommandations</h2><ul>${recos}</ul>` : ''}
<p style="color:#888;font-size:.8rem;margin-top:1.8rem">Audit généré par le moteur AtlasBanx (19 détecteurs), identique à l'offre Entreprise. Données non conservées (audit éphémère).</p>
</body></html>`;
}
