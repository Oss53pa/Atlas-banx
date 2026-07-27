// ============================================================================
// ATLASBANX — Rendu HTML du rapport d'audit COMPLET (funnel particulier)
// ============================================================================
// Rend le résultat de l'audit complet (AnalysisService) en HTML autonome,
// téléchargeable ET IMPRIMABLE : mis en page pour un A4 portrait propre
// (règles @page, couleurs conservées à l'impression, pas de coupe au milieu
// d'un bloc, en-tête de tableau répété sur chaque page). Même contenu que
// l'audit Entreprise/Cabinet.
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
  return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
}
function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
}

export function auditReportToHtml(result: AnalysisResult, meta: AuditReportMeta): string {
  const anomalyRows = result.anomalies
    .map(
      (a) =>
        `<tr><td>${esc(ANOMALY_TYPE_LABELS[a.type] ?? a.type)}</td>` +
        `<td><span class="sev sev-${esc(a.severity)}">${esc(a.severity)}</span></td>` +
        `<td class="num">${fmt(a.amount)}</td>` +
        `<td class="detail">${esc(a.description ?? a.recommendation ?? '')}</td></tr>`,
    )
    .join('');

  const findings = (result.summary?.keyFindings ?? [])
    .map((f) => `<li>${esc(f)}</li>`)
    .join('');
  const recos = (result.summary?.recommendations ?? [])
    .map((r) => `<li>${esc(r)}</li>`)
    .join('');

  const status = result.summary?.status ?? 'OK';

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Rapport d'audit bancaire — AtlasBanx</title>
<style>
  /* ---- Page A4 portrait ---- */
  @page { size: A4 portrait; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a1a2e;
    background: #eceef3;
    font-size: 11px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* Feuille A4 centrée à l'écran ; en impression elle occupe la page. */
  .sheet {
    width: 180mm;
    min-height: 267mm;
    margin: 8mm auto;
    padding: 14mm 15mm;
    background: #fff;
    box-shadow: 0 2px 18px rgba(0,0,0,.12);
  }
  h1 { font-size: 20px; margin: 0 0 2px; letter-spacing: -0.01em; }
  h2 {
    font-size: 13px; margin: 20px 0 6px; padding-bottom: 4px;
    border-bottom: 2px solid #1a1a2e; break-after: avoid;
  }
  p { margin: 4px 0; }
  .muted { color: #6b7280; }
  .brandbar { display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
    border-bottom: 3px solid #c99a3b; padding-bottom: 10px; margin-bottom: 12px; }
  .brand { font-size: 13px; font-weight: 700; color: #c99a3b; letter-spacing: .06em; text-transform: uppercase; }
  .meta { font-size: 11px; color: #374151; }
  .meta b { color: #1a1a2e; }

  /* ---- Bandeau synthèse ---- */
  .summary { display: flex; gap: 8px; align-items: center; margin: 10px 0 6px; break-inside: avoid; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
  .OK { background: #e7f6ec; color: #137a3e; }
  .WARNING { background: #fff4e0; color: #a86400; }
  .CRITICAL { background: #fde8e8; color: #b42318; }

  /* ---- KPI ---- */
  .kpi { display: flex; gap: 10px; margin: 10px 0 4px; break-inside: avoid; }
  .kpi > div { flex: 1; background: #f7f7fb; border: 1px solid #edeef4; border-radius: 8px; padding: 10px 12px; }
  .kpi .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
  .kpi b { display: block; font-size: 18px; margin-top: 2px; }
  .kpi .gold b { color: #b4801f; }
  .kpi .warn b { color: #b42318; }

  ul { padding-left: 16px; margin: 4px 0; }
  li { margin: 2px 0; break-inside: avoid; }

  /* ---- Tableau anomalies ---- */
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  thead { display: table-header-group; }            /* en-tête répété à chaque page */
  th { background: #1a1a2e; color: #fff; font-size: 10px; text-transform: uppercase; letter-spacing: .03em;
    text-align: left; padding: 6px 6px; }
  td { border-bottom: 1px solid #eceef3; padding: 5px 6px; font-size: 10.5px; vertical-align: top; }
  tr { break-inside: avoid; }
  .num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .detail { color: #374151; }
  .sev { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 9.5px; font-weight: 700; }
  .sev-CRITICAL, .sev-critical { background: #fde8e8; color: #b42318; }
  .sev-HIGH, .sev-high { background: #ffe9d6; color: #b45309; }
  .sev-MEDIUM, .sev-medium { background: #fff4e0; color: #a86400; }
  .sev-LOW, .sev-low, .sev-INFO, .sev-info { background: #eef1f6; color: #475569; }

  .foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e5e7eb; color: #9098a5; font-size: 9.5px; }

  /* ---- Bouton impression (écran uniquement) ---- */
  .toolbar { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; }
  .toolbar button {
    font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
    background: #1a1a2e; color: #fff; border: 0; border-radius: 8px; padding: 8px 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,.18);
  }
  @media print {
    body { background: #fff; font-size: 11px; }
    .sheet { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
    .toolbar { display: none !important; }
  }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
<div class="sheet">
  <div class="brandbar">
    <div>
      <div class="brand">AtlasBanx · Audit express</div>
      <h1>Rapport d'audit bancaire</h1>
    </div>
    <div class="meta" style="text-align:right">
      <div>Période&nbsp;: <b>${fmtDate(meta.periodStart)} → ${fmtDate(meta.periodEnd)}</b></div>
      <div class="muted">${meta.months} mois · forfait ${esc(meta.planLabel)}</div>
    </div>
  </div>

  <div class="summary">
    <span class="badge ${status}">${status}</span>
    <span>${esc(result.summary?.message ?? '')}</span>
  </div>

  <div class="kpi">
    <div><span class="lbl">Transactions</span><b>${result.statistics.totalTransactions}</b></div>
    <div class="${result.statistics.totalAnomalies > 0 ? 'warn' : ''}"><span class="lbl">Anomalies</span><b>${result.statistics.totalAnomalies}</b></div>
    <div class="gold"><span class="lbl">Montant récupérable (FCFA)</span><b>${fmt(result.statistics.totalAnomalyAmount)}</b></div>
  </div>

  ${findings ? `<h2>Constats clés</h2><ul>${findings}</ul>` : ''}

  <h2>Anomalies détectées</h2>
  <table>
    <thead><tr><th>Type</th><th>Gravité</th><th class="num">Montant</th><th>Détail</th></tr></thead>
    <tbody>${anomalyRows || '<tr><td colspan="4">Aucune anomalie détectée. Les frais bancaires semblent conformes.</td></tr>'}</tbody>
  </table>

  ${recos ? `<h2>Recommandations</h2><ul>${recos}</ul>` : ''}

  <div class="foot">
    Audit généré par le moteur AtlasBanx (19 détecteurs), identique à l'offre Entreprise.
    Données non conservées (audit éphémère). Document A4 — utilisez « Imprimer / Enregistrer en PDF ».
  </div>
</div>
</body></html>`;
}
