-- ============================================================================
-- ATLASBANX — Migration 030 — Acceptation des invitations de workspace
-- ============================================================================
-- Complète la table workspace_invites (migr. 026) avec la logique d'acceptation.
-- Quand un utilisateur invité (par email) se connecte, ce RPC le rattache au(x)
-- workspace(s) qui l'ont invité, avec le rôle prévu, et marque l'invitation
-- acceptée. SECURITY DEFINER : peut écrire cabinet_members (sinon DG-only).
--
-- Appelé par workspaceStore.ensureWorkspace() AVANT de créer un workspace solo,
-- pour que l'invité rejoigne le cabinet existant au lieu d'en créer un nouveau.
-- ============================================================================

CREATE OR REPLACE FUNCTION atlasbanx.accept_workspace_invites()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_count integer := 0;
  r       record;
BEGIN
  IF v_uid IS NULL OR v_email = '' THEN
    RETURN 0;
  END IF;

  FOR r IN
    SELECT wi.id, wi.workspace_id, wi.role, wi.invited_by
    FROM atlasbanx.workspace_invites wi
    WHERE lower(wi.email) = v_email
      AND wi.accepted_at IS NULL
  LOOP
    INSERT INTO atlasbanx.cabinet_members (workspace_id, user_id, role, invited_by)
    VALUES (r.workspace_id, v_uid, r.role, r.invited_by)
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    UPDATE atlasbanx.workspace_invites
    SET accepted_at = now(), accepted_by = v_uid
    WHERE id = r.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION atlasbanx.accept_workspace_invites() IS
  'Rattache l''utilisateur courant aux workspaces qui l''ont invité (par email), avec le rôle prévu, et marque les invitations acceptées. Retourne le nombre d''invitations acceptées.';

GRANT EXECUTE ON FUNCTION atlasbanx.accept_workspace_invites() TO authenticated;

NOTIFY pgrst, 'reload schema';
