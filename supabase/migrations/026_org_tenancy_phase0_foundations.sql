-- ============================================================================
-- ATLASBANX — Migration 026 — Multi-tenant par organisation : Phase 0 (fondations)
-- ============================================================================
-- ADDITIVE / ZÉRO CHANGEMENT DE COMPORTEMENT.
--
-- Objectif : poser les fondations pour passer de l'isolation par-utilisateur
-- (user_id = auth.uid()) à un partage des données au sein d'un workspace
-- (cabinet). Cette migration N'ACTIVE PAS encore les policies par-workspace :
--   • elle ajoute une colonne workspace_id NULLABLE sur les 14 tables métier
--     partagées (les inserts existants qui ne la renseignent pas continuent
--     de fonctionner) ;
--   • elle crée le helper SECURITY DEFINER auth_workspace_ids(min_role) ;
--   • elle corrige la récursion RLS de cabinet_members_dg_manage (migr. 021) ;
--   • elle ajoute la table org_members (roster par email, pré-invitations) ;
--   • elle ajoute le RPC create_workspace_with_dg() (bootstrap atomique).
--
-- Le backfill (Phase 1), le bootstrap au login (Phase 2), le stamping repo
-- (Phase 3) et la bascule des policies (Phase 4) sont des migrations séparées.
--
-- Familles HORS périmètre (inchangées) :
--   • CDC (cdc_*, agreements, resolution_log, cdc_audit_*) — multi-tenant
--     propre via tenant_id/licence_seats ;
--   • tables de référence globales (policy_versions, regulatory_*, rubrics_*,
--     cdc_banks, bank_reference_*) ;
--   • tables PERSONNELLES qui ne se partagent pas : user_settings,
--     user_consents, data_deletion_requests, ip_allowlists, user_ai_keys,
--     billing_settings, invoices, invoice_lines.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Helper RLS : workspace_ids du user courant, filtrés par rôle minimum.
--    SECURITY DEFINER ⇒ lit cabinet_members en contournant la RLS ⇒ AUCUNE
--    récursion quand les policies des tables métier appellent ce helper.
--
--    Hiérarchie des rôles (enum atlasbanx.cabinet_role) :
--      consultation < junior < senior < dg
--    min_role :
--      NULL / 'consultation' → tout membre (lecture)
--      'junior'              → dg, senior, junior (écriture : create/update)
--      'senior'              → dg, senior          (suppression)
--      'dg'                  → dg                  (administration)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atlasbanx.auth_workspace_ids(min_role text DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
  SELECT cm.workspace_id
  FROM atlasbanx.cabinet_members cm
  WHERE cm.user_id = auth.uid()
    AND (
      min_role IS NULL
      OR min_role = 'consultation'
      OR (min_role = 'junior' AND cm.role IN ('dg', 'senior', 'junior'))
      OR (min_role = 'senior' AND cm.role IN ('dg', 'senior'))
      OR (min_role = 'dg'     AND cm.role = 'dg')
    );
$$;

COMMENT ON FUNCTION atlasbanx.auth_workspace_ids(text) IS
  'Workspaces du user courant filtrés par rôle minimum. SECURITY DEFINER pour éviter la récursion RLS. min_role ∈ {NULL,consultation,junior,senior,dg}.';

-- Helper booléen dédié au fix de récursion sur cabinet_members (voir §2).
CREATE OR REPLACE FUNCTION atlasbanx.is_workspace_dg(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM atlasbanx.cabinet_members cm
    WHERE cm.workspace_id = p_workspace_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'dg'
  );
$$;

COMMENT ON FUNCTION atlasbanx.is_workspace_dg(uuid) IS
  'True si le user courant est DG du workspace donné. SECURITY DEFINER pour casser la récursion RLS sur cabinet_members.';

GRANT EXECUTE ON FUNCTION atlasbanx.auth_workspace_ids(text) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.is_workspace_dg(uuid)     TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Fix récursion RLS : cabinet_members_dg_manage (migr. 021) faisait un
--    SELECT FROM cabinet_members DANS sa propre clause USING → récursion.
--    On remplace par le helper SECURITY DEFINER.
-- ────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS cabinet_members_dg_manage ON atlasbanx.cabinet_members;
CREATE POLICY cabinet_members_dg_manage ON atlasbanx.cabinet_members
  FOR ALL
  USING (atlasbanx.is_workspace_dg(workspace_id))
  WITH CHECK (atlasbanx.is_workspace_dg(workspace_id));

-- client_assignments_dg_manage (021) interrogeait cabinet_members sans scope
-- de workspace (tout DG de n'importe quel workspace passait). On le scope au
-- workspace du client via le helper. Le client doit appartenir à un workspace
-- où le user est DG. (client_assignments n'a pas de workspace_id direct ; on
-- passe par le client → on le branchera proprement en Phase 4 ; ici on se
-- contente de retirer la dépendance récursive potentielle.)
DROP POLICY IF EXISTS client_assignments_dg_manage ON atlasbanx.client_assignments;
CREATE POLICY client_assignments_dg_manage ON atlasbanx.client_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM atlasbanx.cabinet_members cm
      WHERE cm.user_id = auth.uid() AND cm.role = 'dg'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3) Roster d'affichage par EMAIL — permet de pré-inviter un membre AVANT
--    qu'il ait un compte (cabinet_members est indexé par user_id et ne le
--    permet pas). C'est l'équivalent du `org_members` du template.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atlasbanx.workspace_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid NOT NULL REFERENCES atlasbanx.workspaces(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          atlasbanx.cabinet_role NOT NULL DEFAULT 'junior',
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at   timestamptz,
  accepted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, email)
);

