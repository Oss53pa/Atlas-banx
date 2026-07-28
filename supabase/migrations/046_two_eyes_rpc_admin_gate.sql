-- ============================================================================
-- ATLASBANX — Migration 046 — Verrou admin sur les RPC du workflow deux-yeux
-- ============================================================================
-- FAILLE (043) : submit/validate/publish/reject_bank_reference_version étaient
-- SECURITY DEFINER, exécutables par PUBLIC (défaut CREATE FUNCTION → EXECUTE to
-- PUBLIC, jamais révoqué) et SANS contrôle is_admin(). En tant que DEFINER,
-- elles contournent la policy RLS d'écriture L2 (035). N'importe quel compte
-- authentifié — voire anonyme — pouvait donc piloter la publication /
-- supersession / rejet du référentiel L2 MUTUALISÉ (partagé entre tous les
-- tenants), corrompant les barèmes servant au calcul des sommes recouvrables.
--
-- CORRECTIF :
--   1. Ajout de `IF NOT public.is_admin() THEN RAISE EXCEPTION` en tête des 4
--      RPC (aligné sur 042 admin_autopublish et 045 admin_reference_journal).
--      Les corps sont préservés à l'identique.
--   2. REVOKE EXECUTE FROM PUBLIC + GRANT au seul rôle authenticated (le
--      contrôle is_admin() reste la barrière réelle).
-- Idempotent (CREATE OR REPLACE + REVOKE/GRANT).
-- ============================================================================

CREATE OR REPLACE FUNCTION atlasbanx.submit_bank_reference_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'submit_bank_reference_version: réservé aux administrateurs';
  END IF;
  UPDATE atlasbanx.bank_reference_versions
     SET validation_status = 'submitted', submitted_by = auth.uid(), submitted_at = now()
   WHERE id = p_version_id AND validation_status = 'draft';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % introuvable ou pas au statut brouillon', p_version_id;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION atlasbanx.validate_bank_reference_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
DECLARE v_submitter uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'validate_bank_reference_version: réservé aux administrateurs';
  END IF;
  SELECT submitted_by INTO v_submitter
    FROM atlasbanx.bank_reference_versions
   WHERE id = p_version_id AND validation_status = 'submitted';
  IF v_submitter IS NULL THEN
    RAISE EXCEPTION 'Version % introuvable ou non soumise', p_version_id;
  END IF;
  IF v_submitter = auth.uid() THEN
    RAISE EXCEPTION 'Two-eyes violation: le validateur doit différer du soumetteur';
  END IF;
  UPDATE atlasbanx.bank_reference_versions
     SET validation_status = 'validated', validated_by = auth.uid(), validated_at = now()
   WHERE id = p_version_id;
END$$;

CREATE OR REPLACE FUNCTION atlasbanx.publish_bank_reference_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
DECLARE
  v_bank uuid;
  v_from atlasbanx.bank_reference_versions.effective_from%TYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'publish_bank_reference_version: réservé aux administrateurs';
  END IF;
  SELECT bank_id, effective_from INTO v_bank, v_from
    FROM atlasbanx.bank_reference_versions
   WHERE id = p_version_id AND validation_status = 'validated';
  IF v_bank IS NULL THEN
    RAISE EXCEPTION 'Version % pas encore validée', p_version_id;
  END IF;

  UPDATE atlasbanx.bank_reference_versions prev
     SET effective_to = v_from, superseded_by = p_version_id
   WHERE prev.bank_id = v_bank
     AND prev.id <> p_version_id
     AND prev.validation_status = 'published'
     AND prev.effective_from <= v_from
     AND (prev.effective_to IS NULL OR prev.effective_to > v_from);

  UPDATE atlasbanx.bank_reference_versions
     SET validation_status = 'published', published_by = auth.uid(), published_at = now()
   WHERE id = p_version_id;
END$$;

CREATE OR REPLACE FUNCTION atlasbanx.reject_bank_reference_version(p_version_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'reject_bank_reference_version: réservé aux administrateurs';
  END IF;
  UPDATE atlasbanx.bank_reference_versions
     SET validation_status = 'rejected', rejection_reason = p_reason
   WHERE id = p_version_id AND validation_status IN ('submitted','draft');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % introuvable ou déjà publiée', p_version_id;
  END IF;
END$$;

-- Révoque l'EXECUTE accordé par défaut à PUBLIC, ne laisse que authenticated
-- (le contrôle is_admin() ci-dessus reste la barrière réelle).
REVOKE ALL ON FUNCTION atlasbanx.submit_bank_reference_version(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION atlasbanx.validate_bank_reference_version(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION atlasbanx.publish_bank_reference_version(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION atlasbanx.reject_bank_reference_version(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION atlasbanx.submit_bank_reference_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.validate_bank_reference_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.publish_bank_reference_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.reject_bank_reference_version(uuid, text) TO authenticated;
