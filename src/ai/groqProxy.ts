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
