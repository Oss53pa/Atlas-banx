-- ============================================================================
-- 057 — express_report_pending.audit_json : rapport SERVEUR-ONLY
-- ============================================================================
-- On stocke le résultat d'audit COMPLET (anomalies, statistiques, synthèse) en
-- plus du rapport HTML, pour que le client bâtisse le livrable (PDF premium,
-- lettre de réclamation) à partir des données SERVEUR livrées par express-report
-- APRÈS paiement — et non de son propre audit local. Le paywall devient ainsi
-- réellement enforced : le détail actionnable n'existe pas côté client avant
-- paiement.
-- ============================================================================

alter table atlasbanx.express_report_pending add column if not exists audit_json jsonb;

notify pgrst, 'reload schema';
