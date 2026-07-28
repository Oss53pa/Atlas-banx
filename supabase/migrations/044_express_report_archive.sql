-- ============================================================================
-- ATLASBANX — Migration 044 — Archive des rapports certifiés (audit express)
-- ============================================================================
-- Le parcours particulier NE CONSERVE PAS le relevé ni les données
-- personnelles. En revanche, Atlas conserve une ARCHIVE MINIMALE et
-- inviolable du LIVRABLE CERTIFIÉ, à des fins de preuve en cas de contrôle ou
-- d'enquête : référence du rapport, empreinte SHA-256 du PDF, et métadonnées
-- non nominatives (banque, période, nombre d'anomalies, total). Aucun nom,
-- numéro de compte, ni détail de transaction n'est stocké.
--
-- Sécurité : append-only. L'insertion est ouverte au parcours public (anon),
-- la lecture est réservée aux administrateurs. Pas d'UPDATE/DELETE.
-- ============================================================================

CREATE TABLE IF NOT EXISTS atlasbanx.express_report_archive (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_ref        text NOT NULL UNIQUE,
  pdf_sha256        text NOT NULL,
  bank_code         text,
  period_start      date,
  period_end        date,
  anomaly_count     integer NOT NULL DEFAULT 0,
  total_recoverable numeric NOT NULL DEFAULT 0,
  used_official_grid boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_express_archive_ref ON atlasbanx.express_report_archive (report_ref);
CREATE INDEX IF NOT EXISTS idx_express_archive_hash ON atlasbanx.express_report_archive (pdf_sha256);

ALTER TABLE atlasbanx.express_report_archive ENABLE ROW LEVEL SECURITY;

-- Insertion append-only ouverte au parcours public (anon + authenticated).
DROP POLICY IF EXISTS express_archive_insert ON atlasbanx.express_report_archive;
CREATE POLICY express_archive_insert
  ON atlasbanx.express_report_archive
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Lecture réservée aux administrateurs (contrôle / enquête).
DROP POLICY IF EXISTS express_archive_admin_read ON atlasbanx.express_report_archive;
CREATE POLICY express_archive_admin_read
  ON atlasbanx.express_report_archive
  FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT INSERT ON atlasbanx.express_report_archive TO anon, authenticated;
GRANT SELECT ON atlasbanx.express_report_archive TO authenticated;
