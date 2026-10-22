CREATE TABLE public.studio_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  request text NOT NULL,
  answers text NOT NULL DEFAULT '',
  plan jsonb NOT NULL,
  lang text NOT NULL DEFAULT 'fr',
  output text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','done','failed')),
  error text,
  attempts int NOT NULL DEFAULT 0,
  charged boolean NOT NULL DEFAULT false,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, message_id)
);
GRANT SELECT ON public.studio_jobs TO authenticated;
GRANT ALL ON public.studio_jobs TO service_role;
ALTER TABLE public.studio_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their studio jobs" ON public.studio_jobs FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE INDEX studio_jobs_pending_idx ON public.studio_jobs (status, lease_until);

CREATE TABLE public.studio_worker_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL DEFAULT encode(extensions.gen_random_bytes(32), 'hex')
);
GRANT ALL ON public.studio_worker_config TO service_role;
ALTER TABLE public.studio_worker_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.studio_worker_config (id) VALUES (1);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;