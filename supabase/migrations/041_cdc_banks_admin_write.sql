-- ============================================================================
-- ATLASBANX — Migration 041 — Écriture cdc_banks pour les admins
-- ============================================================================
-- La console admin doit pouvoir créer une banque de référence (cdc_banks) pour
-- publier ses conditions L2, y compris pour les banques pas encore présentes.
-- Écriture réservée aux admins via is_admin() ; les clients restent en lecture.
-- Idempotent.
-- ============================================================================

DROP POLICY IF EXISTS "cdc_banks_admin_write" ON atlasbanx.cdc_banks;
CREATE POLICY "cdc_banks_admin_write" ON atlasbanx.cdc_banks
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

NOTIFY pgrst, 'reload schema';
