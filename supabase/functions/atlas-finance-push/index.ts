// ============================================================================
// Edge Function — atlas-finance-push
// ============================================================================
// Pousse un écart de rapprochement (SYSCOHADA compte 521) vers l'API Atlas
// Finance pour prise en charge (création d'un ticket de redressement).
//
// Flow :
//   1. Authentifie l'utilisateur via son JWT Supabase
//   2. Valide le payload { statementId, discrepancy }
//   3. Si ATLAS_FINANCE_API_URL est configuré → POST vers Atlas Finance,
//      récupère la référence de suivi externe
//   4. Sinon → dégrade proprement en générant une référence locale
//      (déterministe à partir de l'écart) pour ne pas bloquer le workflow
//   5. Trace l'événement dans atlasbanx.audit_trail (best-effort)
//
// Variables d'environnement :
//   - ATLAS_FINANCE_API_URL   (ex: https://api.atlas-finance.org/v1/discrepancies)
//   - ATLAS_FINANCE_API_KEY   (Bearer token)
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ATLAS_FINANCE_API_URL = Deno.env.get('ATLAS_FINANCE_API_URL') ?? '';
const ATLAS_FINANCE_API_KEY = Deno.env.get('ATLAS_FINANCE_API_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function authUser(req: Request): Promise<{ id: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: SUPABASE_ANON_KEY },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id ? { id: u.id } : null;
}

interface ProposedJournalLine {
  accountCode: string;
  accountLabel: string;
  debitCentimes: number;
  creditCentimes: number;
}

interface Discrepancy {
  id: string;
  kind: string;
  bankTxId?: string | null;
  ledgerEntryId?: string | null;
  gapCentimes: number;
  description: string;
  proposedJournal?: ProposedJournalLine[];
}

interface PushRequest {
  statementId: string;
  discrepancy: Discrepancy;
}

/** Référence locale déterministe quand Atlas Finance n'est pas configuré. */
async function localTrackingRef(statementId: string, discrepancyId: string): Promise<string> {
  const enc = new TextEncoder().encode(`${statementId}:${discrepancyId}`);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `LOCAL-${hex.slice(0, 12).toUpperCase()}`;
}

/** Trace best-effort dans l'audit trail (n'échoue jamais le flux principal). */
async function traceAudit(userId: string, statementId: string, ref: string, forwarded: boolean): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/audit_trail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Profile': 'atlasbanx',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        action: 'reconciliation.discrepancy.pushed',
        entity_type: 'bank_statement',
        entity_id: statementId,
        metadata: { tracking_ref: ref, forwarded },
      }),
    });
  } catch (_) {
    // silencieux
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Méthode non autorisée' }, 405);
  }

  const user = await authUser(req);
  if (!user) {
    return json({ error: 'Non authentifié' }, 401);
  }

  let payload: PushRequest;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'JSON invalide' }, 400);
  }

  const { statementId, discrepancy } = payload;
  if (!statementId || !discrepancy?.id) {
    return json({ error: 'statementId et discrepancy.id requis' }, 400);
  }

  // 1. Atlas Finance configuré → on forwarde
  if (ATLAS_FINANCE_API_URL && ATLAS_FINANCE_API_KEY) {
    try {
      const res = await fetch(ATLAS_FINANCE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ATLAS_FINANCE_API_KEY}`,
        },
        body: JSON.stringify({
          source: 'atlasbanx',
          statement_id: statementId,
          discrepancy_id: discrepancy.id,
          kind: discrepancy.kind,
          gap_centimes: discrepancy.gapCentimes,
          description: discrepancy.description,
          proposed_journal: discrepancy.proposedJournal ?? [],
          submitted_by: user.id,
        }),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => res.statusText);
        return json({ error: `Atlas Finance a répondu ${res.status}: ${detail}` }, 502);
      }

      const data = await res.json().catch(() => ({}));
      const trackingRef = data?.tracking_ref ?? data?.id ?? `ATLAS-${discrepancy.id}`;
      await traceAudit(user.id, statementId, trackingRef, true);
      return json({ trackingRef, forwarded: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      return json({ error: `Échec de contact Atlas Finance: ${message}` }, 502);
    }
  }

  // 2. Non configuré → dégradation propre avec référence locale
  const trackingRef = await localTrackingRef(statementId, discrepancy.id);
  await traceAudit(user.id, statementId, trackingRef, false);
  return json({
    trackingRef,
    forwarded: false,
    notice: "Atlas Finance non configuré (ATLAS_FINANCE_API_URL) — écart enregistré localement.",
  });
});
