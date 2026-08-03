// ============================================================================
// Client — Proph3t via Groq (proxy serveur)
// ============================================================================
// Appelle l'Edge Function `groq-proxy` qui détient la clé GROQ_API_KEY côté
// serveur. Permet à Proph3t / au chat de fonctionner SANS qu'aucun utilisateur
// ne configure de clé API. Utilisé par défaut quand aucune clé personnelle
// (Claude, etc.) n'est renseignée.
// ============================================================================

import { getSupabaseClient } from '../lib/supabase';

export interface GroqProxyMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqProxyParams {
  messages: GroqProxyMessage[];
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GroqProxyResult {
  content: string;
  tokensUsed: number;
}

/** Le proxy serveur est-il joignable (Supabase configuré) ? */
export function isGroqProxyAvailable(): boolean {
  return getSupabaseClient() != null;
}

export interface GroqProxyHealth {
  /** La fonction a répondu (déployée + joignable). */
  reachable: boolean;
  /** `GROQ_API_KEY` présente côté serveur. */
  configured: boolean;
  /** Modèle Groq par défaut annoncé par la fonction. */
  model?: string;
  /** Message d'erreur exploitable pour la console admin (cause exacte). */
  error?: string;
}

/**
 * VRAI diagnostic de l'IA principale (proxy Groq serveur) — au-delà de la
 * simple présence de Supabase. Interroge `GET groq-proxy/health` :
 *   - reachable=false           → fonction non déployée / réseau ;
 *   - reachable=true, configured=false → `GROQ_API_KEY` manquante côté serveur ;
 *   - reachable=true, configured=true  → IA opérationnelle (modèle indiqué).
 * N'expose jamais la clé (l'endpoint /health ne renvoie qu'un booléen).
 */
export async function checkGroqProxyHealth(): Promise<GroqProxyHealth> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { reachable: false, configured: false, error: 'Supabase non configuré.' };
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anon) {
    return { reachable: false, configured: false, error: 'URL/clé Supabase absentes.' };
  }
  try {
    // Le endpoint /health est un SOUS-CHEMIN → fetch direct (functions.invoke
    // ne cible que la racine). verify_jwt=true → on passe le JWT de session.
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${supabaseUrl}/functions/v1/groq-proxy/health`, {
      method: 'GET',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${session?.access_token ?? anon}`,
      },
    });
    if (!res.ok) {
      return {
        reachable: res.status !== 404,
        configured: false,
        error: `groq-proxy/health ${res.status} — ${res.status === 404 ? 'fonction non déployée' : res.status === 401 ? 'session requise' : 'erreur'}`,
      };
    }
    const data = (await res.json()) as { configured?: boolean; model?: string };
    const configured = Boolean(data?.configured);
    return {
      reachable: true,
      configured,
      model: data?.model,
      error: configured ? undefined : 'GROQ_API_KEY non configurée côté serveur.',
    };
  } catch (err) {
    return {
      reachable: false,
      configured: false,
      error: err instanceof Error ? err.message : 'échec du health-check Groq.',
    };
  }
}

/**
 * Envoie une conversation au proxy Groq serveur et renvoie la réponse.
 * Lève si Supabase n'est pas configuré ou si le proxy renvoie une erreur.
 */
export async function groqProxyChat(params: GroqProxyParams): Promise<GroqProxyResult> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase non configuré — proxy Groq indisponible.');

  const { data, error } = await supabase.functions.invoke('groq-proxy', { body: params });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));

  return {
    content: typeof data?.content === 'string' ? data.content : '',
    tokensUsed: typeof data?.tokensUsed === 'number' ? data.tokensUsed : 0,
  };
}
