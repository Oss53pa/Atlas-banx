-- ============================================================================
-- ROLLBACK — Migration 029 (bascule RLS par workspace) → retour per-user
-- ============================================================================
-- ⚠️ SCRIPT MANUEL "BREAK-GLASS" — N'EST PAS dans supabase/migrations/ et ne
-- doit JAMAIS être rejoué automatiquement. À exécuter via MCP uniquement si la
-- bascule par workspace pose un problème en prod et qu'on veut revenir à
-- l'isolation par utilisateur (user_id = auth.uid()).
--
-- Ce script :
--   • supprime les policies workspace (ws_*) posées par 029 ;
--   • restaure des policies per-user équivalentes à l'état pré-029 (migr.
--     003/006/.../024) ;
--   • NE touche PAS aux colonnes workspace_id ni au trigger 028 (inoffensifs :
--     workspace_id reste rempli mais n'est plus lu par la RLS).
--
-- Résilient : guards to_regclass (12/14 tables seulement en prod).
-- ============================================================================

CREATE OR REPLACE FUNCTION atlasbanx._drop_all_policies(p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='atlasbanx' AND tablename=p_table
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON atlasbanx.%I;', pol.policyname, p_table); END LOOP;
END; $$;

-- ── Tables racines CRUD complet → per-user (select/insert/update/delete) ──
DO $$
DECLARE t text;
  full_crud text[] := ARRAY['clients','bank_accounts','bank_statements','transactions','analyses','anomalies','report_drafts','import_drafts','user_banks'];
BEGIN
  FOREACH t IN ARRAY full_crud LOOP
    CONTINUE WHEN to_regclass('atlasbanx.'||t) IS NULL;
    PERFORM atlasbanx._drop_all_policies(t);
    EXECUTE format('CREATE POLICY pu_select ON atlasbanx.%I FOR SELECT USING (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY pu_insert ON atlasbanx.%I FOR INSERT WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY pu_update ON atlasbanx.%I FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY pu_delete ON atlasbanx.%I FOR DELETE USING (user_id = auth.uid());', t);
  END LOOP;
END; $$;

-- ── Tables append-only → per-user (select/insert) ──
DO $$
DECLARE t text;
  append_only text[] := ARRAY['risk_score_history','import_history','proph3t_inferences'];
BEGIN
  FOREACH t IN ARRAY append_only LOOP
    CONTINUE WHEN to_regclass('atlasbanx.'||t) IS NULL;
    PERFORM atlasbanx._drop_all_policies(t);
    EXECUTE format('CREATE POLICY pu_select ON atlasbanx.%I FOR SELECT USING (user_id = auth.uid());', t);
    EXECUTE format('CREATE POLICY pu_insert ON atlasbanx.%I FOR INSERT WITH CHECK (user_id = auth.uid());', t);
  END LOOP;
END; $$;

-- ── audit_trail → per-user (select/insert) ──
SELECT atlasbanx._drop_all_policies('audit_trail');
CREATE POLICY pu_select ON atlasbanx.audit_trail FOR SELECT USING (user_id = auth.uid());
CREATE POLICY pu_insert ON atlasbanx.audit_trail FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ── generated_reports → per-user (select/insert/delete, immuable) ──
SELECT atlasbanx._drop_all_policies('generated_reports');
CREATE POLICY pu_select ON atlasbanx.generated_reports FOR SELECT USING (user_id = auth.uid());
CREATE POLICY pu_insert ON atlasbanx.generated_reports FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY pu_delete ON atlasbanx.generated_reports FOR DELETE USING (user_id = auth.uid());

-- ── Tables dérivées → per-user via parent (état migr. 024) ──
SELECT atlasbanx._drop_all_policies('anomaly_comments');
CREATE POLICY pu_select ON atlasbanx.anomaly_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM atlasbanx.anomalies a WHERE a.id=anomaly_comments.anomaly_id AND a.user_id=auth.uid()));
CREATE POLICY pu_insert ON atlasbanx.anomaly_comments FOR INSERT WITH CHECK (
  author_id=auth.uid() AND EXISTS (SELECT 1 FROM atlasbanx.anomalies a WHERE a.id=anomaly_comments.anomaly_id AND a.user_id=auth.uid()));

SELECT atlasbanx._drop_all_policies('account_conventions');
CREATE POLICY pu_all ON atlasbanx.account_conventions FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_accounts a WHERE a.id=account_conventions.account_id AND a.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_accounts a WHERE a.id=account_conventions.account_id AND a.user_id=auth.uid()));

SELECT atlasbanx._drop_all_policies('signed_reports');
CREATE POLICY pu_all ON atlasbanx.signed_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s WHERE s.id=signed_reports.statement_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s WHERE s.id=signed_reports.statement_id AND s.user_id=auth.uid()));

SELECT atlasbanx._drop_all_policies('bank_complaint_letters');
CREATE POLICY pu_all ON atlasbanx.bank_complaint_letters FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s WHERE s.id=bank_complaint_letters.statement_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s WHERE s.id=bank_complaint_letters.statement_id AND s.user_id=auth.uid()));

SELECT atlasbanx._drop_all_policies('bank_reconciliations');
CREATE POLICY pu_all ON atlasbanx.bank_reconciliations FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s WHERE s.id=bank_reconciliations.statement_id AND s.user_id=auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s WHERE s.id=bank_reconciliations.statement_id AND s.user_id=auth.uid()));

DROP FUNCTION atlasbanx._drop_all_policies(text);
NOTIFY pgrst, 'reload schema';
