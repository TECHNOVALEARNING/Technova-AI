ALTER TABLE public.media_generations
  ADD COLUMN archived_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN expires_at timestamptz;

-- Daily purge of expired archived media (files are kept 14 days).
CREATE OR REPLACE FUNCTION public.media_purge_arm()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'cron'
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-media-purge') THEN
    PERFORM cron.schedule('technova-media-purge', '17 3 * * *', $job$
      select net.http_post(
        url := 'https://app.invalid/api/public/media-purge',
        headers := jsonb_build_object('Content-Type','application/json','x-worker-token',(select token from public.studio_worker_config where id = 1)),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $job$);
  END IF;
END
$function$;