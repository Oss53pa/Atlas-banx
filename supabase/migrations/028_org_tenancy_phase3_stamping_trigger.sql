-- ============================================================================
-- ATLASBANX — Migration 028 — Multi-tenant par org : Phase 3 (stamping auto)
-- ============================================================================
-- Renseigne automatiquement workspace_id à l'INSERT, côté serveur, à partir de
-- l'appartenance de auth.uid(). Bénéfices :
--   • couvre TOUS les chemins d'insert client-side sans toucher au code TS
--     (aucun risque d'oublier un repo → plus de violation NOT NULL) ;
--   • plus sûr : le client ne peut pas falsifier workspace_id — il est dérivé
--     du membership réel, pas de la charge utile (defense in depth) ;
--   • compose avec les WITH CHECK de la Phase 4 : le trigger BEFORE INSERT
--     s'exécute AVANT l'évaluation RLS, donc la ligne présentée au WITH CHECK
--     porte déjà le bon workspace_id.
--
-- Couvre AUSSI les inserts service-role (Edge Functions) : quand auth.uid()
-- est NULL, le trigger retombe sur NEW.user_id (que les fonctions renseignent
-- déjà) pour dériver le workspace. Résultat : Phase 3 = une seule migration
-- DB, zéro changement Edge/TS. Si ni auth.uid() ni user_id ne donnent de
-- workspace, NULL persiste → la colonne NOT NULL rejette l'insert (fail-safe).
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Fonction de défaut : workspace de COALESCE(auth.uid(), NEW.user_id).
--   • client-side : auth.uid() prioritaire (le client ne peut pas falsifier —
--     les inserts forcent user_id = auth.uid()) ;
--   • service-role : auth.uid() NULL → fallback sur NEW.user_id (trusted).
-- SECURITY DEFINER pour lire cabinet_members sans dépendre de la RLS.
-- ORDER BY created_at = choix déterministe si plusieurs appartenances (cas non
-- nominal aujourd'hui : 1 workspace par user).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atlasbanx.set_workspace_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = atlasbanx, public
AS $$
DECLARE
  v_owner uuid := COALESCE(auth.uid(), NEW.user_id);
BEGIN
  IF NEW.workspace_id IS NULL AND v_owner IS NOT NULL THEN
    SELECT cm.workspace_id
    INTO NEW.workspace_id
    FROM atlasbanx.cabinet_members cm
    WHERE cm.user_id = v_owner
    ORDER BY cm.created_at ASC
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION atlasbanx.set_workspace_id_default() IS
  'BEFORE INSERT : renseigne workspace_id depuis le membership de COALESCE(auth.uid(), NEW.user_id) si absent. Couvre client-side ET service-role. Dérivation server-side = anti-falsification.';

-- ────────────────────────────────────────────────────────────────────────────
-- Attache le trigger BEFORE INSERT sur les 14 tables métier partagées.
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
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_workspace_id ON atlasbanx.%I;', t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_workspace_id BEFORE INSERT ON atlasbanx.%I '
      || 'FOR EACH ROW EXECUTE FUNCTION atlasbanx.set_workspace_id_default();',
      t
    );
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
