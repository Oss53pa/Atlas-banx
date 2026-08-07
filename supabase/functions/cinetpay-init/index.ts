// ============================================================================
// Edge Function — cinetpay-init (initiation de paiement, clés côté serveur)
// ============================================================================
// Crée une trace de paiement 'pending' puis, si les clés marchandes CinetPay
// sont configurées, initie le paiement réel et renvoie l'URL de redirection.
// Sinon → mode 'sandbox' (paiement simulé, aucun débit). Les clés ne quittent
// JAMAIS le serveur. verify_jwt=false (funnel Particulier anonyme).
//
// Secrets attendus (live) : CINETPAY_API_KEY, CINETPAY_SITE_ID,
//   CINETPAY_BASE_URL (défaut prod), CINETPAY_NOTIFY_URL (URL de cinetpay-notify).
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const API_KEY = Deno.env.get('CINETPAY_API_KEY') ?? '';
const SITE_ID = Deno.env.get('CINETPAY_SITE_ID') ?? '';
const BASE_URL = Deno.env.get('CINETPAY_BASE_URL') ?? 'https://api-checkout.cinetpay.com/v2';
const NOTIFY_URL = Deno.env.get('CINETPAY_NOTIFY_URL') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
}

async function insertPending(row: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/express_payments`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'atlasbanx',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(row),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'JSON invalide' }, 400); }

  const reference: string = body.reference;
  const amount: number = body.amount;
  const currency: string = body.currency ?? 'XOF';
  if (!reference || !amount) return json({ error: 'reference et amount requis' }, 400);

  // ── Garde-fous serveur sur le montant (funnel anonyme : on ne fait pas
  // confiance au client) ────────────────────────────────────────────────────
  // NB : le paywall express reste client-side par ARCHITECTURE (l'audit et le
  // rapport sont générés dans le navigateur) → ces bornes empêchent les valeurs
  // aberrantes / une surfacturation par client trafiqué, pas la sous-facturation
  // (qui exigerait un recalcul de l'audit côté serveur — chantier séparé).
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return json({ error: 'montant invalide' }, 400);
  }
  if (!['XOF', 'XAF'].includes(currency)) {
    return json({ error: 'devise non supportée' }, 400);
  }
  // Prix de référence des plans (miroir de src/billing/auditPlans.ts). Le prix
  // effectif est indexé (≤ prix du plan) → on borne au plafond du plan.
  const PLAN_PRICE_FCFA: Record<string, number> = { '3m': 15000, '6m': 25000, '12m': 40000 };
  const planCeiling = body.planId && PLAN_PRICE_FCFA[body.planId] ? PLAN_PRICE_FCFA[body.planId] : 5_000_000;
  if (amount > planCeiling) {
    return json({ error: 'montant supérieur au plafond du plan' }, 400);
  }

  await insertPending({
    reference,
    amount,
    currency,
    provider: 'cinetpay',
    status: 'pending',
    plan_id: body.planId ?? null,
    months_audited: body.months ?? null,
    customer_email: body.customerEmail ?? null,
    customer_phone: body.customerPhone ?? null,
  });

  // Pas de clés → sandbox (simulé).
  if (!API_KEY || !SITE_ID) {
    return json({ mode: 'sandbox', reference, transactionId: `sandbox-${reference}`, redirectUrl: null, status: 'pending' });
  }

  // Live — création du paiement CinetPay.
  const res = await fetch(`${BASE_URL}/payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: API_KEY,
      site_id: SITE_ID,
      transaction_id: reference,
      amount,
      currency,
      description: body.description ?? 'Audit express AtlasBanx',
      notify_url: NOTIFY_URL,
      customer_email: body.customerEmail,
      customer_phone_number: body.customerPhone,
      channels: 'ALL',
    }),
  });
  const data = await res.json();
  if (data?.code !== '201' || !data?.data?.payment_url) {
    return json({ error: `CinetPay: ${data?.message ?? 'échec création'}` }, 502);
  }
  return json({ mode: 'live', reference, transactionId: reference, redirectUrl: data.data.payment_url, status: 'pending' });
});
