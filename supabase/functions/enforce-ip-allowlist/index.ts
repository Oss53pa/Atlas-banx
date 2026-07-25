// ============================================================================
// AtlasBanx — Edge Function: enforce-ip-allowlist
// ----------------------------------------------------------------------------
// Enforces per-user IP allowlists stored in `atlasbanx.ip_allowlists`.
//
// TWO CALL MODES (both supported by this single endpoint):
//
//   1. Supabase Auth Hook mode (server-to-server)
//      Registered as an HTTP Auth Hook. Supabase POSTs a JSON payload
//      describing the sign-in attempt. On ALLOW we echo the input decision
//      back unchanged (HTTP 200, `{}`-shaped success). On DENY we return an
//      error decision object (HTTP 200 with `{ error: { ... } }`) so the auth
//      layer rejects the sign-in.
//
//   2. Direct-call mode (e.g. an app-side pre-flight check)
//      Returns `{ allowed: boolean, reason?: string }` with HTTP 200 for
//      allow and HTTP 403 for deny.
//
// The payload shape of Supabase auth hooks varies across platform versions,
// so parsing is deliberately DEFENSIVE:
//   - client IP  ← payload.ip | payload.client_ip | `x-forwarded-for` header
//   - user id    ← payload.user_id | payload.user.id | payload.claims.sub
//
// ----------------------------------------------------------------------------
// Decision flow
// ----------------------------------------------------------------------------
//   1. Resolve (userId, clientIp). If EITHER is unknown → FAIL OPEN (allow).
//   2. Load atlasbanx.ip_allowlists WHERE user_id = <uid> AND active = true
//      via the SERVICE ROLE key (direct PostgREST fetch, Accept-Profile).
//   3. Empty set → ALLOW (no restriction configured).
//   4. Non-empty → clientIp must be contained in ANY active CIDR range.
//        - Contained → ALLOW.
//        - Not contained → DENY. Best-effort audit_trail insert
//          (action 'ip_denied', event SUSPICIOUS_ACTIVITY_DETECTED), then deny.
//
// IPv4 CIDR containment is computed exactly (masked 32-bit integer compare).
// A bare IP is treated as /32. IPv6 addresses / ranges that cannot be safely
// parsed FAIL OPEN for that entry (never deny on a parse failure).
//
// ----------------------------------------------------------------------------
// CRITICAL SAFETY GUARANTEE — FAIL OPEN
// ----------------------------------------------------------------------------
// The entire handler is wrapped so that ANY unexpected error (bad payload,
// DB unreachable, logic bug, …) resolves to ALLOW and is logged to console.
// A bug in this function must NEVER lock every user out of the product.
//
// ----------------------------------------------------------------------------
// ACTIVATION (must be done in the Supabase dashboard — and TESTED):
// ----------------------------------------------------------------------------
//   1. Deploy this function:  `supabase functions deploy enforce-ip-allowlist`
//   2. Supabase dashboard → Authentication → Hooks
//   3. Enable the relevant hook (e.g. the HTTP "before sign-in" / send-http
//      hook) and point its URL at this function's deployed endpoint.
//   4. TEST CAREFULLY with a throwaway account and a known-bad IP before
//      relying on it — enforcement affects live sign-ins.
// Until the hook is enabled in the dashboard, this endpoint is inert (it is
// simply never called by the auth layer); direct-call mode still works.
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ----------------------------------------------------------------------------
// Response helpers
// ----------------------------------------------------------------------------

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

/** ALLOW response — valid for both the auth-hook contract and direct calls. */
function allow(reason?: string): Response {
  // Auth hooks treat an empty/echoed object as "no objection". Direct callers
  // read `allowed`. Returning both keys satisfies both contracts.
  return json({ allowed: true, reason }, 200);
}

/** DENY response. HTTP 403 for direct callers; `error` object for auth hooks. */
function deny(reason: string): Response {
  return json(
    {
      allowed: false,
      reason,
      error: {
        http_code: 403,
        message: reason,
      },
    },
    403,
  );
}

// ----------------------------------------------------------------------------
// Defensive payload parsing
// ----------------------------------------------------------------------------

function extractUserId(payload: Record<string, unknown>): string | null {
  const direct = payload['user_id'];
  if (typeof direct === 'string' && direct) return direct;

  const user = payload['user'];
  if (user && typeof user === 'object') {
    const id = (user as Record<string, unknown>)['id'];
    if (typeof id === 'string' && id) return id;
  }

  const claims = payload['claims'];
  if (claims && typeof claims === 'object') {
    const sub = (claims as Record<string, unknown>)['sub'];
    if (typeof sub === 'string' && sub) return sub;
  }

  return null;
}

function extractIp(payload: Record<string, unknown>, req: Request): string | null {
  const candidates = [payload['ip'], payload['client_ip']];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim();
  }

  // x-forwarded-for may be a comma-separated list; the client is the first entry.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  return null;
}

// ----------------------------------------------------------------------------
// IPv4 CIDR containment
// ----------------------------------------------------------------------------
// Returns:
//   true  → the IP is inside the range
//   false → the IP is definitively outside the range
//   null  → could not safely evaluate (IPv6 / unparseable) → caller FAILS OPEN
// ----------------------------------------------------------------------------

