-- Phase 8 (V5.3) — reporting and suspension of published sites.
-- Visitors report a site; 3 distinct reporters within 7 days suspend it automatically until an admin reviews it.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.report_site(text, text, text, text);
--   DROP FUNCTION IF EXISTS public.admin_set_site_suspension(uuid, text, boolean, text);
--   DROP TABLE IF EXISTS public.site_reports;
--   ALTER TABLE public.published_sites DROP COLUMN IF EXISTS disabled_at, DROP COLUMN IF EXISTS disabled_reason;

ALTER TABLE public.published_sites ADD COLUMN IF NOT EXISTS disabled_at timestamptz;
ALTER TABLE public.published_sites ADD COLUMN IF NOT EXISTS disabled_reason text;

CREATE TABLE IF NOT EXISTS public.site_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.published_sites(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('phishing', 'scam', 'malware', 'illegal', 'other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 500),
  reporter_hash text NOT NULL CHECK (char_length(reporter_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site_id, reporter_hash)
);
CREATE INDEX IF NOT EXISTS site_reports_site_idx ON public.site_reports (site_id, created_at DESC);
GRANT ALL ON public.site_reports TO service_role;
ALTER TABLE public.site_reports ENABLE ROW LEVEL SECURITY;
-- No browser policy: reports are written and read only by the server (admin page).

CREATE OR REPLACE FUNCTION public.report_site(_slug text, _reason text, _details text, _reporter_hash text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.published_sites%ROWTYPE; reporters integer;
BEGIN
  SELECT * INTO s FROM public.published_sites WHERE slug = _slug;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  INSERT INTO public.site_reports (site_id, reason, details, reporter_hash)
  VALUES (s.id, _reason, left(coalesce(_details, ''), 500), _reporter_hash)
  ON CONFLICT (site_id, reporter_hash) DO NOTHING;
  IF s.disabled_at IS NULL THEN
    SELECT count(DISTINCT reporter_hash) INTO reporters FROM public.site_reports
    WHERE site_id = s.id AND created_at > now() - interval '7 days';
    IF reporters >= 3 THEN
      UPDATE public.published_sites SET disabled_at = now(), disabled_reason = 'auto: ' || reporters || ' signalements' WHERE id = s.id;
      RETURN 'suspended';
    END IF;
  END IF;
  RETURN 'reported';
END $$;
REVOKE ALL ON FUNCTION public.report_site(text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_site(text, text, text, text) TO service_role;

-- Admin decision (the server checks the admin role first; re-checked here).
CREATE OR REPLACE FUNCTION public.admin_set_site_suspension(_admin uuid, _slug text, _suspend boolean, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE updated integer;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE public.published_sites
  SET disabled_at = CASE WHEN _suspend THEN now() ELSE NULL END,
      disabled_reason = CASE WHEN _suspend THEN left(coalesce(_reason, 'admin'), 200) ELSE NULL END
  WHERE slug = _slug;
  GET DIAGNOSTICS updated = ROW_COUNT;
  -- Reinstating a site clears its reports so a fresh count starts.
  IF NOT _suspend THEN DELETE FROM public.site_reports WHERE site_id = (SELECT id FROM public.published_sites WHERE slug = _slug); END IF;
  RETURN updated > 0;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_site_suspension(uuid, text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_site_suspension(uuid, text, boolean, text) TO service_role;
