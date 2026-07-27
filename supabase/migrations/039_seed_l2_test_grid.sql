-- ============================================================================
-- ATLASBANX — Migration 039 — Grille L2 de test (NSIA-CI)
-- ============================================================================
-- Seed d'une version de référence L2 PUBLIÉE pour NSIA-CI, avec des conditions
-- différenciées par segment (particulier / corporate) + catch-all. Permet de
-- valider de bout en bout la comparaison au barème officiel dans le funnel
-- Particulier (public-bank-reference → l2ToBankConditions → runFullAudit).
--
-- Idempotente : ne fait rien si une version publiée existe déjà pour NSIA-CI.
-- ============================================================================

DO $$
DECLARE
  v_bank uuid;
  v_ver  uuid;
BEGIN
  SELECT id INTO v_bank FROM atlasbanx.cdc_banks WHERE code = 'NSIA-CI';
  IF v_bank IS NULL THEN
    RAISE NOTICE 'Banque NSIA-CI absente de cdc_banks — seed ignoré.';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM atlasbanx.bank_reference_versions
    WHERE bank_id = v_bank AND validation_status = 'published' AND superseded_by IS NULL
  ) THEN
    RAISE NOTICE 'Version publiée déjà présente pour NSIA-CI — seed ignoré.';
    RETURN;
  END IF;

  INSERT INTO atlasbanx.bank_reference_versions (
    bank_id, version_label, effective_from, source_pdf_url, source_hash_sha256,
    validation_status, published_at
  ) VALUES (
    v_bank, 'Grille tarifaire test 2026', DATE '2026-01-01',
    'seed://test/nsia-ci-2026.pdf', 'seed-hash-nsia-ci-2026',
    'published', now()
  )
  RETURNING id INTO v_ver;

  INSERT INTO atlasbanx.bank_reference_conditions (reference_version_id, rubric_code, dimensions, value_numeric)
  VALUES
    (v_ver, 'compte.tenue_mensuelle',            '{"profil":"particulier"}'::jsonb, 1500),
    (v_ver, 'compte.tenue_mensuelle',            '{"profil":"corporate"}'::jsonb,   10000),
    (v_ver, 'compte.releve_mensuel',             NULL,                              500),
    (v_ver, 'compte.inactivite',                 NULL,                              2000),
    (v_ver, 'decouverts.taux_autorise',          NULL,                              14),
    (v_ver, 'decouverts.taux_non_autorise',      NULL,                              22),
    (v_ver, 'decouverts.commission_mouvement',   NULL,                              0.25),
    (v_ver, 'cartes.cotisation_debit',           NULL,                              15000);
END$$;

NOTIFY pgrst, 'reload schema';
