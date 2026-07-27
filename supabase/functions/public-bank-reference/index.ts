// ============================================================================
// Edge Function — public-bank-reference (lecture L2 publique)
// ============================================================================
// Renvoie les conditions de référence PUBLIÉES (L2) d'une banque pour une date
// donnée, SANS authentification. Ce sont les grilles tarifaires publiques des
// banques : leur exposition anonyme est légitime et permet au funnel Particulier
// (sans compte) de comparer un relevé au barème officiel.
//
// Lecture via service_role (contourne la RLS ; L2 est public par nature).
// POST/GET { bankCode, referenceDate? } → { bankCode, versionLabel, effectiveFrom, conditions[] }
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', ...CORS } });
}

async function rest(path: string): Promise<any[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Accept-Profile': 'atlasbanx',
    },
  });
  if (!r.ok) return [];
  return await r.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  let bankCode = url.searchParams.get('bankCode') ?? '';
  let referenceDate = url.searchParams.get('referenceDate') ?? '';
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      bankCode = body.bankCode ?? bankCode;
      referenceDate = body.referenceDate ?? referenceDate;
    } catch { /* ignore */ }
  }
  if (!bankCode) return json({ error: 'bankCode requis' }, 400);
  const day = (referenceDate || new Date().toISOString().slice(0, 10)).slice(0, 10);

  const banks = await rest(`cdc_banks?code=eq.${encodeURIComponent(bankCode)}&select=id,legal_name&limit=1`);
  if (banks.length === 0) return json({ bankCode, found: false, conditions: [] });
  const bankId = banks[0].id;

  const versions = await rest(
    `bank_reference_versions?bank_id=eq.${bankId}&validation_status=eq.published&superseded_by=is.null` +
    `&effective_from=lte.${day}&order=effective_from.desc&limit=1`,
  );
  const version = versions.find((v: any) => !v.effective_to || v.effective_to > day);
  if (!version) return json({ bankCode, found: true, versionLabel: null, conditions: [] });

  const conditions = await rest(
    `bank_reference_conditions?reference_version_id=eq.${version.id}&select=rubric_code,value_numeric,dimensions`,
  );

  return json({
    bankCode,
    found: true,
    legalName: banks[0].legal_name,
    versionLabel: version.version_label,
    effectiveFrom: version.effective_from,
    conditions,
  });
});
