-- ============================================================================
-- ATLASBANX — Migration 049 — Correctif CRITIQUE de public.is_admin()
-- ============================================================================
-- FAILLE : is_admin() est SECURITY DEFINER, propriété de `postgres`. Or, DANS
-- une fonction SECURITY DEFINER, `current_user` vaut le PROPRIÉTAIRE (postgres),
-- pas l'appelant. La ligne `IF current_user = 'postgres' THEN return true` était
-- donc TOUJOURS vraie → is_admin() renvoyait `true` pour N'IMPORTE QUEL appelant
-- (y compris un simple compte authentifié ou anonyme).
--
-- Conséquence : TOUS les verrous admin (RLS « Admins », policies d'écriture L2,
-- RPC 042/045/046/047, lecture 048) étaient inopérants — n'importe quel compte
-- passait pour admin côté base.
--
-- CORRECTIF : on discrimine le contexte d'administration par `session_user`
-- (le rôle de connexion RÉEL, insensible à SECURITY DEFINER). En production,
-- PostgREST se connecte comme `authenticator` (jamais `postgres`) ; seuls les
-- migrations / la console DB se connectent comme `postgres`/`supabase_admin`.
-- Le rôle `service_role` (Edge Functions) reste reconnu via auth.role().
-- Un vrai admin passe désormais UNIQUEMENT par le contrôle sur profiles.role.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  -- Edge Functions (clé service) : légitimement admin.
  if auth.role() = 'service_role' then
    return true;
  end if;
  -- Contexte migration / console DB : rôle de CONNEXION réel (session_user),
  -- NON altéré par SECURITY DEFINER (contrairement à current_user).
  if session_user in ('postgres', 'supabase_admin') then
    return true;
  end if;
  -- Cas général : l'appelant doit avoir un profil admin actif.
  return exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
      and is_active = true
  );
end;
$function$;
