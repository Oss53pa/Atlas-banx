-- ============================================================================
-- ATLASBANX — Migration 037 — Périmètre client des conditions particulières
-- ============================================================================
-- Les conditions particulières (grilles saisies par le client/cabinet) étaient
-- attachées à (user_id, bank_id) — donc PARTAGÉES entre tous les clients d'un
-- même cabinet. En mode cabinet, le taux négocié du client A fuitait dans
-- l'audit du client B.
--
-- On ajoute une dimension de périmètre `scope` :
--   - 'self'                → compte entreprise (une seule entité) / défaut ;
--   - <id du client>        → en mode cabinet, conditions propres à ce client.
--
-- L'unicité passe de (user_id, bank_id) à (user_id, scope, bank_id). La RLS
-- reste inchangée (owner-only par user_id) : tout appartient au cabinet.
--
-- Idempotente. Les lignes existantes basculent en 'self' via le DEFAULT.
-- ============================================================================

ALTER TABLE atlasbanx.user_banks
  ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'self';

ALTER TABLE atlasbanx.user_banks
  DROP CONSTRAINT IF EXISTS user_banks_user_id_bank_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_banks_user_scope_bank_key'
      AND conrelid = 'atlasbanx.user_banks'::regclass
  ) THEN
    ALTER TABLE atlasbanx.user_banks
      ADD CONSTRAINT user_banks_user_scope_bank_key UNIQUE (user_id, scope, bank_id);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_banks_user_scope
  ON atlasbanx.user_banks(user_id, scope);

NOTIFY pgrst, 'reload schema';
