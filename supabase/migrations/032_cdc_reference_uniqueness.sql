-- ============================================================================
-- ATLASBANX — Migration 032 — Unicité stricte du référentiel banque L2
-- ============================================================================
-- Garantit STRUCTURELLEMENT l'invariant « une banque + une date + une rubrique
-- = exactement une valeur », au lieu de le supposer :
--
--   1. Deux versions PUBLIÉES ne peuvent pas se chevaucher dans le temps pour
--      une même banque  → contrainte d'exclusion (daterange + gist).
--   2. Une même rubrique (mêmes dimensions) ne peut apparaître qu'une fois par
--      version                                → index unique.
--
-- Sans ces garde-fous, le moteur de résolution retombe sur un `ORDER BY … LIMIT 1`
-- non déterministe en cas de doublon/chevauchement.
--
-- Idempotente. NB : si des données existantes violent déjà ces contraintes,
-- la création échouera — il faut d'abord dédoublonner (voir requêtes de
-- diagnostic en commentaire, plus bas).
-- ============================================================================

-- btree_gist : permet de combiner l'égalité (bank_id) et le chevauchement de
-- plage (&&) dans une même contrainte d'exclusion.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ----------------------------------------------------------------------------
-- 1. Pas de chevauchement entre versions PUBLIÉES d'une même banque
-- ----------------------------------------------------------------------------
-- Intervalle demi-ouvert [effective_from, effective_to) — cohérent avec le
-- modèle de succession côté TS (temporal.ts) et la vue matérialisée.
-- effective_to NULL = borne supérieure infinie (version toujours en vigueur).
-- La contrainte ne s'applique qu'aux versions publiées et non supersédées :
-- les brouillons/soumissions/versions historisées peuvent coexister.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bank_ref_versions_no_overlap'
      AND conrelid = 'atlasbanx.bank_reference_versions'::regclass
  ) THEN
    ALTER TABLE atlasbanx.bank_reference_versions
      ADD CONSTRAINT bank_ref_versions_no_overlap
      EXCLUDE USING gist (
        bank_id WITH =,
        daterange(effective_from, effective_to, '[)') WITH &&
      )
      WHERE (validation_status = 'published' AND superseded_by IS NULL);
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- 2. Unicité (version, rubrique, dimensions) sur les conditions
-- ----------------------------------------------------------------------------
-- Empêche deux valeurs contradictoires pour la même rubrique dans une même
-- version. `dimensions` étant JSONB nullable, on canonicalise NULL → 'null'
-- pour que deux lignes « sans dimension » entrent bien en collision (les
-- UNIQUE classiques traitent les NULL comme distincts).

CREATE UNIQUE INDEX IF NOT EXISTS uq_bank_ref_conditions_rubric_dims
  ON atlasbanx.bank_reference_conditions (
    reference_version_id,
    rubric_code,
    (COALESCE(dimensions, 'null'::jsonb))
  );

-- L'ancien index non-unique de lookup devient redondant avec l'index unique
-- ci-dessus (même préfixe de colonnes) ; on le retire pour éviter le doublon.
DROP INDEX IF EXISTS atlasbanx.idx_ref_cond_lookup;

-- ----------------------------------------------------------------------------
-- Diagnostic (à exécuter manuellement AVANT si la migration échoue)
-- ----------------------------------------------------------------------------
-- Chevauchements de versions publiées :
--   SELECT a.bank_id, a.id, b.id
--   FROM atlasbanx.bank_reference_versions a
--   JOIN atlasbanx.bank_reference_versions b
--     ON a.bank_id = b.bank_id AND a.id < b.id
--    AND a.validation_status = 'published' AND b.validation_status = 'published'
--    AND a.superseded_by IS NULL AND b.superseded_by IS NULL
--    AND daterange(a.effective_from, a.effective_to, '[)')
--        && daterange(b.effective_from, b.effective_to, '[)');
--
-- Doublons de conditions :
--   SELECT reference_version_id, rubric_code, COALESCE(dimensions,'null'::jsonb), count(*)
--   FROM atlasbanx.bank_reference_conditions
--   GROUP BY 1,2,3 HAVING count(*) > 1;

NOTIFY pgrst, 'reload schema';
