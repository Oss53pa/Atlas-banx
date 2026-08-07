// ============================================================================
// Edge Function — express-audit (audit express SERVEUR-AUTORITAIRE)
// ============================================================================
// Le client envoie ses TRANSACTIONS (plus un montant). Le serveur RE-EXÉCUTE
// l'audit (moteur bundlé dans _shared/audit-core.mjs), calcule le récupérable
// et le PRIX (source autoritaire), génère le rapport détaillé et le STOCKE dans
// express_report_pending. Il ne renvoie que le TEASER (récupérable, prix,
// nombre d'anomalies) — le rapport détaillé n'est livré qu'après paiement, via
// express-report. verify_jwt=false (funnel Particulier anonyme).
//
// RÉSIDUEL v1 : le barème (bankConditions) est encore fourni par le client ;
// pour l'OVERCHARGE 100% autoritaire, le fetch du barème officiel côté serveur
// (bank_reference_conditions) est un raffinement documenté. Le PAYWALL, lui,
// est désormais serveur-enforced (le rapport ne sort qu'après paiement).
// ============================================================================

// @ts-nocheck — bundle JS pré-typé
import { runFullAudit, partitionByCertainty, pricingForRecovery, auditReportToHtml } from '../_shared/audit-core.mjs';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
}

function reviveTx(t: Record<string, unknown>) {
  return {
    ...t,
    date: t.date ? new Date(t.date as string) : new Date(),
    valueDate: t.valueDate ? new Date(t.valueDate as string) : (t.date ? new Date(t.date as string) : new Date()),
    createdAt: new Date(), updatedAt: new Date(),
  };
}

async function storePending(row: Record<string, unknown>): Promise<{ ok: boolean; status: number; error?: string }> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/express_report_pending`, {
    method: 'POST',
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json', 'Content-Profile': 'atlasbanx',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  });
  if (r.ok) return { ok: true, status: r.status };
  return { ok: false, status: r.status, error: (await r.text()).slice(0, 300) };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }

  const reference: string = body.reference;
  const rawTx = Array.isArray(body.transactions) ? body.transactions : [];
  if (!reference) return json({ error: 'reference requise' }, 400);
  if (rawTx.length === 0) return json({ error: 'transactions requises' }, 400);

  const transactions = rawTx.map(reviveTx);
  const bankCode: string = body.bankCode ?? '';

  let result: any;
  try {
    result = await runFullAudit({
      transactions,
      bankConditions: body.bankConditions,   // barème fourni par le client (v1)
      bankCode,
    });
  } catch (err) {
    return json({ error: `audit échoué : ${err instanceof Error ? err.message : 'erreur'}` }, 500);
  }

  const anomalies = result?.anomalies ?? [];
  const part = partitionByCertainty(anomalies);
  const recoverable = (part.certain ?? []).reduce((s: number, a: any) => s + (a.amount || 0), 0);
  const pricing = pricingForRecovery(recoverable);

  // Rapport détaillé (généré SERVEUR) — stocké, jamais renvoyé ici.
  let reportHtml = '';
  try {
    reportHtml = auditReportToHtml(result, {
      periodStart: body.periodStart ? new Date(body.periodStart) : new Date(),
      periodEnd: body.periodEnd ? new Date(body.periodEnd) : new Date(),
      months: Number(body.months) || 0,
      planLabel: pricing.isFree ? 'Rapport offert' : `Rapport débloqué (${pricing.priceFcfa} FCFA)`,
    });
  } catch { /* rapport HTML best-effort */ }

  const stored = await storePending({
    reference,
    bank_code: bankCode || null,
    recoverable_fcfa: pricing.recoverableFcfa,
    price_fcfa: pricing.priceFcfa,
    is_free: pricing.isFree,
    anomaly_count: anomalies.length,
    report_html: reportHtml || null,
  });
  if (!stored.ok) {
    // Le rapport n'a pas pu être persisté → express-report ne pourra rien livrer.
    return json({ error: 'stockage du rapport échoué', detail: stored.error ?? null }, 502);
  }

  // TEASER uniquement — le détail sort via express-report après paiement.
  return json({
    reference,
    recoverableFcfa: pricing.recoverableFcfa,
    priceFcfa: pricing.priceFcfa,
    isFree: pricing.isFree,
    anomalyCount: anomalies.length,
  });
});
