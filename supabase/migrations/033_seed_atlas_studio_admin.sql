-- ============================================================================
-- ATLASBANX — Migration 033 — Compte administrateur Atlas Studio
-- ============================================================================
-- Désigne pamela.atokouna@yahoo.com comme administrateur Atlas Studio :
-- seul un profil `role = 'admin'` accède à la console d'import des conditions
-- mutualisées (/atlas-studio). Les comptes clients restent 'auditor'/'viewer'.
--
-- Deux volets, pour couvrir « compte déjà créé » ET « inscription future » :
--   1. bascule le profil existant en admin (no-op s'il n'existe pas encore) ;
--   2. étend le trigger d'inscription pour attribuer 'admin' à cet email.
--
-- Idempotente. La comparaison d'email est insensible à la casse.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Profil déjà existant → admin
-- ----------------------------------------------------------------------------
UPDATE public.profiles
   SET role = 'admin',
       updated_at = NOW()
 WHERE lower(email) = 'pamela.atokouna@yahoo.com'
   AND role IS DISTINCT FROM 'admin';

-- ----------------------------------------------------------------------------
-- 2. Inscription future → admin pour l'email all-listé
-- ----------------------------------------------------------------------------
-- On redéfinit handle_new_user() en conservant son comportement d'origine
-- (création du profil + settings), en ajoutant l'attribution du rôle admin
-- pour les emails de l'allowlist Atlas Studio.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  -- Allowlist des administrateurs Atlas Studio (emails en minuscules).
  admin_emails TEXT[] := ARRAY['pamela.atokouna@yahoo.com'];
  resolved_role public.user_role;
BEGIN
  resolved_role := CASE
    WHEN lower(NEW.email) = ANY (admin_emails) THEN 'admin'::public.user_role
    ELSE 'auditor'::public.user_role
  END;

  -- Create profile (avec rôle résolu)
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    resolved_role
  );

  -- Create empty settings
  INSERT INTO public.user_settings (user_id, settings)
  VALUES (NEW.id, '{}');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
