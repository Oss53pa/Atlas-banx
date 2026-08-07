-- ============================================================================
-- 054 — express_report_pending : rapport d'audit express STOCKÉ côté serveur
-- ============================================================================
-- L'Edge Function `express-audit` calcule le récupérable/prix et génère le
-- rapport détaillé côté serveur, puis le stocke ici (clé = reference). Le
-- rapport n'est livré qu'après paiement, via `express-report` (paywall
-- serveur-enforced). RLS activée SANS policy → aucun accès client direct ; seul
-- le service_role (qui bypasse RLS) lit/écrit, via les Edge Functions.
-- ============================================================================

create table if not exists atlasbanx.express_report_pending (
  reference        text primary key,
  bank_code        text,
  recoverable_fcfa integer     not null default 0,
  price_fcfa       integer     not null default 0,
  is_free          boolean     not null default false,
  anomaly_count    integer     not null default 0,
  report_html      text,
  created_at       timestamptz not null default now()
);

alter table atlasbanx.express_report_pending enable row level security;
-- Aucune policy : deny-all pour anon/authenticated. Accès uniquement service_role.
