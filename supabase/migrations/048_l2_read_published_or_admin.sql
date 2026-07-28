-- ============================================================================
-- ATLASBANX — Migration 048 — Lecture L2 restreinte (publié OU admin)
-- ============================================================================
-- FAILLE (013) : bank_reference_versions / _conditions étaient lisibles par
-- TOUT utilisateur authentifié (USING true), y compris les versions NON encore
-- publiées (draft / submitted / rejected) et leur provenance (source_pdf_url,
-- empreinte). Le journal admin est pourtant réservé aux admins : un utilisateur
-- non-admin pouvait lire directement des barèmes en préparation via l'API.
--
-- CORRECTIF : la lecture se limite aux versions PUBLIÉES, sauf pour les admins
-- (qui pilotent le workflow deux-yeux et le journal). Les audits (résolution L2)
-- n'utilisent que des versions publiées → aucun impact. Les écritures restent
-- régies par les policies admin-write (035). Anon n'a jamais eu de lecture
-- directe (policies TO authenticated) : le parcours express passe par l'Edge
-- Function service-role, non affectée.
-- ============================================================================

-- Versions : publiées visibles de tous les authentifiés ; le reste, admins only.
DROP POLICY IF EXISTS bank_ref_versions_read ON atlasbanx.bank_reference_versions;
CREATE POLICY bank_ref_versions_read
  ON atlasbanx.bank_reference_versions
  FOR SELECT TO authenticated
  USING (validation_status = 'published' OR public.is_admin());

-- Conditions : visibles si leur version est publiée, sinon admins only.
DROP POLICY IF EXISTS bank_ref_conditions_read ON atlasbanx.bank_reference_conditions;
CREATE POLICY bank_ref_conditions_read
  ON atlasbanx.bank_reference_conditions
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM atlasbanx.bank_reference_versions v
      WHERE v.id = reference_version_id
        AND v.validation_status = 'published'
    )
  );
