-- ============================================================================
-- 056 — GRANTs service_role sur express_payments
-- ============================================================================
-- Le paywall express serveur repose sur express_payments : cinetpay-init y
-- insère la trace (pending), cinetpay-notify la confirme (succeeded) et
-- express-report la lit pour décider de livrer le rapport. Aucun GRANT
-- service_role n'existait → la lecture revenait vide (402 permanent) et
-- l'insertion cinetpay échouait silencieusement.
-- ============================================================================

grant select, insert, update on atlasbanx.express_payments to service_role;

notify pgrst, 'reload schema';
