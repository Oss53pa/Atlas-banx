-- ============================================================================
-- ATLASBANX — Migration 045 — Journal de couverture du référentiel L2 (admin)
-- ============================================================================
-- Restitue, pour la console admin, l'ensemble des versions de barème par
-- banque avec leur période de couverture et les SEGMENTS (types de client)
-- réellement présents dans leurs conditions. Permet côté UI de dresser un
-- journal et de mettre en évidence les périodes manquantes.
--
-- Segments : distinct `dimensions->>'profil'` des conditions de la version ;
-- si au moins une condition n'a pas de profil (catch-all), on ajoute 'tous'.
-- Réservé aux administrateurs (SECURITY DEFINER + contrôle is_admin()).
-- ============================================================================

CREATE OR REPLACE FUNCTION atlasbanx.admin_reference_journal()
RETURNS TABLE (
  bank_code         text,
  bank_name         text,
  zone              text,
  country_iso       text,
  version_id        uuid,
  version_label     text,
  validation_status text,
  effective_from    date,
  effective_to      date,
  published_at      timestamptz,
  segments          text[],
  conditions_count  integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_reference_journal: réservé aux administrateurs';
  END IF;

  RETURN QUERY
  SELECT
    b.code::text,
    b.legal_name::text,
    b.zone::text,
    b.country_iso::text,
    v.id,
    v.version_label::text,
    v.validation_status::text,
    v.effective_from,
    v.effective_to,
    v.published_at,
    COALESCE(
      ARRAY_AGG(DISTINCT (c.dimensions->>'profil'))
        FILTER (WHERE c.dimensions ? 'profil' AND c.dimensions->>'profil' IS NOT NULL),
      ARRAY[]::text[]
    )
    || CASE
         WHEN BOOL_OR(c.id IS NOT NULL AND (c.dimensions IS NULL OR NOT (c.dimensions ? 'profil')))
         THEN ARRAY['tous'] ELSE ARRAY[]::text[]
       END,
    COUNT(c.id)::int
  FROM atlasbanx.bank_reference_versions v
  JOIN atlasbanx.cdc_banks b ON b.id = v.bank_id
  LEFT JOIN atlasbanx.bank_reference_conditions c ON c.reference_version_id = v.id
  GROUP BY b.code, b.legal_name, b.zone, b.country_iso,
           v.id, v.version_label, v.validation_status, v.effective_from, v.effective_to, v.published_at
  ORDER BY b.legal_name, v.effective_from;
END$$;

REVOKE ALL ON FUNCTION atlasbanx.admin_reference_journal() FROM public;
GRANT EXECUTE ON FUNCTION atlasbanx.admin_reference_journal() TO authenticated;
