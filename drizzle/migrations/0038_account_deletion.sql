-- Account deletion requested from Settings: the account and its data are kept 30 days (the person can
-- cancel by signing in again), then the daily purge (/api/public/media-purge) deletes the stored files and
-- the auth user, which cascades to every table that references it.
-- Rollback:
--   DROP TABLE IF EXISTS public.account_deletions;

CREATE TABLE IF NOT EXISTS public.account_deletions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at timestamptz NOT NULL DEFAULT now(),
  purge_after timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_deletions FROM anon, authenticated;
-- The owner may read their own request (the dashboard banner); writes go through server functions only.
GRANT SELECT ON public.account_deletions TO authenticated;
DROP POLICY IF EXISTS "own account deletion readable" ON public.account_deletions;
CREATE POLICY "own account deletion readable" ON public.account_deletions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT ALL ON public.account_deletions TO service_role;
CREATE INDEX IF NOT EXISTS account_deletions_purge_idx ON public.account_deletions (purge_after);
