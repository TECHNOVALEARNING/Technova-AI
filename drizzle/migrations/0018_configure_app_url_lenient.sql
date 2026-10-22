-- configure_app_url: accepts a pasted URL with spaces or a path and keeps only https://host[:port].
DROP FUNCTION IF EXISTS public.configure_app_url(text);

CREATE FUNCTION public.configure_app_url(_url text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
DECLARE base text;
BEGIN
  base := substring(regexp_replace(coalesce(_url, ''), '^\s+|\s+$', '', 'g') from '^(https://[A-Za-z0-9.-]+\.[A-Za-z]{2,}(:[0-9]+)?)(/.*)?$');
  IF base IS NULL THEN
    RAISE EXCEPTION 'URL invalide « % ». Exemple attendu : https://mon-projet.vercel.app', _url;
  END IF;
  UPDATE public.studio_worker_config SET app_url = base WHERE id = 1;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-studio-worker') THEN
    PERFORM cron.unschedule('technova-studio-worker');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-media-purge') THEN
    PERFORM cron.unschedule('technova-media-purge');
  END IF;
  PERFORM public.media_purge_arm();
  IF EXISTS (SELECT 1 FROM public.studio_jobs WHERE status = 'running') THEN
    PERFORM public.studio_worker_arm();
  END IF;
  RETURN base;
END $fn$;

REVOKE ALL ON FUNCTION public.configure_app_url(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.configure_app_url(text) TO service_role;
