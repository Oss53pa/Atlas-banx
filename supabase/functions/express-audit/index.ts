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
import { runFullAudit, partitionByCertainty, pricingForRecovery, auditReportToHtml, l2ToBankConditions, itemsToTransactions } from '../_shared/audit-core.mjs';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Extraction SERVEUR des relevés à TEXTE NATIF : le client envoie le PDF, le
// serveur l'extrait lui-même (pdfjs texte → items → cœur pur partagé) et audite
// SA propre extraction → on ne fait plus confiance à des transactions envoyées
// par le client (« faked transactions » fermé pour le texte natif). Les scans
// (texte insuffisant) sont signalés → le client repasse à son OCR navigateur.
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// pdfjs 5.x référence `DOMMatrix` (absent du runtime Edge) même pour
// l'extraction de texte. On le polyfille une fois avant le premier import.
async function ensurePdfEnv(): Promise<void> {
  if (!(globalThis as any).DOMMatrix) {
    const m: any = await import('npm:dommatrix@1.0.3');
    (globalThis as any).DOMMatrix = m.default ?? m.DOMMatrix ?? m;
  }
}

async function extractNativeText(pdfBase64: string): Promise<{ scanned: boolean; transactions: any[] }> {
  const data = base64ToBytes(pdfBase64);
  await ensurePdfEnv();
  const pdfjs: any = await import('npm:pdfjs-dist@5.4.449/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
  const items: any[] = [];
  let totalChars = 0;
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    for (const it of tc.items) {
      const text = it && typeof it.str === 'string' ? it.str : '';
      if (!text.trim()) continue;
      const tr = it.transform || [];
      items.push({ text, page: p, x: tr[4] ?? 0, y: tr[5] ?? 0, width: it.width ?? text.length * 4, height: it.height ?? 8 });
      totalChars += text.length;
    }
  }
  // Peu de texte natif → PDF scanné : l'OCR (canvas+tesseract) n'existe pas côté
  // serveur → on signale au client de faire l'extraction navigateur.
  const avgPerPage = totalChars / Math.max(1, doc.numPages);
  if (avgPerPage < 50) return { scanned: true, transactions: [] };
  const res = itemsToTransactions(items, doc.numPages, { defaultCurrency: 'XOF', rowYTolerance: 3 });
  return { scanned: false, transactions: res.transactions ?? [] };
}

// Barème OFFICIEL récupéré CÔTÉ SERVEUR (référentiel L2), pour ne plus faire
// confiance à la grille tarifaire envoyée par le client → OVERCHARGE autoritaire.
// On réutilise l'Edge Function publique `public-bank-reference` (même source que
// le funnel), en appel serveur-à-serveur. Renvoie null si indisponible → repli.
async function fetchOfficialConditions(
  bankCode: string,
  segment: string,
  referenceDate?: string,
): Promise<unknown | null> {
  if (!bankCode) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/public-bank-reference`, {
      method: 'POST',
      headers: {
        apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ bankCode, referenceDate }),
    });
    if (!r.ok) return null;
    const ref = await r.json();
    if (!ref?.found || !Array.isArray(ref.conditions) || ref.conditions.length === 0) return null;
    return l2ToBankConditions({
      bankCode,
      bankName: ref.legalName,
      effectiveFrom: ref.effectiveFrom,
      conditions: ref.conditions,
      segment: segment === 'pme' || segment === 'corporate' ? segment : 'particulier',
    });
  } catch {
    return null;
  }
}

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
  if (!reference) return json({ error: 'reference requise' }, 400);

  // Résolution des transactions AUTORITAIRE :
  //  (1) si un PDF (base64) est fourni ET donne du TEXTE NATIF → extraction
  //      SERVEUR (le client ne peut pas falsifier les transactions auditées) ;
  //  (2) sinon (scan, échec, ou pas de PDF) → transactions envoyées par le client
  //      (extraites par son OCR navigateur pour les scans).
  const clientTx = Array.isArray(body.transactions) ? body.transactions.map(reviveTx) : [];
  let transactions: any[] = clientTx;
  let serverExtracted = false;
  if (typeof body.pdfBase64 === 'string' && body.pdfBase64.length > 0) {
    try {
      const ex = await extractNativeText(body.pdfBase64);
      if (!ex.scanned && ex.transactions.length > 0) {
        transactions = ex.transactions;   // dates déjà en objets Date (extraction serveur)
        serverExtracted = true;
      }
      // scan / 0 tx → on garde les transactions client (repli)
    } catch { /* extraction serveur best-effort → repli client (OCR navigateur) */ }
  }
  if (transactions.length === 0) return json({ error: 'transactions ou pdfBase64 requis' }, 400);

  const bankCode: string = body.bankCode ?? '';
  const segment: string = body.segment ?? 'particulier';

  // Barème SERVEUR-AUTORITAIRE : on récupère la grille officielle L2 côté serveur
  // (référentiel public), et on ne retombe sur celle fournie par le client que si
  // elle est indisponible. Le client ne contrôle donc plus la comparaison tarifaire.
  const referenceDate = body.periodEnd ? String(body.periodEnd).slice(0, 10) : undefined;
  const officialConditions = await fetchOfficialConditions(bankCode, segment, referenceDate);
  const bankConditions = officialConditions ?? body.bankConditions;
  const usedOfficialGrid = officialConditions != null;

  let result: any;
  try {
    result = await runFullAudit({
      transactions,
      bankConditions,   // barème officiel serveur (repli : client)
      bankCode,
    });
  } catch (err) {
    return json({ error: `audit échoué : ${err instanceof Error ? err.message : 'erreur'}` }, 500);
  }

  const anomalies = result?.anomalies ?? [];
  const part = partitionByCertainty(anomalies);
  const certain = part.certain ?? [];
  const uncertain = part.uncertain ?? [];
  const recoverable = certain.reduce((s: number, a: any) => s + (a.amount || 0), 0);
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
    audit_json: result ?? null,   // résultat COMPLET — livré après paiement
  });
  if (!stored.ok) {
    // Le rapport n'a pas pu être persisté → express-report ne pourra rien livrer.
    return json({ error: 'stockage du rapport échoué', detail: stored.error ?? null }, 502);
  }

  // TEASER SÛR uniquement — aucun montant par anomalie, aucune preuve ; le détail
  // actionnable (montants, anomalies complètes, lettre) sort via express-report
  // APRÈS paiement. Le client n'exécute plus l'audit lui-même.
  return json({
    reference,
    recoverableFcfa: pricing.recoverableFcfa,
    priceFcfa: pricing.priceFcfa,
    isFree: pricing.isFree,
    anomalyCount: anomalies.length,
    certainCount: certain.length,
    uncertainCount: uncertain.length,
    totalTransactions: result?.statistics?.totalTransactions ?? transactions.length,
    previewTypes: anomalies.slice(0, 4).map((a: any) => a.type),   // libellés seuls (floutés côté client)
    usedOfficialGrid,   // le serveur a-t-il utilisé le barème officiel L2 ?
    serverExtracted,    // relevé extrait CÔTÉ SERVEUR (texte natif) ?
  });
});
