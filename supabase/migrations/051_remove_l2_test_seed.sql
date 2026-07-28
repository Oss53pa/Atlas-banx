-- ============================================================================
-- ATLASBANX — Migration 051 — Suppression des données de démonstration L2
-- ============================================================================
-- Le référentiel ne doit contenir que des barèmes RÉELS. On retire la grille de
-- test seedée par la migration 039 (et toute autre entrée marquée seed://).
-- Idempotent : ne supprime que ce qui porte une marque de démonstration.
-- Respecte l'ordre des FK (supersession détachée → conditions → version).
-- ============================================================================

DO $$
DECLARE v uuid;
BEGIN
  FOR v IN
    SELECT id FROM atlasbanx.bank_reference_versions
    WHERE source_pdf_url LIKE 'seed://%' OR source_hash_sha256 LIKE 'seed-%'
  LOOP
    UPDATE atlasbanx.bank_reference_versions SET superseded_by = NULL WHERE superseded_by = v;
    DELETE FROM atlasbanx.bank_reference_conditions WHERE reference_version_id = v;
    DELETE FROM atlasbanx.bank_reference_versions WHERE id = v;
  END LOOP;
END$$;
