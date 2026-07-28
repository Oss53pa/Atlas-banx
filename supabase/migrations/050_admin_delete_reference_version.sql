-- ============================================================================
-- ATLASBANX — Migration 050 — Suppression admin d'un barème L2 (journal)
-- ============================================================================
-- Permet à un administrateur de supprimer une version de barème importée
-- (bank_reference_versions) ET ses conditions. La FK conditions→version est en
-- NO ACTION (pas de cascade) : on supprime donc les conditions d'abord, après
-- avoir détaché toute version qui référence celle-ci comme remplaçante
-- (superseded_by). SECURITY DEFINER + contrôle is_admin().
-- ============================================================================

CREATE OR REPLACE FUNCTION atlasbanx.admin_delete_reference_version(p_version_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_delete_reference_version: réservé aux administrateurs';
  END IF;

  -- Détache les versions qui pointent vers celle-ci comme remplaçante,
  -- pour ne pas violer la FK auto-référente superseded_by.
  UPDATE atlasbanx.bank_reference_versions
     SET superseded_by = NULL
   WHERE superseded_by = p_version_id;

  -- Conditions d'abord (FK NO ACTION), puis la version.
  DELETE FROM atlasbanx.bank_reference_conditions
   WHERE reference_version_id = p_version_id;

  DELETE FROM atlasbanx.bank_reference_versions
   WHERE id = p_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % introuvable', p_version_id;
  END IF;
END$$;

REVOKE ALL ON FUNCTION atlasbanx.admin_delete_reference_version(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION atlasbanx.admin_delete_reference_version(uuid) TO authenticated;
