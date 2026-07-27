-- ============================================================================
-- ATLASBANX — Migration 033 — Compte administrateur Atlas Studio
-- ============================================================================
-- Désigne pamela.atokouna@yahoo.com comme administrateur Atlas Studio :
-- seul un profil `role = 'admin'` accède à la console d'import des conditions
-- mutualisées (/atlas-studio). Les comptes clients restent 'client'.
--
-- NB : sur la base déployée, public.profiles.role est une colonne TEXT
-- (défaut 'client'), et non l'enum public.user_role. Cette migration reflète
-- le schéma réel. Deux volets :
--   1. bascule le profil existant en admin (no-op s'il n'existe pas) ;
--   2. étend le trigger d'inscription (préservé à l'identique) pour attribuer
--      'admin' aux emails de l'allowlist Atlas Studio.
--
-- Idempotente. Comparaison d'email insensible à la casse.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profil déjà existant → admin
-- ----------------------------------------------------------------------------
UPDATE public.profiles
   SET role = 'admin', updated_at = NOW()
 WHERE lower(email) = 'pamela.atokouna@yahoo.com'
   AND role IS DISTINCT FROM 'admin';

-- ----------------------------------------------------------------------------
-- 2. Inscription future → admin pour l'email all-listé
-- ----------------------------------------------------------------------------
-- Reprend la définition déployée de handle_new_user (colonnes first_name /
-- last_name / full_name, gestion d'erreur non bloquante, on conflict) et
-- ajoute uniquement l'attribution du rôle. Non-admin → 'client' (défaut réel).
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
    insert into public.profiles (id, email, first_name, last_name, full_name, role)
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
      case when lower(new.email) = any(admin_emails) then 'admin' else 'client' end
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: skipped profile insert for %: % (%)',
      new.id, sqlerrm, sqlstate;
  end;
  return new;
end;
$function$;

NOTIFY pgrst, 'reload schema';
