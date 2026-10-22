-- Self-hosting (Vercel) + security hardening.
-- 1. Scheduler URLs come from studio_worker_config.app_url instead of a hard-coded host.
-- 2. Credit/system functions are no longer executable by browser roles (Postgres grants
--    EXECUTE to PUBLIC by default, which let any signed-in user call refund_credits).
-- 3. Registry download counters can only be changed by registry_download().

ALTER TABLE public.studio_worker_config ADD COLUMN IF NOT EXISTS app_url text;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-studio-worker') THEN
    PERFORM cron.unschedule('technova-studio-worker');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-media-purge') THEN
    PERFORM cron.unschedule('technova-media-purge');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.studio_worker_arm()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
DECLARE base text;
BEGIN
  SELECT rtrim(app_url, '/') INTO base FROM public.studio_worker_config WHERE id = 1;
  IF base IS NULL OR base = '' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-studio-worker') THEN
    PERFORM cron.schedule('technova-studio-worker', '* * * * *', format($job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-worker-token',(select token from public.studio_worker_config where id = 1)),
        body := '{}'::jsonb,
        timeout_milliseconds := 290000
      );
    $job$, base || '/api/public/studio-worker'));
  END IF;
END $fn$;

CREATE OR REPLACE FUNCTION public.media_purge_arm()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
DECLARE base text;
BEGIN
  SELECT rtrim(app_url, '/') INTO base FROM public.studio_worker_config WHERE id = 1;
  IF base IS NULL OR base = '' THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'technova-media-purge') THEN
    PERFORM cron.schedule('technova-media-purge', '17 3 * * *', format($job$
      select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-worker-token',(select token from public.studio_worker_config where id = 1)),
        body := '{}'::jsonb,
        timeout_milliseconds := 120000
      );
    $job$, base || '/api/public/media-purge'));
  END IF;
END $fn$;

-- Run once after deploying (SQL editor): select public.configure_app_url('https://your-app.vercel.app');
CREATE OR REPLACE FUNCTION public.configure_app_url(_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $fn$
BEGIN
  IF _url !~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?/?$' THEN
    RAISE EXCEPTION 'app url must be https://host';
  END IF;
  UPDATE public.studio_worker_config SET app_url = rtrim(_url, '/') WHERE id = 1;
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
END $fn$;

-- Server-only functions: only the backend (service_role) may call them.
REVOKE ALL ON FUNCTION public.studio_worker_arm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.media_purge_arm() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.configure_app_url(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_credits_v2(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_credits(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_credits(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.agents_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.studio_worker_arm() TO service_role;
GRANT EXECUTE ON FUNCTION public.media_purge_arm() TO service_role;
GRANT EXECUTE ON FUNCTION public.configure_app_url(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_credits_v2(uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.confirm_credits(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_credits(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, integer, text) TO service_role;

-- Signed-in users only (it already checks auth.uid()).
REVOKE ALL ON FUNCTION public.get_wallet_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated, service_role;

-- Owners may edit their registry items but not inflate the download counter.
CREATE OR REPLACE FUNCTION public.registry_items_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.downloads := OLD.downloads;
    NEW.owner_id := OLD.owner_id;
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION public.registry_items_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS registry_items_guard ON public.registry_items;
CREATE TRIGGER registry_items_guard BEFORE UPDATE ON public.registry_items
FOR EACH ROW EXECUTE FUNCTION public.registry_items_guard();

-- Public API (/api/ai/chat): replays a stored answer when a client retries with the same idempotency key.
CREATE TABLE IF NOT EXISTS public.api_idempotency (
  owner_id uuid NOT NULL,
  key text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, key)
);
GRANT ALL ON public.api_idempotency TO service_role;
ALTER TABLE public.api_idempotency ENABLE ROW LEVEL SECURITY;
