-- New-user onboarding: account type, field of work and acquisition source, stored on the profile.
-- Accounts that existed before this migration are marked as onboarded so they are not interrupted.
-- Rollback:
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS account_type, DROP COLUMN IF EXISTS organization_name,
--     DROP COLUMN IF EXISTS work_domain, DROP COLUMN IF EXISTS work_domain_other, DROP COLUMN IF EXISTS referral_source,
--     DROP COLUMN IF EXISTS referral_other, DROP COLUMN IF EXISTS onboarded_at;
--   DROP FUNCTION IF EXISTS public.admin_onboarding_stats();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text CHECK (account_type IN ('individual', 'organization')),
  ADD COLUMN IF NOT EXISTS organization_name text CHECK (char_length(organization_name) <= 120),
  ADD COLUMN IF NOT EXISTS work_domain text CHECK (work_domain IN ('designer', 'developer', 'senior_engineer', 'data_ai', 'devops_cloud', 'cybersecurity', 'product_project', 'marketing_digital', 'student', 'entrepreneur', 'other')),
  ADD COLUMN IF NOT EXISTS work_domain_other text CHECK (char_length(work_domain_other) <= 120),
  ADD COLUMN IF NOT EXISTS referral_source text CHECK (referral_source IN ('facebook', 'instagram', 'tiktok', 'whatsapp', 'youtube', 'linkedin', 'x_twitter', 'google', 'word_of_mouth', 'event', 'other')),
  ADD COLUMN IF NOT EXISTS referral_other text CHECK (char_length(referral_other) <= 120),
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;

UPDATE public.profiles SET onboarded_at = created_at WHERE onboarded_at IS NULL;

-- Admin: aggregated answers only (no personal data).
CREATE OR REPLACE FUNCTION public.admin_onboarding_stats()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'account_type', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT account_type k, count(*) n FROM profiles WHERE account_type IS NOT NULL GROUP BY 1) a),
    'work_domain', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT work_domain k, count(*) n FROM profiles WHERE work_domain IS NOT NULL GROUP BY 1) d),
    'referral_source', (SELECT coalesce(jsonb_object_agg(k, n), '{}'::jsonb) FROM (SELECT referral_source k, count(*) n FROM profiles WHERE referral_source IS NOT NULL GROUP BY 1) r)
  );
$$;
REVOKE ALL ON FUNCTION public.admin_onboarding_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_onboarding_stats() TO service_role;
