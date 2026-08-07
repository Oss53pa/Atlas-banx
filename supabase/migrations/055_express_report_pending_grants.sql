-- ============================================================================
-- 055 — GRANTs service_role sur express_report_pending
-- ============================================================================
-- Les Edge Functions express-audit (INSERT/UPSERT) et express-report (SELECT)
-- opèrent en service_role. Sans ces GRANTs, PostgREST renvoie
-- 42501 « permission denied for table express_report_pending » et le rapport
-- ne peut être ni stocké ni livré.
-- ============================================================================

grant usage on schema atlasbanx to service_role;
grant select, insert, update, delete on atlasbanx.express_report_pending to service_role;

notify pgrst, 'reload schema';
