// ============================================================================
// proph3t.ts — Intégration Atlas Studio « Proph3t core » pour AtlasBanx.
// ----------------------------------------------------------------------------
// Adapté du snippet de référence oss53pa/atlas-studio-website
//   docs/snippets/proph3t-integration.ts
//
// DEUX MODES, complémentaires (l'API vient EN COMPLÉMENT des imports Excel /
// saisies manuelles existants — elle ne les remplace pas) :
//
//   A) Fédération (SDK vendoré dans ./proph3t/sdk) → l'agent local garde son
//      LLM ; le core fournit mémoire inter-apps, RAG SYSCOHADA, 197 outils,
//      audit SHA-256. Le core ne reçoit JAMAIS le message utilisateur en
//      mode A — uniquement les requêtes d'enrichissement.
//   B) Hébergé (POST proph3t-ask) → on délègue tout le tour au core, avec
//      gouvernance par SENSIBILITÉ des données.
//
// GARDE-FOUS
//   - Données `confidential` (relevés bancaires, ce que manipule AtlasBanx) :
//     `askProph3t(..., "confidential")` → le core route Ollama/Claude
//     UNIQUEMENT (jamais de tier à rétention type gemini/groq).
//   - Le JWT de la session Supabase de l'app est passé en `userToken` pour que
//     la RLS du core s'applique.
//   - Aucun secret en clair : la clé anon du core vient de l'env (VITE_*).
// ============================================================================

import { Proph3tClient, Proph3tError } from './proph3t/sdk';
import type { KnowledgeHit, MemoryHit } from './proph3t/sdk';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

/** Id de cette app au catalogue Atlas Studio (le core normalise les alias). */
const PRODUCT = 'atlasbanx';

/** Sensibilité par défaut : AtlasBanx manipule des relevés bancaires. */
export type Sensitivity = 'confidential' | 'internal' | 'public';
export const DEFAULT_SENSITIVITY: Sensitivity = 'confidential';

/**
 * Résout l'endpoint du core Atlas Studio.
 *  1. `VITE_ATLAS_SUPABASE_*` dédiées (override explicite) si présentes ;
 *  2. sinon repli sur le Supabase de l'app (`VITE_SUPABASE_*`) — car
 *     aujourd'hui le core (`vgtmljfayiysuvrcmunt`) EST le projet de l'app :
 *     la valeur existe déjà côté Vercel, aucune var à ré-ajouter.
 * Les vars dédiées restent utiles le jour où le core diverge du projet app.
 */
function resolveAtlasCore(): { url: string; anon: string } {
  const atlasUrl = import.meta.env.VITE_ATLAS_SUPABASE_URL as string | undefined;
  const atlasAnon = import.meta.env.VITE_ATLAS_SUPABASE_ANON_KEY as string | undefined;
  if (atlasUrl && atlasAnon) return { url: atlasUrl, anon: atlasAnon };
  if (isSupabaseConfigured()) {
    return {
      url: import.meta.env.VITE_SUPABASE_URL as string,
      anon: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    };
  }
  return { url: '', anon: '' };
}

const { url: ATLAS_CORE_URL, anon: ATLAS_CORE_ANON } = resolveAtlasCore();

/** True quand le core est joignable (vars dédiées OU repli Supabase app). */
export function isAtlasCoreConfigured(): boolean {
  return Boolean(ATLAS_CORE_URL && ATLAS_CORE_ANON);
}

/** Récupère le JWT de la session Supabase de l'app (ou null hors connexion). */
async function getUserToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

// ============================================================
// MODE A — Fédération : enrichissement via le SDK vendoré
// ============================================================

/**
 * Construit un client Proph3t fédéré scoppé sur l'utilisateur courant.
 * Renvoie `null` quand le core n'est pas configuré → l'appelant DOIT retomber
 * sur le comportement local. Sans JWT, seuls les endpoints publics répondent.
 */
export async function getProph3t(societyId?: string): Promise<Proph3tClient | null> {
  if (!isAtlasCoreConfigured()) return null;
  const userToken = await getUserToken();
  return new Proph3tClient({
    product: PRODUCT,
    supabaseUrl: ATLAS_CORE_URL,
    apiKey: ATLAS_CORE_ANON,
    userToken: userToken ?? undefined, // RLS appliquée quand présent
    societyId,
    timeoutMs: 8000, // cap dur : le chemin local doit pouvoir répondre vite
  });
}

/** Référence de connaissance normalisée pour l'UI (ancrage des réponses). */
export interface KnowledgeRef {
  title: string;
  excerpt: string;
  citation: string;
}

