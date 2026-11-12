-- Official TechNova plugins installed by each user (catalogue in src/lib/plugins.ts).
-- A row only records that the owner installed a plugin, whether it is enabled, and which of the owner's
-- agents it created (so uninstalling removes exactly those). Agents themselves stay in public.agents,
-- under their own owner-only policy and the Creator-plan trigger (agents_plan, migration 0034).
CREATE TABLE IF NOT EXISTS public.user_plugins (
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plugin_id text NOT NULL CHECK (plugin_id ~ '^[a-z0-9-]{2,40}$'),
  enabled boolean NOT NULL DEFAULT true,
  agent_ids uuid[] NOT NULL DEFAULT '{}' CHECK (cardinality(agent_ids) <= 10),
  installed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, plugin_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_plugins TO authenticated;
GRANT ALL ON public.user_plugins TO service_role;
ALTER TABLE public.user_plugins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage their plugins" ON public.user_plugins;
CREATE POLICY "Owners manage their plugins" ON public.user_plugins FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
-- No user can hold more plugins than the catalogue offers.
CREATE OR REPLACE FUNCTION public.user_plugins_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.user_plugins WHERE owner_id = NEW.owner_id) >= 50 THEN
    RAISE EXCEPTION 'PLUGIN_LIMIT' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.user_plugins_limit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS user_plugins_limit ON public.user_plugins;
CREATE TRIGGER user_plugins_limit BEFORE INSERT ON public.user_plugins FOR EACH ROW EXECUTE FUNCTION public.user_plugins_limit();
