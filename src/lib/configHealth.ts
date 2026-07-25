// ============================================================================
// AtlasBanx — Diagnostic de configuration (production readiness)
// ============================================================================
// Vérifie au démarrage que l'environnement est correctement configuré et
// signale CLAIREMENT les situations à risque pour une exploitation en
// production avec des données bancaires réelles :
//   - repli Supabase mutualisé au lieu d'un projet dédié
//   - mode démo activé
//   - aucun fournisseur IA configuré
//
// Purement diagnostique : n'altère aucun comportement, ne jette jamais.
// ============================================================================

export type ConfigSeverity = 'ok' | 'warn' | 'critical';

export interface ConfigCheck {
  key: string;
  label: string;
  severity: ConfigSeverity;
  detail: string;
}

export interface ConfigHealthReport {
  isProd: boolean;
  demoMode: boolean;
  supabaseMode: 'explicit' | 'fallback' | 'missing';
  checks: ConfigCheck[];
  /** True si au moins un check est `critical` en build de production. */
  hasBlockingIssues: boolean;
}

const SUPABASE_URL_PLACEHOLDER = 'votre-supabase-url';
const SUPABASE_KEY_PLACEHOLDER = 'votre-supabase-anon-key';

function env(key: string): string | undefined {
  const v = (import.meta.env as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;
}

/**
 * Calcule l'état de configuration de l'application.
 */
export function getConfigHealth(): ConfigHealthReport {
  const isProd = Boolean(import.meta.env.PROD);
  const demoMode = env('VITE_DEMO_MODE') === 'true';

  const supaUrl = env('VITE_SUPABASE_URL');
  const supaKey = env('VITE_SUPABASE_ANON_KEY');
  const supaExplicit =
    Boolean(supaUrl && supaUrl !== SUPABASE_URL_PLACEHOLDER) &&
    Boolean(supaKey && supaKey !== SUPABASE_KEY_PLACEHOLDER);

  // L'app embarque un repli Supabase mutualisé : sans env explicite, elle
  // reste fonctionnelle mais pointe vers le projet partagé Atlas Studio.
  const supabaseMode: ConfigHealthReport['supabaseMode'] = supaExplicit
    ? 'explicit'
    : 'fallback';

  const checks: ConfigCheck[] = [];

  // 1. Supabase
  if (supabaseMode === 'explicit') {
    checks.push({
      key: 'supabase',
      label: 'Supabase',
      severity: 'ok',
      detail: 'Projet Supabase dédié configuré via VITE_SUPABASE_URL.',
    });
  } else {
    checks.push({
      key: 'supabase',
      label: 'Supabase',
      severity: isProd ? 'critical' : 'warn',
      detail:
        'Aucun projet Supabase dédié : repli sur le projet mutualisé Atlas Studio. ' +
        'En production avec des données clients réelles, définissez VITE_SUPABASE_URL ' +
        'et VITE_SUPABASE_ANON_KEY vers VOTRE projet.',
    });
  }

  // 2. Mode démo
  if (demoMode) {
    checks.push({
      key: 'demo',
      label: 'Mode démo',
      severity: isProd ? 'critical' : 'warn',
      detail:
        'VITE_DEMO_MODE=true : authentification automatique et données fictives. ' +
        'À DÉSACTIVER en production.',
    });
  } else {
    checks.push({
      key: 'demo',
      label: 'Mode démo',
      severity: 'ok',
      detail: 'Mode démo désactivé.',
    });
  }

  // 3. Fournisseur IA (informatif — les clés utilisateur peuvent être saisies dans l'app)
  const hasAiEnvKey = Boolean(env('VITE_CLAUDE_API_KEY'));
  checks.push({
    key: 'ai',
    label: 'Fournisseur IA',
    severity: 'ok',
    detail: hasAiEnvKey
      ? 'Clé IA fournie via l\'environnement.'
      : 'Aucune clé IA au niveau env — les fournisseurs (Claude/Groq/…) se configurent ' +
        'dans Paramètres ou côté Edge Functions. Informatif.',
  });

  const hasBlockingIssues =
    isProd && checks.some((c) => c.severity === 'critical');

  return { isProd, demoMode, supabaseMode, checks, hasBlockingIssues };
}

/**
 * Journalise l'état de configuration au démarrage.
 * Bruyant volontairement quand une configuration production est à risque.
 */
export function logConfigHealth(): ConfigHealthReport {
  const report = getConfigHealth();

  const critical = report.checks.filter((c) => c.severity === 'critical');
  const warnings = report.checks.filter((c) => c.severity === 'warn');

  if (critical.length > 0) {
    console.error(
      '%c[AtlasBanx] Configuration production INCOMPLÈTE — ' +
        `${critical.length} problème(s) critique(s) :`,
      'color:#fff;background:#b91c1c;padding:2px 6px;border-radius:3px;font-weight:bold',
    );
    for (const c of critical) console.error(`  ✖ ${c.label} — ${c.detail}`);
  }

  if (warnings.length > 0) {
    for (const c of warnings) {
      console.warn(`[AtlasBanx] ⚠ ${c.label} — ${c.detail}`);
    }
  }

  if (critical.length === 0 && warnings.length === 0) {
    console.info('[AtlasBanx] Configuration OK.');
  }

  return report;
}
