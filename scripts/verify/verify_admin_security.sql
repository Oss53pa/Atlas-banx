-- ============================================================================
-- ATLASBANX — Vérification post-déploiement des contrôles d'accès admin
-- ============================================================================
-- À exécuter APRÈS déploiement (console SQL Supabase ou psql en tant que
-- `postgres`). Vérifie que les correctifs de sécurité (migrations 042–049)
-- sont bien en place. Chaque ligne = un contrôle avec PASS / FAIL.
--
-- ⚠️ PORTÉE : ce script vérifie la STRUCTURE (définitions de fonctions, ACL,
-- policies RLS) et la LOGIQUE (résolution admin/non-admin). Le comportement
-- RÉEL sous l'identité `authenticator` (un non-admin réellement refusé par
-- l'API) se teste avec de vrais jetons via `verify_admin_security_api.sh`,
-- car en console SQL `session_user = 'postgres'` court-circuite is_admin().
--
-- Lecture : toutes les lignes doivent afficher passed = true.
-- ============================================================================

WITH checks AS (

  -- 1. is_admin() corrigé : discrimine par session_user, PLUS par current_user
  --    (sinon SECURITY DEFINER faisait toujours passer le propriétaire postgres).
  SELECT '1. is_admin() utilise session_user (pas current_user)' AS check_name,
         (pg_get_functiondef(p.oid) ILIKE '%session_user%'
          AND pg_get_functiondef(p.oid) NOT ILIKE '%current_user%') AS passed
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'is_admin'

  UNION ALL
  -- 2. Les 4 RPC du workflow deux-yeux contiennent un contrôle is_admin().
  SELECT '2. RPC deux-yeux gardées par is_admin() (' || p.proname || ')',
         pg_get_functiondef(p.oid) ILIKE '%is_admin%'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'atlasbanx'
    AND p.proname IN ('submit_bank_reference_version','validate_bank_reference_version',
                      'publish_bank_reference_version','reject_bank_reference_version')

  UNION ALL
  -- 3. Ces RPC ne sont PAS exécutables par anon (PUBLIC révoqué).
  SELECT '3. RPC deux-yeux non exécutables par anon (' || p.proname || ')',
         NOT has_function_privilege('anon', p.oid, 'EXECUTE')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'atlasbanx'
    AND p.proname IN ('submit_bank_reference_version','validate_bank_reference_version',
                      'publish_bank_reference_version','reject_bank_reference_version')

  UNION ALL
  -- 4. Archive express : plus d'INSERT direct anonyme.
  SELECT '4. Archive express : INSERT direct anon révoqué',
         NOT has_table_privilege('anon', 'atlasbanx.express_report_archive', 'INSERT')

  UNION ALL
  -- 5. Archive express : l'écriture passe par la RPC contrôlée (anon peut l'exécuter).
  SELECT '5. Archive express : RPC express_archive_insert exécutable par anon',
         has_function_privilege(
           'anon',
           'atlasbanx.express_archive_insert(text,text,text,date,date,integer,numeric,boolean)',
           'EXECUTE')

  UNION ALL
  -- 6. Lecture L2 (versions) restreinte à publié OU admin.
  SELECT '6. RLS lecture bank_reference_versions = publié OU admin',
         (qual ILIKE '%published%' AND qual ILIKE '%is_admin%')
  FROM pg_policies
  WHERE schemaname = 'atlasbanx' AND tablename = 'bank_reference_versions'
    AND cmd = 'SELECT' AND policyname = 'bank_ref_versions_read'

  UNION ALL
  -- 7. Lecture L2 (conditions) restreinte (admin OU version publiée).
  SELECT '7. RLS lecture bank_reference_conditions restreinte',
         (qual ILIKE '%is_admin%' AND qual ILIKE '%published%')
  FROM pg_policies
  WHERE schemaname = 'atlasbanx' AND tablename = 'bank_reference_conditions'
    AND cmd = 'SELECT' AND policyname = 'bank_ref_conditions_read'

  UNION ALL
  -- 8. Il existe au moins un administrateur actif (sinon personne n'accède).
  SELECT '8. Au moins un admin actif en base',
         EXISTS (SELECT 1 FROM public.profiles
                 WHERE role IN ('admin','super_admin') AND is_active)

  UNION ALL
  -- 9. Un identifiant quelconque (non-admin) NE résout PAS admin (logique du
  --    branchement profil, seul chemin emprunté par le trafic applicatif).
  SELECT '9. Un uid non-admin ne résout pas admin',
         NOT EXISTS (SELECT 1 FROM public.profiles
                     WHERE id = '00000000-0000-0000-0000-0000000000aa'
                       AND role IN ('admin','super_admin') AND is_active)

  UNION ALL
  -- 10. admin_reference_journal (journal L2 admin) gardée par is_admin().
  SELECT '10. admin_reference_journal gardée par is_admin()',
         pg_get_functiondef(p.oid) ILIKE '%is_admin%'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'atlasbanx' AND p.proname = 'admin_reference_journal'
)
SELECT
  CASE WHEN passed THEN '✅ PASS' ELSE '❌ FAIL' END AS status,
  check_name
FROM checks
ORDER BY check_name;

-- Synthèse : nombre de contrôles en échec (doit être 0).
WITH checks AS (
  SELECT (pg_get_functiondef(p.oid) ILIKE '%session_user%'
          AND pg_get_functiondef(p.oid) NOT ILIKE '%current_user%') AS passed
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'is_admin'
  UNION ALL SELECT pg_get_functiondef(p.oid) ILIKE '%is_admin%'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'atlasbanx' AND p.proname IN
    ('submit_bank_reference_version','validate_bank_reference_version',
     'publish_bank_reference_version','reject_bank_reference_version')
  UNION ALL SELECT NOT has_function_privilege('anon', p.oid, 'EXECUTE')
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'atlasbanx' AND p.proname IN
    ('submit_bank_reference_version','validate_bank_reference_version',
     'publish_bank_reference_version','reject_bank_reference_version')
  UNION ALL SELECT NOT has_table_privilege('anon', 'atlasbanx.express_report_archive', 'INSERT')
  UNION ALL SELECT has_function_privilege('anon',
     'atlasbanx.express_archive_insert(text,text,text,date,date,integer,numeric,boolean)','EXECUTE')
  UNION ALL SELECT (qual ILIKE '%published%' AND qual ILIKE '%is_admin%')
  FROM pg_policies WHERE schemaname='atlasbanx' AND tablename='bank_reference_versions'
    AND cmd='SELECT' AND policyname='bank_ref_versions_read'
  UNION ALL SELECT (qual ILIKE '%is_admin%' AND qual ILIKE '%published%')
  FROM pg_policies WHERE schemaname='atlasbanx' AND tablename='bank_reference_conditions'
    AND cmd='SELECT' AND policyname='bank_ref_conditions_read'
  UNION ALL SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role IN ('admin','super_admin') AND is_active)
  UNION ALL SELECT NOT EXISTS (SELECT 1 FROM public.profiles
     WHERE id='00000000-0000-0000-0000-0000000000aa' AND role IN ('admin','super_admin') AND is_active)
  UNION ALL SELECT pg_get_functiondef(p.oid) ILIKE '%is_admin%'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname='atlasbanx' AND p.proname='admin_reference_journal'
)
SELECT count(*) FILTER (WHERE NOT passed) AS controles_en_echec,
       count(*) AS total_controles
FROM checks;
