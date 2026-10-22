CREATE TABLE public.studio_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  title text NOT NULL,
  files jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.studio_previews TO authenticated;
GRANT ALL ON public.studio_previews TO service_role;
ALTER TABLE public.studio_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can read previews" ON public.studio_previews FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners can create previews" ON public.studio_previews FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can delete previews" ON public.studio_previews FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX studio_previews_owner_idx ON public.studio_previews (owner_id, created_at DESC);