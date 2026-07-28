-- ============================================================================
-- ATLASBANX — Migration 043 — Alignement du workflow « deux yeux » (L2)
-- ============================================================================
-- La base de production n'avait jamais reçu l'intégralité de la migration 022 :
--   - colonnes submitted_by / submitted_at / published_by / rejection_reason
--     ABSENTES ;
--   - contrainte de statut limitée à draft/validated/published (pas de
--     submitted / rejected) ;
--   - trigger anti-self-validation ABSENT ;
--   - RPC submit/validate/publish/reject ABSENTES.
-- Résultat : le chemin « deux yeux » appelé par l'app était cassé (fonctions
-- inexistantes). Cette migration réaligne le schéma sur l'intention de 022,
-- de façon idempotente, pour que le workflow complet fonctionne dès qu'un
-- second administrateur existe — sans casser l'auto-validation (042).
-- ============================================================================

-- 1. Colonnes manquantes ------------------------------------------------------
ALTER TABLE atlasbanx.bank_reference_versions
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE atlasbanx.bank_reference_versions
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE atlasbanx.bank_reference_versions
  ADD COLUMN IF NOT EXISTS published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE atlasbanx.bank_reference_versions
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. Contrainte de statut élargie ---------------------------------------------
ALTER TABLE atlasbanx.bank_reference_versions
  DROP CONSTRAINT IF EXISTS bank_reference_versions_validation_status_check;
ALTER TABLE atlasbanx.bank_reference_versions
  ADD CONSTRAINT bank_reference_versions_validation_status_check
  CHECK (validation_status IN ('draft','submitted','validated','published','rejected'));

-- 3. Trigger anti-self-validation (fonction déjà rendue flag-aware par 042) ----
CREATE OR REPLACE FUNCTION atlasbanx.check_two_eyes_distinct_users()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('atlasbanx.autopublish', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.validated_by IS NOT NULL
     AND NEW.submitted_by IS NOT NULL
     AND NEW.validated_by = NEW.submitted_by THEN
    RAISE EXCEPTION 'Two-eyes violation: validated_by must differ from submitted_by';
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS trg_bank_ref_two_eyes ON atlasbanx.bank_reference_versions;
CREATE TRIGGER trg_bank_ref_two_eyes
  BEFORE INSERT OR UPDATE ON atlasbanx.bank_reference_versions
  FOR EACH ROW EXECUTE FUNCTION atlasbanx.check_two_eyes_distinct_users();

-- 4. RPC du workflow ----------------------------------------------------------
CREATE OR REPLACE FUNCTION atlasbanx.submit_bank_reference_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
BEGIN
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

-- publish : ajoute la SUPERSESSION des versions publiées chevauchantes (comme
-- admin_autopublish_reference) pour respecter la contrainte d'exclusion 032.
CREATE OR REPLACE FUNCTION atlasbanx.publish_bank_reference_version(p_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
DECLARE
  v_bank uuid;
  v_from atlasbanx.bank_reference_versions.effective_from%TYPE;
BEGIN
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
  UPDATE atlasbanx.bank_reference_versions
     SET validation_status = 'rejected', rejection_reason = p_reason
   WHERE id = p_version_id AND validation_status IN ('submitted','draft');
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version % introuvable ou déjà publiée', p_version_id;
  END IF;
END$$;

GRANT EXECUTE ON FUNCTION atlasbanx.submit_bank_reference_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.validate_bank_reference_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.publish_bank_reference_version(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION atlasbanx.reject_bank_reference_version(uuid, text) TO authenticated;
