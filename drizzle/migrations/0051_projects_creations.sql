-- Projects: an account groups its conversations and the files it creates (TechNova Design presentations and
-- documents, TechNova Tableur workbooks) in projects. Saved creations are kept 14 days after their last save
-- (expires_at), then deleted by the daily purge (/api/public/media-purge); the Inbox and the Projects page warn
-- 3 days before. Owner-only row security; caps: 50 projects, 300 saved creations, 5 MB per creation.
-- Rollback:
--   ALTER TABLE public.chat_threads DROP COLUMN IF EXISTS project_id;
--   DROP TABLE IF EXISTS public.user_creations; DROP TABLE IF EXISTS public.projects;
--   DROP FUNCTION IF EXISTS public.projects_cap(); DROP FUNCTION IF EXISTS public.user_creations_guard();

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  color text NOT NULL DEFAULT '#7c5cff' CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_owner_idx ON public.projects (owner_id, updated_at DESC);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
DROP POLICY IF EXISTS "Owners manage their projects" ON public.projects;
CREATE POLICY "Owners manage their projects" ON public.projects FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.projects_cap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM projects WHERE owner_id = NEW.owner_id) >= 50 THEN
    RAISE EXCEPTION 'PROJECTS_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.projects_cap() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS projects_cap ON public.projects;
CREATE TRIGGER projects_cap BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.projects_cap();

-- Conversations can belong to a project (deleting the project keeps the conversations).
ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS chat_threads_project_idx ON public.chat_threads (project_id) WHERE project_id IS NOT NULL;
-- A conversation may only be put in one of its owner's projects.
CREATE OR REPLACE FUNCTION public.chat_threads_project_owner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND owner_id = NEW.owner_id) THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chat_threads_project_owner() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS chat_threads_project_owner ON public.chat_threads;
CREATE TRIGGER chat_threads_project_owner BEFORE INSERT OR UPDATE OF project_id ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION public.chat_threads_project_owner();

CREATE TABLE IF NOT EXISTS public.user_creations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('design', 'sheet')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  subtitle text NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 120),
  data jsonb NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '14 days'
);
CREATE INDEX IF NOT EXISTS user_creations_owner_idx ON public.user_creations (owner_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS user_creations_expiry_idx ON public.user_creations (expires_at);
ALTER TABLE public.user_creations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_creations TO authenticated;
GRANT ALL ON public.user_creations TO service_role;
DROP POLICY IF EXISTS "Owners manage their creations" ON public.user_creations;
CREATE POLICY "Owners manage their creations" ON public.user_creations FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Every save sets the size, refreshes updated_at and gives the file 14 more days; caps and project ownership.
CREATE OR REPLACE FUNCTION public.user_creations_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.size_bytes := octet_length(NEW.data::text);
  IF NEW.size_bytes > 5 * 1024 * 1024 THEN RAISE EXCEPTION 'CREATION_TOO_LARGE' USING ERRCODE = 'P0001'; END IF;
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND owner_id = NEW.owner_id) THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF (SELECT count(*) FROM user_creations WHERE owner_id = NEW.owner_id) >= 300 THEN RAISE EXCEPTION 'CREATIONS_LIMIT' USING ERRCODE = 'P0001'; END IF;
    NEW.created_at := now();
  ELSE
    NEW.owner_id := OLD.owner_id; NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  NEW.expires_at := now() + interval '14 days';
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.user_creations_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS user_creations_guard ON public.user_creations;
CREATE TRIGGER user_creations_guard BEFORE INSERT OR UPDATE ON public.user_creations FOR EACH ROW EXECUTE FUNCTION public.user_creations_guard();
