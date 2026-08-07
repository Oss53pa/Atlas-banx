-- ============================================================================
-- 053 — Durcissements d'autorisation (audit F5, 2026). Appliquée en prod via
-- apply_migration puis consignée ici (anti-drift repo↔base).
-- Cross-tenant déjà SAIN (RLS partout, tenant dérivé du JWT via
-- auth_workspace_ids/licence_seats, écritures L2 gatées is_admin(), two-eyes,
-- user_ai_keys deny-all, vue en security_invoker).
-- ============================================================================

-- F5-a : express_archive_insert (SECURITY DEFINER) n'est plus exécutable par
-- anon. L'audit express n'est PAS anonyme → le flux légitime (authenticated)
-- conserve EXECUTE. (Avant : anon pouvait insérer dans express_report_archive.)
REVOKE EXECUTE ON FUNCTION atlasbanx.express_archive_insert(text,text,text,date,date,integer,numeric,boolean) FROM anon;

-- F5-b : resolution_log — un utilisateur ne peut journaliser que sous sa propre
-- identité (avant : with_check=true → tout authenticated insérait n'importe quoi).
DROP POLICY IF EXISTS resolution_log_insert ON atlasbanx.resolution_log;
CREATE POLICY resolution_log_insert ON atlasbanx.resolution_log
  FOR INSERT TO authenticated
  WITH CHECK (resolved_by = auth.uid());

-- F5-c : client_assignments — borne l'écriture au client d'un workspace où
-- l'appelant est dg (avant : USING = « dg quelque part », sans borner le
-- workspace cible).
DROP POLICY IF EXISTS client_assignments_dg_manage ON atlasbanx.client_assignments;
CREATE POLICY client_assignments_dg_manage ON atlasbanx.client_assignments
  FOR ALL TO public
  USING (client_id IN (SELECT c.id FROM atlasbanx.clients c
           WHERE c.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('dg'))))
  WITH CHECK (client_id IN (SELECT c.id FROM atlasbanx.clients c
           WHERE c.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('dg'))));

-- F5-d : figer le search_path (hardening) de la fonction de contrôle two-eyes.
ALTER FUNCTION atlasbanx.check_two_eyes_distinct_users() SET search_path = atlasbanx, public;