function isIpv6(s: string): boolean {
  return s.includes(':');
}

/** Parse a dotted-quad IPv4 string into an unsigned 32-bit integer, or null. */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return null;
  let acc = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n < 0 || n > 255) return null;
    acc = acc * 256 + n;
  }
  // Force unsigned 32-bit.
  return acc >>> 0;
}

/**
 * Test whether `ip` is contained within `cidr`.
 * `cidr` may be "a.b.c.d/nn" or a bare "a.b.c.d" (treated as /32).
 * Returns null when the pair involves IPv6 or cannot be parsed.
 */
function ipv4InCidr(ip: string, cidr: string): boolean | null {
  if (isIpv6(ip) || isIpv6(cidr)) return null; // IPv6 → fail open for this entry

  const raw = cidr.trim();
  const slash = raw.indexOf('/');
  const rangeIp = slash === -1 ? raw : raw.slice(0, slash);
  const prefixStr = slash === -1 ? '32' : raw.slice(slash + 1);

  const prefix = Number(prefixStr);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;

  const ipInt = ipv4ToInt(ip);
  const rangeInt = ipv4ToInt(rangeIp);
  if (ipInt === null || rangeInt === null) return null;

  // /0 matches everything; avoid the undefined behaviour of a 32-bit shift by 32.
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (rangeInt & mask);
}

// ----------------------------------------------------------------------------
// Data access (service role)
// ----------------------------------------------------------------------------

interface AllowlistRow {
  cidr: string;
}

async function loadActiveAllowlist(userId: string): Promise<AllowlistRow[]> {
  const url =
    `${SUPABASE_URL}/rest/v1/ip_allowlists` +
    `?user_id=eq.${encodeURIComponent(userId)}&active=eq.true&select=cidr`;

  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Accept-Profile': 'atlasbanx',
    },
  });
  if (!r.ok) {
    // Treat an unreadable table as "no data we can act on" → caller fails open.
    throw new Error(`ip_allowlists fetch failed: ${r.status}`);
  }
  const rows = await r.json();
  return Array.isArray(rows) ? (rows as AllowlistRow[]) : [];
}

/** Best-effort audit row on a deny. Never throws. */
async function auditDeny(userId: string, ip: string, tried: string[]): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/audit_trail`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Content-Profile': 'atlasbanx',
      },
      body: JSON.stringify({
        event_id: crypto.randomUUID(),
        user_id: userId,
        event_type: 'SUSPICIOUS_ACTIVITY_DETECTED',
        resource_type: 'auth',
        action: 'ip_denied',
        // integrity_hash is computed server-side by the BEFORE INSERT trigger.
        ip_address: ip,
        payload: {
          reason: 'ip_not_in_allowlist',
          client_ip: ip,
          active_ranges: tried,
        },
      }),
    });
  } catch (err) {
    console.warn('[enforce-ip-allowlist] audit insert failed (non-fatal)', err);
  }
}

// ----------------------------------------------------------------------------
// Core decision (may throw — the outer handler converts throws to ALLOW)
// ----------------------------------------------------------------------------

async function decide(req: Request): Promise<Response> {
  let payload: Record<string, unknown> = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>;
  } catch {
    // No/invalid body — parse from headers only; ambiguity → fail open below.
  }

  const userId = extractUserId(payload);
  const clientIp = extractIp(payload, req);

  // Ambiguity guard: never lock out on missing identity or IP.
  if (!userId || !clientIp) {
    console.warn(
      `[enforce-ip-allowlist] FAIL OPEN — could not resolve ${!userId ? 'user' : ''}${
        !userId && !clientIp ? ' and ' : ''
      }${!clientIp ? 'ip' : ''}`,
    );
    return allow('indeterminate_identity_or_ip');
  }

  const rows = await loadActiveAllowlist(userId);

  // No restriction configured → allow.
  if (rows.length === 0) return allow('no_allowlist_configured');

  const ranges = rows.map((r) => r.cidr).filter((c): c is string => typeof c === 'string' && !!c);
  if (ranges.length === 0) return allow('no_allowlist_configured');

  let anyContained = false;
  for (const range of ranges) {
    const result = ipv4InCidr(clientIp, range);
    if (result === true) {
      anyContained = true;
      break;
    }
    // result === null → could not evaluate this entry (IPv6/unparseable):
    // fail open for THIS entry by treating it as a match, per the safety spec.
    if (result === null) {
      console.warn(
        `[enforce-ip-allowlist] FAIL OPEN for unparseable entry ip=${clientIp} range=${range}`,
      );
      anyContained = true;
      break;
    }
  }

  if (anyContained) return allow('ip_in_allowlist');

  // Definitively outside every parseable range → deny (best-effort audit).
  await auditDeny(userId, clientIp, ranges);
  return deny('ip_not_in_allowlist');
}

// ----------------------------------------------------------------------------
// Handler — outermost fail-open wrapper
// ----------------------------------------------------------------------------

async function handle(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  try {
    return await decide(req);
  } catch (err) {
    // ANY unexpected failure must NOT lock users out.
    console.error('[enforce-ip-allowlist] FAIL OPEN due to unexpected error', err);
    return allow('internal_error_fail_open');
  }
}

Deno.serve(handle);
