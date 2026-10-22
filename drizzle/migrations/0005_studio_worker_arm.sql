-- Superseded by 0017 (URL from studio_worker_config.app_url). Armed only on job insert, unscheduled by the worker once no generation is running (wake-on-enqueue, unschedule-after-drain)
CREATE OR REPLACE FUNCTION public.studio_worker_arm()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-studio-worker') THEN
    PERFORM cron.schedule('technova-studio-worker', '* * * * *', $job$
      select net.http_post(
        url := 'https://app.invalid/api/public/studio-worker',
        headers := jsonb_build_object('Content-Type','application/json','x-worker-token',(select token from public.studio_worker_config where id = 1)),
        body := '{}'::jsonb,
        timeout_milliseconds := 290000
      );
    $job$);
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public.studio_worker_disarm()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.studio_jobs WHERE status = 'running')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-studio-worker') THEN
    PERFORM cron.unschedule('technova-studio-worker');
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public.studio_jobs_wake()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
BEGIN
  PERFORM public.studio_worker_arm();
  RETURN NEW;
END $fn$;

REVOKE ALL ON FUNCTION public.studio_worker_arm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.studio_worker_disarm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.studio_jobs_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_worker_disarm() TO service_role;

CREATE TRIGGER studio_jobs_wake AFTER INSERT ON public.studio_jobs
FOR EACH ROW EXECUTE FUNCTION public.studio_jobs_wake();