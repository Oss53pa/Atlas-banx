-- ============================================================================
-- ATLASBANX — Migration 042 — Auto-validation L2 (phase de démarrage)
-- ============================================================================
-- Le workflow « deux yeux » (022) interdit qu'un même admin soit à la fois
-- submitted_by et validated_by. Utile en régime établi, mais bloquant au
-- démarrage quand un seul administrateur Atlas Studio existe.
--
-- Ce correctif ajoute une SOUPAPE contrôlée :
--   1. Le trigger anti-self-validation respecte désormais un drapeau de
--      session `atlasbanx.autopublish` : quand il vaut 'on', la contrainte
--      d'altérité est levée (uniquement dans la transaction qui l'a posé).
--   2. Une fonction SECURITY DEFINER `admin_autopublish_reference(uuid)`,
--      réservée aux admins (public.is_admin()), pose ce drapeau puis
--      soumet + valide + publie la version en une seule opération.
--
-- La soupape n'est activable QUE via cette fonction (SET LOCAL, borné à la
-- transaction) et QUE par un admin. Aucun client ne peut la déclencher.
-- ============================================================================

-- 1. Le trigger deux-yeux tolère le drapeau d'auto-validation ------------------
CREATE OR REPLACE FUNCTION atlasbanx.check_two_eyes_distinct_users()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Soupape auto-validation : posée uniquement par admin_autopublish_reference
  -- (SET LOCAL, bornée à la transaction). En dehors, la contrainte s'applique.
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

-- 2. Fonction d'auto-publication réservée aux admins --------------------------
CREATE OR REPLACE FUNCTION atlasbanx.admin_autopublish_reference(p_version_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_bank uuid;
  v_from atlasbanx.bank_reference_versions.effective_from%TYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_autopublish_reference: réservé aux administrateurs';
  END IF;

  SELECT bank_id, effective_from INTO v_bank, v_from
    FROM atlasbanx.bank_reference_versions WHERE id = p_version_id;
  IF v_bank IS NULL THEN
    RAISE EXCEPTION 'admin_autopublish_reference: version % introuvable', p_version_id;
  END IF;

  -- Lève l'altérité deux-yeux pour CETTE transaction seulement (utile dans les
  -- environnements où le trigger 022 existe ; sans effet là où il est absent).
  PERFORM set_config('atlasbanx.autopublish', 'on', true);

  -- Supersession : clôture les versions publiées de la même banque qui
  -- couvriraient la nouvelle date d'effet (barème ouvert ou débordant), afin
  -- d'éviter le chevauchement (contrainte d'exclusion 032) et de matérialiser
  -- la succession chronologique des barèmes.
  UPDATE atlasbanx.bank_reference_versions prev
     SET effective_to  = v_from,
         superseded_by = p_version_id
   WHERE prev.bank_id = v_bank
     AND prev.id <> p_version_id
     AND prev.validation_status = 'published'
     AND prev.effective_from <= v_from
     AND (prev.effective_to IS NULL OR prev.effective_to > v_from);

  -- On ne touche QUE les colonnes présentes dans tous les environnements
  -- (validated_by / validated_at / published_at). Les colonnes submitted_by /
  -- published_by (ajoutées par 022) ne sont pas requises pour publier.
  UPDATE atlasbanx.bank_reference_versions
     SET validation_status = 'published',
         validated_by  = v_uid,
         validated_at  = now(),
         published_at  = now()
   WHERE id = p_version_id;

  RETURN p_version_id;
END$$;

REVOKE ALL ON FUNCTION atlasbanx.admin_autopublish_reference(uuid) FROM public;
GRANT EXECUTE ON FUNCTION atlasbanx.admin_autopublish_reference(uuid) TO authenticated;
