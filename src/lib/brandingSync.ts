/**
 * brandingSync.ts — Resync du branding d'app dans raw_user_meta_data.
 * Pose la palette de l'app (nom, tagline, accent, wordmark) lue depuis
 * public.apps sur l'utilisateur, pour que les templates Auth natifs Atlas
 * Studio s'affichent aux couleurs de l'app. Source unique : public.apps.
 * Non bloquant : un échec ne doit jamais empêcher l'accès.
 */
import { getSupabaseClient } from './supabase';

const WORDMARK_CDN = 'https://cdn.jsdelivr.net/gh/Oss53pa/Atlas-studio-Console-Admin@main/public/wordmarks';
const NEUTRAL = {
  app: 'Atlas Studio', app_tagline: "L'écosystème Atlas Studio",
  app_accent: '#6E8B58', app_accent_deep: '#52693F', app_accent_soft: '#EEF4E9',
  app_wordmark: `${WORDMARK_CDN}/wm-atlas-studio.png`,
};
export interface AppBrandingMeta {
  app: string; app_id: string; app_tagline: string;
  app_accent: string; app_accent_deep: string; app_accent_soft: string; app_wordmark: string;
}
export async function syncAppBranding(appId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const { data } = await supabase.from('apps').select('*').eq('id', appId).single();
    const row = (data ?? {}) as Record<string, unknown>;
    const str = (v: unknown, f: string) => (typeof v === 'string' && v.trim() ? v : f);
    const meta: AppBrandingMeta = {
      app: str(row.name, NEUTRAL.app),
      app_id: appId,
      app_tagline: str(row.tagline, NEUTRAL.app_tagline),
      app_accent: str(row.color, NEUTRAL.app_accent),
      app_accent_deep: str(row.accent_deep, NEUTRAL.app_accent_deep),
      app_accent_soft: str(row.accent_soft, NEUTRAL.app_accent_soft),
      app_wordmark: str(row.wordmark_url, NEUTRAL.app_wordmark),
    };
    await supabase.auth.updateUser({ data: meta });
  } catch (e) {
    console.warn('[brandingSync] resync échoué (non bloquant):', e);
  }
}
