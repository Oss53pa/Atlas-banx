-- ============================================================================
-- ATLASBANX — Migration 036 — Le type de compte suit le plan (non modifiable)
-- ============================================================================
-- Le type de compte (entreprise/cabinet) est fixé à la souscription et ne doit
-- plus être changé librement par l'utilisateur (le bascule UI a été retiré).
--
--   1. handle_new_user lit désormais account_type depuis les métadonnées
--      d'inscription (raw_user_meta_data.account_type, posé par signUp) → le
--      choix fait à la souscription est honoré à la CRÉATION du profil (INSERT,
--      qui contourne le verrou d'UPDATE ci-dessous). Défaut : 'enterprise'.
--   2. Le trigger de verrou (déjà en place pour role) gèle aussi account_type :
--      un non-admin ne peut plus le modifier après coup. Les changements
--      légitimes (upgrade/downgrade de plan) passent par un admin / service_role.
--
-- Idempotente.
-- ============================================================================

-- 1. handle_new_user : rôle (allowlist) + account_type (métadonnées)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  admin_emails text[] := array['pamela.atokouna@yahoo.com'];
begin
  begin
    insert into public.profiles (id, email, first_name, last_name, full_name, role, account_type)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'first_name', ''),
      coalesce(new.raw_user_meta_data->>'last_name', ''),
      coalesce(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'display_name',
        new.raw_user_meta_data->>'name',
        nullif(trim(
          coalesce(new.raw_user_meta_data->>'first_name', '')
          || ' '
          || coalesce(new.raw_user_meta_data->>'last_name', '')
        ), ''),
        split_part(coalesce(new.email, ''), '@', 1)
      ),
      case when lower(new.email) = any(admin_emails) then 'admin' else 'client' end,
      coalesce(new.raw_user_meta_data->>'account_type', 'enterprise')
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: skipped profile insert for %: % (%)',
      new.id, sqlerrm, sqlstate;
  end;
  return new;
end;
$function$;

-- 2. Verrou : role ET account_type non modifiables par un non-admin
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
begin
  -- Seul un admin (ou service_role/postgres via is_admin()) peut modifier ces
  -- champs privilégiés ; sinon on restaure silencieusement l'ancienne valeur.
  if NEW.role IS DISTINCT FROM OLD.role and not public.is_admin() then
    NEW.role := OLD.role;
  end if;
  if NEW.account_type IS DISTINCT FROM OLD.account_type and not public.is_admin() then
    NEW.account_type := OLD.account_type;
  end if;
  return NEW;
end;
$function$;

NOTIFY pgrst, 'reload schema';
