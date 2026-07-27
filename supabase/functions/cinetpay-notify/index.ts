// ============================================================================
// Edge Function — cinetpay-notify (WEBHOOK de confirmation CinetPay)
// ============================================================================
// CinetPay appelle cette URL (notify_url) après un paiement. On RE-VÉRIFIE
// l'état auprès de CinetPay (ne jamais faire confiance au seul callback), puis
// on met à jour la trace express_payments. verify_jwt=false (appel externe).
//
// Secrets : CINETPAY_API_KEY, CINETPAY_SITE_ID, CINETPAY_BASE_URL.
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const API_KEY = Deno.env.get('CINETPAY_API_KEY') ?? '';
const SITE_ID = Deno.env.get('CINETPAY_SITE_ID') ?? '';
const BASE_URL = Deno.env.get('CINETPAY_BASE_URL') ?? 'https://api-checkout.cinetpay.com/v2';

async function updateStatus(reference: string, status: string, transactionId?: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/express_payments?reference=eq.${encodeURIComponent(reference)}`, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'atlasbanx',
    },
    body: JSON.stringify({ status, transaction_id: transactionId ?? null }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });

  // CinetPay poste en form-urlencoded (cpm_trans_id) ou JSON selon config.
  let reference = '';
  try {
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const b = await req.json();
      reference = b.cpm_trans_id ?? b.transaction_id ?? b.reference ?? '';
    } else {
      const form = await req.formData();
      reference = String(form.get('cpm_trans_id') ?? form.get('transaction_id') ?? '');
    }
  } catch { /* ignore */ }

  if (!reference) return new Response('missing transaction id', { status: 400 });

  // Re-vérification serveur → serveur auprès de CinetPay.
  if (API_KEY && SITE_ID) {
    try {
      const res = await fetch(`${BASE_URL}/payment/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apikey: API_KEY, site_id: SITE_ID, transaction_id: reference }),
      });
      const data = await res.json();
      const s = data?.data?.status;
      const status = s === 'ACCEPTED' ? 'succeeded' : s === 'REFUSED' ? 'failed' : 'pending';
      await updateStatus(reference, status);
    } catch {
      // On laisse 'pending' ; CinetPay ré-essaiera le webhook.
    }
  }

  return new Response('OK', { status: 200 });
});
