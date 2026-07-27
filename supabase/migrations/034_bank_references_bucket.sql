-- ============================================================================
-- ATLASBANX — Migration 034 — Bucket des PDF de référentiel mutualisé (L2)
-- ============================================================================
-- Stocke les PDF officiels adossés aux versions de référence banque (preuve
-- documentaire des conditions mutualisées). Privé, mais :
--   - ÉCRITURE réservée aux administrateurs Atlas Studio (profiles.role='admin')
--     → un client ne peut jamais téléverser une source mutualisée ;
--   - LECTURE ouverte aux utilisateurs authentifiés (la preuve documentaire
--     d'une condition partagée doit être consultable par les clients).
--
-- Convention de chemin : <bank_code>/<timestamp>_<filename>.pdf
-- Idempotente.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bank-references', 'bank-references', false, 50 * 1024 * 1024,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Helper : l'utilisateur courant est-il admin ?
-- (inline dans les policies pour éviter une dépendance de fonction)

-- LECTURE — tout utilisateur authentifié (preuve documentaire mutualisée)
DROP POLICY IF EXISTS "bank_references_read" ON storage.objects;
CREATE POLICY "bank_references_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'bank-references');

-- ÉCRITURE (insert) — administrateurs uniquement
DROP POLICY IF EXISTS "bank_references_admin_insert" ON storage.objects;
CREATE POLICY "bank_references_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'bank-references'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- MISE À JOUR — administrateurs uniquement
DROP POLICY IF EXISTS "bank_references_admin_update" ON storage.objects;
CREATE POLICY "bank_references_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'bank-references'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'bank-references'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- SUPPRESSION — administrateurs uniquement
DROP POLICY IF EXISTS "bank_references_admin_delete" ON storage.objects;
CREATE POLICY "bank_references_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'bank-references'
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
