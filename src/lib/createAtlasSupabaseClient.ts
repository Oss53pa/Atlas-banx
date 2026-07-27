// ============================================================================
// Atlas Studio — Factory client Supabase (frontend) HARMONISÉE
// ----------------------------------------------------------------------------
// Config d'auth normalisée pour toutes les apps satellites : persistance
// localStorage + storageKey explicite par app, lock no-op, fetch résilient,
// autoRefresh/persist/detectSessionInUrl activés.
//
// Contrat unique destiné à devenir un paquet partagé (une seule source). Chaque
// app fournit son url / anonKey / storageKey ; le reste est identique partout.
// ============================================================================
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface AtlasSupabaseOptions {
  url: string;
  anonKey: string;
  /** Clé de stockage localStorage propre à l'app (ex. 'atlasbanx-auth'). */
  storageKey: string;
  /** Nombre de réessais sur erreur réseau transitoire (défaut 2). */
  fetchMaxRetries?: number;
}

/**
 * Lock no-op : @supabase/auth-js utilise `navigator.locks` pour coordonner
 * l'auth entre onglets ; dans certains contextes (iframes sandboxed, modes
 * privés, charge concurrente) il lève « AbortError: signal is aborted without
 * reason » ou un warning console répétitif. On force un lock no-op ; la
 * coordination cross-onglets reste assurée par `onAuthStateChange` + l'event
 * `storage` de localStorage.
 */
const noopLock = async <R>(
  _name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>,
): Promise<R> => fn();

/**
 * fetch résilient : réessaie sur les erreurs réseau transitoires
 * (« TypeError: Failed to fetch »), fréquentes lors d'un refresh de token quand
 * la connexion vacille (réveil d'onglet, réseau mobile instable). Un échec
 * réseau signifie que la requête n'a jamais atteint le serveur → la rejouer est
 * sûr, même pour un POST. Les annulations volontaires (AbortError) ne sont
 * jamais rejouées.
 */
function makeResilientFetch(maxRetries: number) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fetch(input, init);
      } catch (err) {
        lastErr = err;
        const aborted =
          (err instanceof DOMException && err.name === 'AbortError') ||
          Boolean(init?.signal?.aborted);
        if (aborted || attempt === maxRetries) break;
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    throw lastErr;
  };
}

/**
 * Crée un client Supabase avec la configuration d'auth normalisée Atlas Studio.
 * Toutes les apps satellites doivent passer par cette factory (ne pas appeler
 * `createClient` directement) pour garantir un comportement de session cohérent.
 */
export function createAtlasSupabaseClient<DB = any>(
  opts: AtlasSupabaseOptions,
): SupabaseClient<DB> {
  return createClient<DB>(opts.url, opts.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: typeof localStorage !== 'undefined' ? localStorage : undefined,
      storageKey: opts.storageKey,
      lock: noopLock,
    },
    global: {
      fetch: makeResilientFetch(opts.fetchMaxRetries ?? 2),
    },
  });
}
