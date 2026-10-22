CREATE TABLE public.media_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('image', 'video')),
  model text NOT NULL,
  prompt text NOT NULL,
  aspect_ratio text NOT NULL,
  duration text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','queuing','generating','success','fail')),
  result_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_generations TO authenticated;
GRANT ALL ON public.media_generations TO service_role;
ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own generations" ON public.media_generations FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
CREATE INDEX media_generations_owner_created_idx ON public.media_generations (owner_id, created_at DESC);