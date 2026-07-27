// ============================================================================
// Edge Function — cinetpay-status (consultation d'état de paiement)
// ============================================================================
// Le client (après redirection CinetPay) interroge l'état par référence. Lit la
// trace express_payments via service_role. verify_jwt=false (funnel anonyme).
// POST { reference } → { reference, status }
// ============================================================================

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let reference = '';
  try { reference = (await req.json()).reference ?? ''; } catch { /* ignore */ }
  if (!reference) return json({ error: 'reference requise' }, 400);

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/express_payments?reference=eq.${encodeURIComponent(reference)}&select=reference,status&limit=1`,
    { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Accept-Profile': 'atlasbanx' } },
  );
  const rows = r.ok ? await r.json() : [];
  if (!rows.length) return json({ reference, status: 'pending', found: false });
  return json({ reference, status: rows[0].status, found: true });
});
