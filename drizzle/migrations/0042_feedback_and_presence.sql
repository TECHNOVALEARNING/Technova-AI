-- Suggestion box (profile menu → "Boîte à suggestions") and online presence for the admin console.

-- 1. Suggestions: a message and/or a 1–5 star rating. Users only send and read their own; the admin reads them
--    through service_role functions called from server code that re-checks the admin role.
CREATE TABLE IF NOT EXISTS public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 4000),
  page text NOT NULL DEFAULT '' CHECK (char_length(page) <= 200),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_not_empty CHECK (rating IS NOT NULL OR char_length(btrim(message)) >= 3)
);
CREATE INDEX IF NOT EXISTS user_feedback_created_idx ON public.user_feedback (created_at DESC);
GRANT SELECT, INSERT ON public.user_feedback TO authenticated;
GRANT ALL ON public.user_feedback TO service_role;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners send feedback" ON public.user_feedback;
CREATE POLICY "Owners send feedback" ON public.user_feedback FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND read_at IS NULL);
DROP POLICY IF EXISTS "Owners read their feedback" ON public.user_feedback;
CREATE POLICY "Owners read their feedback" ON public.user_feedback FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- At most 10 suggestions per account per 24 hours.
CREATE OR REPLACE FUNCTION public.user_feedback_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.user_feedback WHERE owner_id = NEW.owner_id AND created_at > now() - interval '24 hours') >= 10 THEN
    RAISE EXCEPTION 'FEEDBACK_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.user_feedback_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS user_feedback_limit ON public.user_feedback;
CREATE TRIGGER user_feedback_limit BEFORE INSERT ON public.user_feedback FOR EACH ROW EXECUTE FUNCTION public.user_feedback_limit();

CREATE OR REPLACE FUNCTION public.admin_feedback_list(_limit integer, _offset integer)
RETURNS TABLE (id uuid, email text, rating smallint, message text, page text, read_at timestamptz, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, u.email::text, f.rating, f.message, f.page, f.read_at, f.created_at
  FROM public.user_feedback f LEFT JOIN auth.users u ON u.id = f.owner_id
  ORDER BY f.created_at DESC LIMIT least(greatest(_limit, 1), 100) OFFSET greatest(_offset, 0)
$$;
CREATE OR REPLACE FUNCTION public.admin_feedback_summary()
RETURNS TABLE (total bigint, unread bigint, rated bigint, average numeric)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*), count(*) FILTER (WHERE read_at IS NULL), count(rating), round(avg(rating)::numeric, 2) FROM public.user_feedback
$$;
CREATE OR REPLACE FUNCTION public.admin_feedback_mark_read(_ids uuid[])
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.user_feedback SET read_at = now() WHERE id = ANY(_ids) AND read_at IS NULL
$$;
REVOKE ALL ON FUNCTION public.admin_feedback_list(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_feedback_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_feedback_mark_read(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_feedback_list(integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_feedback_summary() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_feedback_mark_read(uuid[]) TO service_role;

-- 2. Presence: the dashboard calls touch_presence() every few minutes; the admin sees who was active recently.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_last_seen_idx ON public.profiles (last_seen_at DESC);
CREATE OR REPLACE FUNCTION public.touch_presence() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_seen_at = now()
  WHERE id = auth.uid() AND (last_seen_at IS NULL OR last_seen_at < now() - interval '60 seconds')
$$;
REVOKE ALL ON FUNCTION public.touch_presence() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_presence() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_online_users(_minutes integer)
RETURNS TABLE (online bigint, last_hour bigint, today bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FILTER (WHERE last_seen_at > now() - make_interval(mins => least(greatest(_minutes, 1), 60))),
         count(*) FILTER (WHERE last_seen_at > now() - interval '1 hour'),
         count(*) FILTER (WHERE last_seen_at > now() - interval '24 hours')
  FROM public.profiles
$$;
REVOKE ALL ON FUNCTION public.admin_online_users(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_online_users(integer) TO service_role;
