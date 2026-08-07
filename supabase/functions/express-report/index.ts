// ============================================================================
// Edge Function — express-report (livraison du rapport APRÈS paiement)
// ============================================================================
// Renvoie le rapport détaillé (calculé et stocké par express-audit) UNIQUEMENT
// si le paiement associé est confirmé ('succeeded') OU si le rapport est
// gratuit (récupérable sous le seuil). C'est CE gate serveur qui rend le
// paywall express réellement enforced (le rapport n'existe plus côté client).
// verify_jwt=false (funnel Particulier anonyme). POST { reference }.
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

async function sel(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Accept-Profile': 'atlasbanx' },
  });
  return r.ok ? await r.json() : [];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let reference = '';
  try { reference = (await req.json()).reference ?? ''; } catch { /* ignore */ }
  if (!reference) return json({ error: 'reference requise' }, 400);

  const rows = await sel(`express_report_pending?reference=eq.${encodeURIComponent(reference)}&select=report_html,is_free,recoverable_fcfa,price_fcfa&limit=1`);
  if (!rows.length) return json({ error: 'rapport introuvable' }, 404);
  const rep = rows[0];

  // Gate : gratuit OU paiement confirmé.
  let paid = Boolean(rep.is_free);
  if (!paid) {
    const pay = await sel(`express_payments?reference=eq.${encodeURIComponent(reference)}&select=status&limit=1`);
    paid = pay.length > 0 && pay[0].status === 'succeeded';
  }
  if (!paid) return json({ error: 'paiement non confirmé', paid: false }, 402);

  return json({ reference, paid: true, reportHtml: rep.report_html ?? '' });
});