/**
 * RAG centralisé (SYSCOHADA / OHADA / CGI). Dégradation gracieuse : renvoie
 * `[]` si le core est indisponible — n'interrompt jamais le flux local.
 */
export async function searchKnowledge(
  query: string,
  opts: { sourceType?: string; topK?: number; societyId?: string } = {},
): Promise<KnowledgeRef[]> {
  const client = await getProph3t(opts.societyId);
  if (!client) return [];
  try {
    const hits: KnowledgeHit[] = await client.searchKnowledge({
      query,
      sourceType: opts.sourceType,
      topK: opts.topK ?? 3,
    });
    return hits.map((h) => ({ title: h.title, excerpt: h.excerpt, citation: h.citation }));
  } catch (err) {
    warnFallback('searchKnowledge', err);
    return [];
  }
}

/** Mémoire utilisateur inter-apps. Dégradation gracieuse → `[]`. */
export async function recallMemory(
  query: string,
  opts: { limit?: number; societyId?: string } = {},
): Promise<MemoryHit[]> {
  const client = await getProph3t(opts.societyId);
  if (!client) return [];
  try {
    return await client.recall({ query, limit: opts.limit ?? 5 });
  } catch (err) {
    warnFallback('recall', err);
    return [];
  }
}

/**
 * Trace une action sensible dans l'audit chaîné SHA-256 (conformité OHADA).
 * Fire-and-forget : ne bloque jamais et n'émet pas d'erreur à l'appelant.
 */
export async function logAudit(params: {
  action: string;
  subjectType?: string;
  subjectId?: string;
  content: Record<string, unknown>;
  societyId?: string;
}): Promise<void> {
  const client = await getProph3t(params.societyId);
  if (!client) return;
  try {
    await client.logAudit({
      action: params.action,
      subjectType: params.subjectType,
      subjectId: params.subjectId,
      content: params.content,
    });
  } catch (err) {
    warnFallback('logAudit', err);
  }
}

/**
 * Délègue un calcul à un outil central (au lieu de le réimplémenter).
 * Dégradation gracieuse → `null`.
 */
export async function runTool<TData = unknown>(
  name: string,
  args: Record<string, unknown>,
  societyId?: string,
): Promise<TData | null> {
  const client = await getProph3t(societyId);
  if (!client) return null;
  try {
    const r = await client.runTool<TData>({ name, args });
    return r.result;
  } catch (err) {
    warnFallback(`runTool(${name})`, err);
    return null;
  }
}

// ============================================================
// MODE B — Hébergé : déléguer tout le tour à proph3t-ask
// ============================================================

export interface AskResult {
  conversation_id: string;
  answer: string;
  citations: unknown[];
  confidence: number;
  disclaimer?: string;
}

/**
 * Pose une question à l'orchestrateur Proph3t hébergé.
 *
 * `sensitivity` gouverne les providers autorisés côté core :
 *   - "confidential" → Ollama + Claude uniquement (aucune rétention). À
 *     utiliser pour les relevés bancaires, défaut d'AtlasBanx.
 *   - "internal" / "public" → tous providers selon dispo.
 *
 * Lève une erreur si le core n'est pas configuré ou répond en échec —
 * l'appelant peut catch pour retomber proprement sur le mode local.
 */
export async function askProph3t(params: {
  message: string;
  sensitivity?: Sensitivity;
  conversationId?: string;
  societyId?: string;
}): Promise<AskResult> {
  if (!isAtlasCoreConfigured()) {
    throw new Proph3tError('Atlas core non configuré (VITE_ATLAS_SUPABASE_*)', 0, 'proph3t-ask');
  }
  const userToken = await getUserToken();
  const res = await fetch(`${ATLAS_CORE_URL}/functions/v1/proph3t-ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ATLAS_CORE_ANON,
      Authorization: `Bearer ${userToken ?? ATLAS_CORE_ANON}`,
    },
    body: JSON.stringify({
      message: params.message,
      product: PRODUCT,
      sensitivity: params.sensitivity ?? DEFAULT_SENSITIVITY,
      conversation_id: params.conversationId,
      society_id: params.societyId,
    }),
  });
  if (!res.ok) {
    throw new Proph3tError(`proph3t-ask ${res.status}: ${await res.text()}`, res.status, 'proph3t-ask');
  }
  return res.json();
}

// ============================================================
// Helpers internes
// ============================================================

function warnFallback(op: string, err: unknown): void {
  if (err instanceof Proph3tError) {
    console.warn(`[proph3t] ${op} fallback:`, err.message);
  } else {
    console.warn(`[proph3t] ${op} fallback:`, err);
  }
}
