DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','moderator','user'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE TABLE IF NOT EXISTS public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_events_created_idx ON public.security_events (created_at DESC);
GRANT SELECT ON public.security_events TO authenticated;
GRANT ALL ON public.security_events TO service_role;
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read security events" ON public.security_events;
CREATE POLICY "Admins read security events" ON public.security_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id uuid NOT NULL,
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, bucket, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_user uuid, _bucket text, _limit integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ws timestamptz := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
DECLARE n integer;
BEGIN
  INSERT INTO rate_limits(user_id, bucket, window_start, hits) VALUES (_user, _bucket, ws, 1)
  ON CONFLICT (user_id, bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1
  RETURNING hits INTO n;
  DELETE FROM rate_limits WHERE window_start < now() - interval '1 day' AND random() < 0.01;
  IF n > _limit THEN
    IF n = _limit + 1 THEN
      INSERT INTO security_events(user_id, kind, severity, detail) VALUES (_user, 'rate_limited', 'warning', jsonb_build_object('bucket', _bucket, 'limit', _limit));
    END IF;
    RETURN false;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(uuid, text, integer, integer) TO service_role;

CREATE TABLE IF NOT EXISTS public.published_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  title text NOT NULL DEFAULT '',
  files jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.published_sites TO authenticated;
GRANT ALL ON public.published_sites TO service_role;
ALTER TABLE public.published_sites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read sites" ON public.published_sites;
CREATE POLICY "Owners read sites" ON public.published_sites FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners delete sites" ON public.published_sites;
CREATE POLICY "Owners delete sites" ON public.published_sites FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  account_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;