-- Créativité Pro → kit de marque: one brand kit per account (name, up to 6 colours, heading and body fonts, a
-- small logo as a data URL of 400 KB at most) applied to any design in one click. Pro plan only (account_tier 3),
-- checked by a trigger; owner-only row security.
-- Rollback: DROP TABLE IF EXISTS public.brand_kits; DROP FUNCTION IF EXISTS public.brand_kits_guard();

CREATE TABLE IF NOT EXISTS public.brand_kits (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 80),
  colors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(colors) = 'array' AND jsonb_array_length(colors) <= 6),
  font_head text NOT NULL DEFAULT 'Inter' CHECK (char_length(font_head) <= 60),
  font_body text NOT NULL DEFAULT 'Inter' CHECK (char_length(font_body) <= 60),
  logo text CHECK (logo IS NULL OR (char_length(logo) <= 560000 AND logo ~ '^data:image/(png|jpeg|webp|svg\+xml);base64,')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_kits ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_kits TO authenticated;
GRANT ALL ON public.brand_kits TO service_role;
DROP POLICY IF EXISTS "Owners manage their brand kit" ON public.brand_kits;
CREATE POLICY "Owners manage their brand kit" ON public.brand_kits FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.brand_kits_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.account_tier(NEW.owner_id) < 3 THEN RAISE EXCEPTION 'PLAN_UPGRADE_REQUIRED:design_pro' USING ERRCODE = 'P0001'; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.brand_kits_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS brand_kits_guard ON public.brand_kits;
CREATE TRIGGER brand_kits_guard BEFORE INSERT OR UPDATE ON public.brand_kits FOR EACH ROW EXECUTE FUNCTION public.brand_kits_guard();
