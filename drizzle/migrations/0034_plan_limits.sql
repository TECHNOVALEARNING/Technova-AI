-- Plan limits from the /tarifs comparison table. A plan is the highest pack ever bought (credited payment):
-- 0 = Starter or no purchase, 1 = Essential, 2 = Creator, 3 = Pro; administrators count as Pro.
-- Server code checks account_tier() before gated actions; the two triggers below cover what the browser
-- writes directly (conversation share links, custom agents).
-- Rollback:
--   DROP TRIGGER IF EXISTS chat_threads_share_plan ON public.chat_threads; DROP FUNCTION IF EXISTS public.chat_threads_share_plan();
--   DROP TRIGGER IF EXISTS agents_plan ON public.agents; DROP FUNCTION IF EXISTS public.agents_plan();
--   DROP FUNCTION IF EXISTS public.account_tier(uuid);

CREATE OR REPLACE FUNCTION public.account_tier(_user uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_user, 'admin') THEN 3 ELSE coalesce((
    SELECT max(CASE pack_slug WHEN 'pro' THEN 3 WHEN 'creator' THEN 2 WHEN 'essential' THEN 1 ELSE 0 END)
    FROM public.payments WHERE owner_id = _user AND credited), 0) END;
$$;
REVOKE ALL ON FUNCTION public.account_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_tier(uuid) TO service_role;

-- "Partage par lien": share links need Essential or higher.
CREATE OR REPLACE FUNCTION public.chat_threads_share_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.share_token IS NOT NULL AND OLD.share_token IS NULL AND public.account_tier(NEW.owner_id) < 1 THEN
    RAISE EXCEPTION 'PLAN_UPGRADE_REQUIRED:share' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chat_threads_share_plan() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chat_threads_share_plan ON public.chat_threads;
CREATE TRIGGER chat_threads_share_plan BEFORE UPDATE OF share_token ON public.chat_threads
FOR EACH ROW EXECUTE FUNCTION public.chat_threads_share_plan();

-- Custom agents need Creator; choosing the per-reply budget needs Pro (others keep the default of 20 credits).
CREATE OR REPLACE FUNCTION public.agents_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tier integer := public.account_tier(NEW.owner_id);
BEGIN
  IF TG_OP = 'INSERT' AND tier < 2 THEN
    RAISE EXCEPTION 'PLAN_UPGRADE_REQUIRED:agents' USING ERRCODE = 'P0001';
  END IF;
  IF tier < 3 THEN NEW.max_cost := 20; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.agents_plan() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS agents_plan ON public.agents;
-- Runs before agents_version_upd ("agents_p" < "agents_v"), so the stored snapshot keeps the clamped budget.
CREATE TRIGGER agents_plan BEFORE INSERT OR UPDATE ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.agents_plan();
