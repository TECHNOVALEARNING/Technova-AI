-- Phase 9 (V5.3) security fix: shared preview links can only be created by the server, which runs
-- the secret and anti-phishing checks. Before, the browser could insert a public preview directly.
-- Owners can still read and delete (disable) their own links.
-- Rollback:
--   GRANT INSERT ON public.studio_previews TO authenticated;
--   CREATE POLICY "Owners can create previews" ON public.studio_previews FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners can create previews" ON public.studio_previews;
REVOKE INSERT, UPDATE ON public.studio_previews FROM authenticated, anon;
