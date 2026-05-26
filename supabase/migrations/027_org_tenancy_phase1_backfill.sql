-- ============================================================================
-- ATLASBANX — Migration 027 — Multi-tenant par org : Phase 1 (backfill)
-- ============================================================================
-- Stratégie validée : 1 workspace par utilisateur (chacun devient son propre
-- cabinet, rôle DG). Zéro partage de données au départ ; la structure org est
-- en place, et l'invitation de membres se fera ensuite via workspace_invites.
--
-- Étapes :
--   A. Crée un workspace + une appartenance DG pour chaque user qui n'en a pas.
--   B. Stampe workspace_id sur les 14 tables métier depuis le workspace que le
--      user possède (owner_id = user_id) — mapping déterministe.
--   C. Passe workspace_id en NOT NULL UNIQUEMENT sur les tables où le backfill
--      est complet (aucun NULL restant). Sinon laisse nullable + RAISE NOTICE
--      (ne bloque pas la migration ; une colonne nullable reste sûre car les
--      policies Phase 4 traitent NULL comme "hors workspace" = invisible).
--
-- Idempotent : ré-exécutable sans dupliquer (NOT EXISTS / IS NULL guards).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- A) 1 workspace par user sans appartenance + appartenance DG
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO atlasbanx.workspaces (name, type, owner_id)
SELECT
  COALESCE(NULLIF(TRIM(p.full_name), ''), p.email, 'Cabinet'),
  (CASE WHEN p.account_type = 'enterprise'
        THEN 'entreprise'
        ELSE 'cabinet' END)::atlasbanx.workspace_type,
  p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM atlasbanx.cabinet_members cm WHERE cm.user_id = p.id
);

-- Appartenance DG pour tout workspace dont l'owner n'est pas encore membre
-- (couvre les workspaces créés ci-dessus + d'éventuels workspaces owner-less).
INSERT INTO atlasbanx.cabinet_members (workspace_id, user_id, role, invited_by)
SELECT w.id, w.owner_id, 'dg', w.owner_id
FROM atlasbanx.workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM atlasbanx.cabinet_members cm
  WHERE cm.workspace_id = w.id AND cm.user_id = w.owner_id
);

-- ────────────────────────────────────────────────────────────────────────────
-- B) Stamping workspace_id depuis le workspace possédé par le user
--    (owner_id = user_id → mapping unique pour le backfill 1-par-user).
--    audit_trail.user_id peut être NULL (ON DELETE SET NULL) → ces lignes
--    restent NULL (pas de workspace déterminable).
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  shared_tables text[] := ARRAY[
    'clients', 'bank_accounts', 'bank_statements', 'transactions',
    'analyses', 'anomalies', 'report_drafts', 'generated_reports',
    'user_banks', 'risk_score_history', 'import_history', 'import_drafts',
    'audit_trail', 'proph3t_inferences'
  ];
BEGIN
  FOREACH t IN ARRAY shared_tables LOOP
    CONTINUE WHEN to_regclass('atlasbanx.' || t) IS NULL;
    EXECUTE format($f$
      UPDATE atlasbanx.%I AS tbl
      SET workspace_id = w.id
      FROM atlasbanx.workspaces w
      WHERE w.owner_id = tbl.user_id
        AND tbl.workspace_id IS NULL;
    $f$, t);
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- C) NOT NULL conditionnel : seulement si backfill complet.
--    audit_trail est volontairement exclue (user_id nullable → workspace_id
--    peut rester NULL pour les lignes orphelines).
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  not_null_candidates text[] := ARRAY[
    'clients', 'bank_accounts', 'bank_statements', 'transactions',
    'analyses', 'anomalies', 'report_drafts', 'generated_reports',
    'user_banks', 'risk_score_history', 'import_history', 'import_drafts',
    'proph3t_inferences'
  ];
  null_count bigint;
BEGIN
  FOREACH t IN ARRAY not_null_candidates LOOP
    CONTINUE WHEN to_regclass('atlasbanx.' || t) IS NULL;
    EXECUTE format('SELECT count(*) FROM atlasbanx.%I WHERE workspace_id IS NULL;', t)
      INTO null_count;

    IF null_count = 0 THEN
      EXECUTE format('ALTER TABLE atlasbanx.%I ALTER COLUMN workspace_id SET NOT NULL;', t);
      RAISE NOTICE '[027] %.workspace_id -> NOT NULL (backfill complet)', t;
    ELSE
      RAISE NOTICE '[027] %.workspace_id reste NULLABLE : % ligne(s) sans workspace (user orphelin ?) — a investiguer avant Phase 4', t, null_count;
    END IF;
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
