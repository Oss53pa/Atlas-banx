// ============================================================================
// Tests — intégration Atlas Studio « Proph3t core » (src/lib/proph3t.ts)
// ============================================================================
// Couvre le client fédéré vendoré (transport, mapping, erreurs) et le mode B
// hébergé askProph3t (sensibilité confidential, JWT, dégradation gracieuse).
// ============================================================================

import { describe, it, expect, vi, afterEach } from 'vitest';
import { Proph3tClient, Proph3tError } from '../../lib/proph3t/sdk';
import type { KnowledgeHit } from '../../lib/proph3t/sdk';

// ----------------------------------------------------------------------------
// A. Client fédéré vendoré (mode A) — transport pur, fetch injecté
// ----------------------------------------------------------------------------

function makeFetchMock(payload: unknown, ok = true, status = 200) {
  return vi.fn(async (_input?: RequestInfo | URL, _init?: RequestInit) =>
    new Response(JSON.stringify(payload), {
      status: ok ? status : status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('Proph3tClient (vendored SDK)', () => {
  const baseOpts = {
    product: 'atlasbanx' as const,
    supabaseUrl: 'https://core.test',
    apiKey: 'anon-key',
    userToken: 'jwt-user',
    societyId: 'soc-1',
  };

  it('runTool POSTs to proph3t-tool-direct with auth + scoped args', async () => {
    const fetchImpl = makeFetchMock({ ok: true, tool: 'compute_x', duration_ms: 3, result: { v: 42 } });
    const client = new Proph3tClient({ ...baseOpts, fetchImpl });

    const r = await client.runTool({ name: 'compute_x', args: { a: 1 } });

    expect(r.result).toEqual({ v: 42 });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://core.test/functions/v1/proph3t-tool-direct');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-user');
    expect(headers.apikey).toBe('anon-key');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.tool_name).toBe('compute_x');
    expect(body.args).toMatchObject({ a: 1, app_id: 'atlasbanx', society_id: 'soc-1' });
  });

  it('falls back to apiKey when no userToken (public endpoints only)', async () => {
    const fetchImpl = makeFetchMock({ ok: true, tool: 't', duration_ms: 1, result: null });
    const client = new Proph3tClient({ ...baseOpts, userToken: undefined, fetchImpl });
    await client.runTool({ name: 't', args: {} });
    const headers = (fetchImpl.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer anon-key');
  });

  it('searchKnowledge unwraps + maps hits', async () => {
    const hits: KnowledgeHit[] = [
      { id: '1', source_type: 'syscohada', title: 'Art. 35', excerpt: 'texte', citation: 'SYSCOHADA art.35', score: 0.9 },
    ];
    const fetchImpl = makeFetchMock({ ok: true, tool: 'search_app_knowledge', duration_ms: 5, result: { hits } });
    const client = new Proph3tClient({ ...baseOpts, fetchImpl });
    const out = await client.searchKnowledge({ query: 'amortissement', sourceType: 'syscohada' });
    expect(out).toHaveLength(1);
    expect(out[0].citation).toBe('SYSCOHADA art.35');
  });

  it('logAudit posts audit_trail_write', async () => {
    const fetchImpl = makeFetchMock({ ok: true, tool: 'audit_trail_write', duration_ms: 2, result: { id: 'a1', hash: 'h' } });
    const client = new Proph3tClient({ ...baseOpts, fetchImpl });
    const entry = await client.logAudit({ action: 'prophet_query', content: { q: 'x' } });
    expect(entry.hash).toBe('h');
    const body = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(body.tool_name).toBe('audit_trail_write');
    expect(body.args.action).toBe('prophet_query');
  });

  it('throws Proph3tError on non-ok response', async () => {
    const fetchImpl = makeFetchMock({ error: 'boom' }, false, 500);
    const client = new Proph3tClient({ ...baseOpts, fetchImpl });
    await expect(client.runTool({ name: 't', args: {} })).rejects.toBeInstanceOf(Proph3tError);
  });
});

// ----------------------------------------------------------------------------
// B. Mode B hébergé — askProph3t / isAtlasCoreConfigured (env lue au load)
// ----------------------------------------------------------------------------

describe('askProph3t (hosted mode B)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function importWithEnv(env: Record<string, string | undefined>) {
    vi.resetModules();
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) continue;
      vi.stubEnv(k, v);
    }
    // Supabase mock → JWT de session de l'app. isSupabaseConfigured dérive de
    // l'env stubbé pour piloter le repli VITE_ATLAS_* → VITE_SUPABASE_*.
    vi.doMock('../../lib/supabase', () => ({
      getSupabaseClient: () => ({
        auth: { getSession: async () => ({ data: { session: { access_token: 'jwt-app' } } }) },
      }),
      isSupabaseConfigured: () =>
        Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    }));
    return import('../../lib/proph3t');
  }

  it('isAtlasCoreConfigured reflects env presence', async () => {
    const mod = await importWithEnv({
      VITE_ATLAS_SUPABASE_URL: 'https://core.test',
      VITE_ATLAS_SUPABASE_ANON_KEY: 'anon',
    });
    expect(mod.isAtlasCoreConfigured()).toBe(true);
  });

  it('sends confidential sensitivity + app JWT to proph3t-ask', async () => {
    const fetchMock = vi.fn(async (_input?: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ conversation_id: 'c1', answer: 'ok', citations: [], confidence: 0.8 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mod = await importWithEnv({
      VITE_ATLAS_SUPABASE_URL: 'https://core.test',
      VITE_ATLAS_SUPABASE_ANON_KEY: 'anon',
    });

    const r = await mod.askProph3t({ message: 'Analyse les agios', sensitivity: 'confidential' });
    expect(r.answer).toBe('ok');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://core.test/functions/v1/proph3t-ask');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-app');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ product: 'atlasbanx', sensitivity: 'confidential', message: 'Analyse les agios' });
  });

  it('defaults sensitivity to confidential for AtlasBanx', async () => {
    const fetchMock = vi.fn(async (_input?: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ conversation_id: 'c1', answer: 'ok', citations: [], confidence: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mod = await importWithEnv({
      VITE_ATLAS_SUPABASE_URL: 'https://core.test',
      VITE_ATLAS_SUPABASE_ANON_KEY: 'anon',
    });
    await mod.askProph3t({ message: 'x' });
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.sensitivity).toBe('confidential');
  });

  it('throws (no leak) when core not configured', async () => {
    const mod = await importWithEnv({
      VITE_ATLAS_SUPABASE_URL: '',
      VITE_ATLAS_SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    });
    expect(mod.isAtlasCoreConfigured()).toBe(false);
    // resetModules → la classe Proph3tError du module importé dynamiquement est
    // distincte de l'import statique ; on vérifie le nom plutôt que l'identité.
    await expect(mod.askProph3t({ message: 'x' })).rejects.toMatchObject({ name: 'Proph3tError' });
  });

  it('searchKnowledge degrades gracefully to [] when core not configured', async () => {
    const mod = await importWithEnv({
      VITE_ATLAS_SUPABASE_URL: '',
      VITE_ATLAS_SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    });
    await expect(mod.searchKnowledge('ohada')).resolves.toEqual([]);
  });

  it('falls back to the app Supabase project when VITE_ATLAS_* are absent', async () => {
    const fetchMock = vi.fn(async (_input?: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ conversation_id: 'c1', answer: 'ok', citations: [], confidence: 0.9 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const mod = await importWithEnv({
      VITE_ATLAS_SUPABASE_URL: '',
      VITE_ATLAS_SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_URL: 'https://app-core.test',
      VITE_SUPABASE_ANON_KEY: 'app-anon',
    });
    expect(mod.isAtlasCoreConfigured()).toBe(true);
    await mod.askProph3t({ message: 'x' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://app-core.test/functions/v1/proph3t-ask');
  });
});
