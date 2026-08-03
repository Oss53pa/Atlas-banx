// ============================================================================
// Edge Function — groq-proxy
// ============================================================================
// Proxy serveur vers l'API Groq (compatible OpenAI). La clé GROQ_API_KEY vit
// UNIQUEMENT côté serveur : Proph3t / le chat fonctionnent sans qu'aucun
// utilisateur ne configure de clé. JWT Supabase requis (verify_jwt=true) pour
// éviter tout usage anonyme de la clé payée par Atlas.
//
// Variables d'environnement :
//   - GROQ_API_KEY   (obligatoire)
//   - GROQ_MODEL     (défaut 'openai/gpt-oss-120b')
//     ⚠ llama-3.3-70b-versatile et llama-3.1-8b-instant ont été DÉPRÉCIÉS par
//     Groq le 2026-06-17 (tier free/dev) → remplacés par openai/gpt-oss-120b
//     (≈70B, recommandé) et openai/gpt-oss-20b (rapide).
//
// POST body : { messages: [{role, content}], system?, model?, temperature?, maxTokens? }
// Réponse   : { content, model, tokensUsed }
// GET /health : ping (sans clé exposée)
// ============================================================================

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const GROQ_MODEL = Deno.env.get('GROQ_MODEL') ?? 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

interface ChatMsg { role: 'system' | 'user' | 'assistant'; content: string }

interface ProxyRequest {
  messages?: ChatMsg[];
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const url = new URL(req.url);
  if (url.pathname.endsWith('/health')) {
    return json({ status: 'ok', configured: Boolean(GROQ_API_KEY), model: GROQ_MODEL });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!GROQ_API_KEY) return json({ error: 'GROQ_API_KEY non configurée côté serveur' }, 503);

  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'corps JSON invalide' }, 400);
  }

  const messages: ChatMsg[] = [];
  if (body.system && body.system.trim()) {
    messages.push({ role: 'system', content: body.system });
  }
  for (const m of body.messages ?? []) {
    if (m && typeof m.content === 'string' && m.role) {
      messages.push({ role: m.role, content: m.content });
    }
  }
  if (messages.length === 0) return json({ error: 'aucun message fourni' }, 400);

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: body.model || GROQ_MODEL,
        messages,
        temperature: typeof body.temperature === 'number' ? body.temperature : 0.3,
        max_tokens: typeof body.maxTokens === 'number' ? body.maxTokens : 2048,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return json({ error: `Groq ${res.status}: ${text.slice(0, 500)}` }, 502);
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const tokensUsed: number = data?.usage?.total_tokens ?? 0;
    return json({ content, model: data?.model ?? body.model ?? GROQ_MODEL, tokensUsed });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'échec proxy Groq' }, 500);
  }
});
