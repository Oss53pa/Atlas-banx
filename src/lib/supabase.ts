// ============================================================================
// ATLASBANX - Supabase Client
// Client singleton pour l'integration Supabase
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

let supabaseInstance: SupabaseClient<Database> | null = null;

// ----------------------------------------------------------------------------
// Repli sur le projet « Atlas core » mutualise (cle anon PUBLIQUE, protegee par
// RLS). Reprend les memes valeurs deja codees en dur dans atlasErrorMonitor.ts /
// proph3t.ts afin que l'app reste fonctionnelle meme si VITE_SUPABASE_* n'est pas
// injecte au build (ex. deploiement Vercel sans variables d'environnement).
// Les variables d'environnement, si presentes, ont TOUJOURS la priorite.
// ----------------------------------------------------------------------------
const FALLBACK_SUPABASE_URL = 'https://vgtmljfayiysuvrcmunt.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZndG1samZheWl5c3V2cmNtdW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NzgyMDUsImV4cCI6MjA4NjU1NDIwNX0.a2pyz1up8ZmZk-Tl51B0v6n3eVNkBPG5L_BJAM20qt4';

function resolveSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (url && url !== 'votre-supabase-url') return url;
  return FALLBACK_SUPABASE_URL;
}

function resolveSupabaseAnonKey(): string {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (key && key !== 'votre-supabase-anon-key') return key;
  return FALLBACK_SUPABASE_ANON_KEY;
}

/**
 * Verifie si Supabase est configure (variables d'environnement OU repli mutualise).
 * Avec le repli code en dur, ceci renvoie toujours true en production.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}

/**
 * Retourne le client Supabase singleton
 * Cree l'instance au premier appel si Supabase est configure
 */
export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseInstance) {
    const url = resolveSupabaseUrl();
    const key = resolveSupabaseAnonKey();

    supabaseInstance = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      // Default schema stays `public`; use `supabase.schema('atlasbanx')`
      // when querying app-specific tables.
    });
  }

  return supabaseInstance;
}
