-- ============================================================================
-- ATLASBANX — Migration 029 — Multi-tenant par org : Phase 4 (bascule RLS)
-- ============================================================================
-- LE MOMENT SENSIBLE. Remplace les policies par-utilisateur (user_id =
-- auth.uid()) par des policies par-workspace via auth_workspace_ids().
--
-- Matrice de droits (décision produit validée) :
--   • LECTURE  = tout membre du workspace            → auth_workspace_ids()
--   • INSERT   = junior+ (dg/senior/junior)          → auth_workspace_ids('junior')
--                + user_id = auth.uid() (provenance "créé par", client-side)
--   • UPDATE   = junior+                             → auth_workspace_ids('junior')
--   • DELETE   = senior+ (dg/senior)                 → auth_workspace_ids('senior')
--   consultation = lecture seule (aucun floor d'écriture ne l'inclut).
--
-- Le service-role (Edge Functions) contourne la RLS : inchangé.
-- Le trigger Phase 3 (028) a déjà rempli workspace_id AVANT l'évaluation des
-- WITH CHECK ci-dessous.
--
-- Tables PERSONNELLES NON concernées (restent user_id = auth.uid()) :
--   user_settings, user_consents, data_deletion_requests, ip_allowlists,
--   user_ai_keys, billing_settings, invoices, invoice_lines.
-- CDC et tables de référence : inchangées.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- Helper interne : supprime TOUTES les policies existantes d'une table (évite
-- de dépendre des noms hétérogènes hérités des migrations 003/006/.../024).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atlasbanx._drop_all_policies(p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'atlasbanx' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON atlasbanx.%I;', pol.policyname, p_table);
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1) Tables racines — CRUD complet (lecture membre / écriture junior+ /
--    suppression senior+).
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  full_crud text[] := ARRAY[
    'clients','bank_accounts','bank_statements','transactions',
    'analyses','anomalies','report_drafts','import_drafts','user_banks'
  ];
BEGIN
  FOREACH t IN ARRAY full_crud LOOP
    CONTINUE WHEN to_regclass('atlasbanx.' || t) IS NULL;
    PERFORM atlasbanx._drop_all_policies(t);

    EXECUTE format($p$
      CREATE POLICY ws_select ON atlasbanx.%I FOR SELECT
        USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids()));
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY ws_insert ON atlasbanx.%I FOR INSERT
        WITH CHECK (
          workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))
          AND user_id = auth.uid()
        );
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY ws_update ON atlasbanx.%I FOR UPDATE
        USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior')))
        WITH CHECK (workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior')));
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY ws_delete ON atlasbanx.%I FOR DELETE
        USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids('senior')));
    $p$, t);
  END LOOP;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2) Tables append-only (lecture membre / insert junior+ ; pas d'update/delete).
--    audit_trail : insert ouvert à tout membre (pas de floor, user_id nullable)
--    — l'immuabilité reste assurée par le trigger anti-mutation + les GRANT.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t text;
  append_only text[] := ARRAY['risk_score_history','import_history','proph3t_inferences'];
BEGIN
  FOREACH t IN ARRAY append_only LOOP
    CONTINUE WHEN to_regclass('atlasbanx.' || t) IS NULL;
    PERFORM atlasbanx._drop_all_policies(t);
    EXECUTE format($p$
      CREATE POLICY ws_select ON atlasbanx.%I FOR SELECT
        USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids()));
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY ws_insert ON atlasbanx.%I FOR INSERT
        WITH CHECK (
          workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))
          AND user_id = auth.uid()
        );
    $p$, t);
  END LOOP;
END;
$$;

-- audit_trail : lecture membre / insert tout membre (user_id peut être NULL)
SELECT atlasbanx._drop_all_policies('audit_trail');
CREATE POLICY ws_select ON atlasbanx.audit_trail FOR SELECT
  USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids()));
CREATE POLICY ws_insert ON atlasbanx.audit_trail FOR INSERT
  WITH CHECK (workspace_id IN (SELECT atlasbanx.auth_workspace_ids()));

