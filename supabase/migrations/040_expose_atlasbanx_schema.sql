-- ============================================================================
-- ATLASBANX — Migration 040 — Exposer le schéma atlasbanx à l'API (PostgREST)
-- ============================================================================
-- L'app appelle `.schema('atlasbanx')` partout, mais le schéma n'était pas dans
-- la liste des schémas exposés par PostgREST → erreur PGRST106 « Invalid schema:
-- atlasbanx » sur toutes les hydratations (bankStore, clientStore, settingsRepo…),
-- l'app retombant silencieusement sur le localStorage.
--
-- On AJOUTE atlasbanx à la liste existante (sans écraser keystone / atlas_people)
-- et on accorde USAGE à anon (les endpoints publics passent par service_role,
-- mais on aligne les droits). Idempotent.
-- ============================================================================

DO $$
DECLARE
  cur text;
BEGIN
  SELECT split_part(cfg, '=', 2)
    INTO cur
  FROM unnest(
    (SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator')
  ) AS cfg
  WHERE cfg LIKE 'pgrst.db_schemas=%'
  LIMIT 1;

  cur := coalesce(cur, 'public');

  IF position('atlasbanx' IN cur) = 0 THEN
    EXECUTE format('ALTER ROLE authenticator SET pgrst.db_schemas = %L', cur || ', atlasbanx');
  END IF;
END$$;

GRANT USAGE ON SCHEMA atlasbanx TO anon;

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
