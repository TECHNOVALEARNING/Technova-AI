CREATE TABLE IF NOT EXISTS public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  instructions text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'GPT-4o Mini',
  memory text NOT NULL DEFAULT '',
  tools text[] NOT NULL DEFAULT '{}',
  max_tokens integer NOT NULL DEFAULT 1024 CHECK (max_tokens BETWEEN 128 AND 4096),
  max_cost integer NOT NULL DEFAULT 20 CHECK (max_cost BETWEEN 1 AND 500),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage agents" ON public.agents;
CREATE POLICY "Owners manage agents" ON public.agents FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  version integer NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.agent_versions TO authenticated;
GRANT ALL ON public.agent_versions TO service_role;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read agent versions" ON public.agent_versions;
CREATE POLICY "Owners read agent versions" ON public.agent_versions FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners add agent versions" ON public.agent_versions;
CREATE POLICY "Owners add agent versions" ON public.agent_versions FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.agents_snapshot() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN NEW.version := OLD.version + 1; NEW.updated_at := now(); END IF;
  INSERT INTO public.agent_versions (agent_id, owner_id, version, snapshot)
  VALUES (NEW.id, NEW.owner_id, NEW.version, jsonb_build_object('name',NEW.name,'description',NEW.description,'instructions',NEW.instructions,'model',NEW.model,'memory',NEW.memory,'tools',NEW.tools,'max_tokens',NEW.max_tokens,'max_cost',NEW.max_cost));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS agents_version_ins ON public.agents;
CREATE TRIGGER agents_version_ins AFTER INSERT ON public.agents FOR EACH ROW EXECUTE FUNCTION public.agents_snapshot();
DROP TRIGGER IF EXISTS agents_version_upd ON public.agents;
CREATE TRIGGER agents_version_upd BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.agents_snapshot();