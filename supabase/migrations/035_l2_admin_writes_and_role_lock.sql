-- ============================================================================
-- ATLASBANX — Migration 035 — Écriture L2 réservée aux admins + verrou de rôle
-- ============================================================================
-- Deux garde-fous complémentaires pour l'invariant « seul Atlas Studio importe
-- le référentiel mutualisé, jamais un client » :
--
--   1. ÉCRITURE L2 (bank_reference_versions + _conditions) : jusqu'ici réservée
--      à service_role → même un admin authentifié était bloqué (le panneau
--      d'import ne pouvait pas écrire). On ajoute une policy autorisant les
--      administrateurs (is_admin()), qui EXCLUT de fait les clients ('client').
--
--   2. VERROU DE RÔLE : les policies UPDATE de public.profiles étaient
--      `USING (id = auth.uid())` sans WITH CHECK → un client pouvait s'auto-
--      promouvoir `role = 'admin'`. Un trigger BEFORE UPDATE empêche désormais
--      tout non-admin de modifier son propre rôle (réinitialisation silencieuse).
--
-- Idempotente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Écriture L2 pour les administrateurs
-- ----------------------------------------------------------------------------
-- is_admin() renvoie true pour service_role, postgres et les profils
-- role IN ('admin','super_admin') actifs. Les policies service_role et read
-- existantes sont conservées.

DROP POLICY IF EXISTS "bank_ref_versions_admin_write" ON atlasbanx.bank_reference_versions;
CREATE POLICY "bank_ref_versions_admin_write"
  ON atlasbanx.bank_reference_versions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "bank_ref_conditions_admin_write" ON atlasbanx.bank_reference_conditions;
CREATE POLICY "bank_ref_conditions_admin_write"
  ON atlasbanx.bank_reference_conditions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. Verrou anti-élévation de privilège sur profiles.role
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  -- Seul un admin (ou service_role/postgres via is_admin()) peut changer un rôle.
  -- Pour tout autre utilisateur, on ignore silencieusement la tentative en
  -- restaurant l'ancienne valeur — les autres champs du profil restent modifiables.
  if NEW.role IS DISTINCT FROM OLD.role and not public.is_admin() then
    NEW.role := OLD.role;
  end if;
  return NEW;
end;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

NOTIFY pgrst, 'reload schema';
