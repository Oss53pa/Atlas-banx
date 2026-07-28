-- ============================================================================
-- ATLASBANX — Migration 047 — Durcissement de l'archive express (preuve)
-- ============================================================================
-- FAILLE (044) : l'archive « inviolable » du livrable certifié acceptait un
-- INSERT anonyme direct avec WITH CHECK (true) + GRANT INSERT TO anon. Donc :
--   - forgerie : n'importe quel visiteur pouvait poster des lignes arbitraires
--     (report_ref / empreinte / montants choisis) ;
--   - DoS par collision : report_ref est UNIQUE → pré-insérer une réf faisait
--     échouer l'archivage légitime (silencieux côté client) ;
--   - flood : insertions anonymes illimitées.
--
-- CORRECTIF : l'écriture passe désormais par une SEULE fonction contrôlée
-- (SECURITY DEFINER) qui valide le format (empreinte SHA-256 = 64 hex, réf
-- bornée), borne les montants et ignore les collisions (ON CONFLICT DO NOTHING).
-- L'INSERT direct anonyme est révoqué. La lecture reste réservée aux admins.
-- NB : le parcours particulier étant anonyme par conception, l'authenticité des
-- VALEURS reste déclarative ; la vraie preuve d'intégrité est l'empreinte du PDF.
-- ============================================================================

CREATE OR REPLACE FUNCTION atlasbanx.express_archive_insert(
  p_report_ref         text,
  p_pdf_sha256         text,
  p_bank_code          text,
  p_period_start       date,
  p_period_end         date,
  p_anomaly_count      integer,
  p_total_recoverable  numeric,
  p_used_official_grid boolean
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = atlasbanx, public AS $$
BEGIN
  IF p_report_ref IS NULL OR length(p_report_ref) NOT BETWEEN 3 AND 64 THEN
    RAISE EXCEPTION 'express_archive_insert: report_ref invalide';
  END IF;
  IF p_pdf_sha256 IS NULL OR p_pdf_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'express_archive_insert: empreinte SHA-256 invalide';
  END IF;

  INSERT INTO atlasbanx.express_report_archive (
    report_ref, pdf_sha256, bank_code, period_start, period_end,
    anomaly_count, total_recoverable, used_official_grid
  ) VALUES (
    p_report_ref,
    lower(p_pdf_sha256),
    NULLIF(left(COALESCE(p_bank_code, ''), 32), ''),
    p_period_start,
    p_period_end,
    GREATEST(0, COALESCE(p_anomaly_count, 0)),
    GREATEST(0, COALESCE(p_total_recoverable, 0)),
    COALESCE(p_used_official_grid, false)
  )
  ON CONFLICT (report_ref) DO NOTHING;  -- neutralise la DoS par collision
END$$;

-- Plus d'INSERT direct : la fonction (DEFINER) est le seul écrivain.
DROP POLICY IF EXISTS express_archive_insert ON atlasbanx.express_report_archive;
REVOKE INSERT ON atlasbanx.express_report_archive FROM anon, authenticated;

REVOKE ALL ON FUNCTION atlasbanx.express_archive_insert(text, text, text, date, date, integer, numeric, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION atlasbanx.express_archive_insert(text, text, text, date, date, integer, numeric, boolean) TO anon, authenticated;