CREATE INDEX IF NOT EXISTS idx_workspace_invites_workspace ON atlasbanx.workspace_invites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_email     ON atlasbanx.workspace_invites(lower(email));

ALTER TABLE atlasbanx.workspace_invites ENABLE ROW LEVEL SECURITY;

-- Lecture : tout membre du workspace voit les invitations de son workspace ;
-- l'invité (par email) voit la sienne.
DROP POLICY IF EXISTS workspace_invites_select ON atlasbanx.workspace_invites;
CREATE POLICY workspace_invites_select ON atlasbanx.workspace_invites
  FOR SELECT USING (
    workspace_id IN (SELECT atlasbanx.auth_workspace_ids())
    OR lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- Gestion (invite/révoque) : DG du workspace uniquement.
DROP POLICY IF EXISTS workspace_invites_dg_manage ON atlasbanx.workspace_invites;
CREATE POLICY workspace_invites_dg_manage ON atlasbanx.workspace_invites
  FOR ALL
  USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids('dg')))
  WITH CHECK (workspace_id IN (SELECT atlasbanx.auth_workspace_ids('dg')));

GRANT SELECT, INSERT, UPDATE, DELETE ON atlasbanx.workspace_invites TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4) RPC bootstrap atomique : crée un workspace + ajoute le créateur en DG.
--    Évite l'auto-escalade : le client ne peut PAS écrire cabinet_members en
--    direct (policy DG-only), mais peut créer un workspace dont il devient DG
--    via cette fonction contrôlée.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atlasbanx.create_workspace_with_dg(
  p_name text,
  p_type atlasbanx.workspace_type DEFAULT 'cabinet'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ws_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'create_workspace_with_dg: aucun utilisateur authentifié';
  END IF;

  INSERT INTO atlasbanx.workspaces (name, type, owner_id)
  VALUES (coalesce(nullif(trim(p_name), ''), 'Mon cabinet'), p_type, v_uid)
  RETURNING id INTO v_ws_id;

  INSERT INTO atlasbanx.cabinet_members (workspace_id, user_id, role, invited_by)
  VALUES (v_ws_id, v_uid, 'dg', v_uid)
  ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'dg';

  RETURN v_ws_id;
END;
$$;

COMMENT ON FUNCTION atlasbanx.create_workspace_with_dg(text, atlasbanx.workspace_type) IS
  'Crée un workspace et y ajoute l''appelant comme DG (atomique). Utilisé par le bootstrap au login.';

GRANT EXECUTE ON FUNCTION atlasbanx.create_workspace_with_dg(text, atlasbanx.workspace_type) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 5) Colonne workspace_id NULLABLE sur les 14 tables métier partagées.
--    NULLABLE volontairement : les inserts legacy (qui ne la renseignent pas)
--    continuent de marcher. Le NOT NULL viendra en Phase 1 après backfill.
--    ON DELETE CASCADE : supprimer un workspace purge ses données (cohérent
--    avec le CASCADE existant sur user_id).
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  shared_tables text[] := ARRAY[
    'clients', 'bank_accounts', 'bank_statements', 'transactions',
    'analyses', 'anomalies', 'report_drafts', 'generated_reports',
    'user_banks', 'risk_score_history', 'import_history', 'import_drafts',
    'audit_trail', 'proph3t_inferences'
  ];
BEGIN
  FOREACH t IN ARRAY shared_tables LOOP
    EXECUTE format(
      'ALTER TABLE atlasbanx.%I ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES atlasbanx.workspaces(id) ON DELETE CASCADE;',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS idx_%s_workspace_id ON atlasbanx.%I(workspace_id);',
      t, t
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
