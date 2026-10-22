CREATE TABLE public.supabase_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  project_ref text,
  project_name text,
  scope text NOT NULL DEFAULT '',
  access_token_ciphertext text NOT NULL,
  refresh_token_ciphertext text NOT NULL DEFAULT '',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.supabase_connections TO service_role;
ALTER TABLE public.supabase_connections ENABLE ROW LEVEL SECURITY;