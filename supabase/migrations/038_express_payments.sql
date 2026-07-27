-- ============================================================================
-- ATLASBANX — Migration 038 — Traces de paiement (funnel Particulier)
-- ============================================================================
-- Le funnel Particulier est ÉPHÉMÈRE (aucune donnée d'audit conservée), mais on
-- garde la TRACE DU PAIEMENT (obligation comptable / preuve d'achat). Le relevé
-- et le rapport ne sont jamais stockés ici.
--
-- Écriture réservée au serveur (Edge Functions cinetpay-init / cinetpay-notify
-- via service_role). Lecture réservée aux admins. Aucun accès anonyme.
-- ============================================================================

CREATE TABLE IF NOT EXISTS atlasbanx.express_payments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      text UNIQUE NOT NULL,          -- référence marchande (idempotence)
  transaction_id text,                          -- id prestataire
  provider       text NOT NULL DEFAULT 'cinetpay',
  amount         integer NOT NULL,              -- FCFA (entier)
  currency       text NOT NULL DEFAULT 'XOF',
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','succeeded','failed')),
  plan_id        text,
  months_audited integer,
  customer_email text,
  customer_phone text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_express_payments_status
  ON atlasbanx.express_payments(status, created_at DESC);

ALTER TABLE atlasbanx.express_payments ENABLE ROW LEVEL SECURITY;

-- Serveur (service_role) : tout.
DROP POLICY IF EXISTS "express_payments_service" ON atlasbanx.express_payments;
CREATE POLICY "express_payments_service" ON atlasbanx.express_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins : lecture (suivi des ventes).
DROP POLICY IF EXISTS "express_payments_admin_read" ON atlasbanx.express_payments;
CREATE POLICY "express_payments_admin_read" ON atlasbanx.express_payments
  FOR SELECT TO authenticated USING (public.is_admin());

CREATE TRIGGER trg_express_payments_updated_at
  BEFORE UPDATE ON atlasbanx.express_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

NOTIFY pgrst, 'reload schema';