-- ────────────────────────────────────────────────────────────────────────────
-- 3) generated_reports — historique immuable : lecture membre / insert junior+ /
--    delete senior+ (PAS d'update, conforme à la migration 011).
-- ────────────────────────────────────────────────────────────────────────────
SELECT atlasbanx._drop_all_policies('generated_reports');
CREATE POLICY ws_select ON atlasbanx.generated_reports FOR SELECT
  USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids()));
CREATE POLICY ws_insert ON atlasbanx.generated_reports FOR INSERT
  WITH CHECK (
    workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))
    AND user_id = auth.uid()
  );
CREATE POLICY ws_delete ON atlasbanx.generated_reports FOR DELETE
  USING (workspace_id IN (SELECT atlasbanx.auth_workspace_ids('senior')));

-- ────────────────────────────────────────────────────────────────────────────
-- 4) Tables dérivées — ownership via la table parente (qui porte workspace_id).
--    Lecture = parent visible par un membre ; écriture = parent + junior+ ;
--    delete = parent + senior+.
--    Helper inline : EXISTS sur le parent filtré par workspace + rôle.
-- ────────────────────────────────────────────────────────────────────────────

-- anomaly_comments → anomalies
SELECT atlasbanx._drop_all_policies('anomaly_comments');
CREATE POLICY ws_select ON atlasbanx.anomaly_comments FOR SELECT USING (
  EXISTS (SELECT 1 FROM atlasbanx.anomalies a
          WHERE a.id = anomaly_comments.anomaly_id
            AND a.workspace_id IN (SELECT atlasbanx.auth_workspace_ids())));
CREATE POLICY ws_insert ON atlasbanx.anomaly_comments FOR INSERT WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (SELECT 1 FROM atlasbanx.anomalies a
              WHERE a.id = anomaly_comments.anomaly_id
                AND a.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))));
CREATE POLICY ws_delete ON atlasbanx.anomaly_comments FOR DELETE USING (
  EXISTS (SELECT 1 FROM atlasbanx.anomalies a
          WHERE a.id = anomaly_comments.anomaly_id
            AND a.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('senior'))));

-- account_conventions → bank_accounts
SELECT atlasbanx._drop_all_policies('account_conventions');
CREATE POLICY ws_all ON atlasbanx.account_conventions FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_accounts a
                 WHERE a.id = account_conventions.account_id
                   AND a.workspace_id IN (SELECT atlasbanx.auth_workspace_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_accounts a
                 WHERE a.id = account_conventions.account_id
                   AND a.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))));

-- signed_reports → bank_statements (immuable côté contenu ; FOR ALL borné par parent)
SELECT atlasbanx._drop_all_policies('signed_reports');
CREATE POLICY ws_all ON atlasbanx.signed_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s
                 WHERE s.id = signed_reports.statement_id
                   AND s.workspace_id IN (SELECT atlasbanx.auth_workspace_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s
                 WHERE s.id = signed_reports.statement_id
                   AND s.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))));

-- bank_complaint_letters → bank_statements
SELECT atlasbanx._drop_all_policies('bank_complaint_letters');
CREATE POLICY ws_all ON atlasbanx.bank_complaint_letters FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s
                 WHERE s.id = bank_complaint_letters.statement_id
                   AND s.workspace_id IN (SELECT atlasbanx.auth_workspace_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s
                 WHERE s.id = bank_complaint_letters.statement_id
                   AND s.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))));

-- bank_reconciliations → bank_statements (remplace bank_recon_authenticated)
SELECT atlasbanx._drop_all_policies('bank_reconciliations');
CREATE POLICY ws_all ON atlasbanx.bank_reconciliations FOR ALL
  USING (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s
                 WHERE s.id = bank_reconciliations.statement_id
                   AND s.workspace_id IN (SELECT atlasbanx.auth_workspace_ids())))
  WITH CHECK (EXISTS (SELECT 1 FROM atlasbanx.bank_statements s
                 WHERE s.id = bank_reconciliations.statement_id
                   AND s.workspace_id IN (SELECT atlasbanx.auth_workspace_ids('junior'))));

-- Nettoyage du helper interne (optionnel — on le garde pas en prod)
DROP FUNCTION atlasbanx._drop_all_policies(text);

NOTIFY pgrst, 'reload schema';
