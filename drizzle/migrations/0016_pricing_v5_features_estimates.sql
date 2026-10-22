ALTER TABLE public.credit_pricing_rules
  ADD COLUMN IF NOT EXISTS estimate_category text,
  ADD COLUMN IF NOT EXISTS unit_label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS price_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE TABLE IF NOT EXISTS public.plan_features (
  key text PRIMARY KEY,
  label_fr text NOT NULL,
  label_en text NOT NULL,
  access text[] NOT NULL,
  status text NOT NULL DEFAULT 'live',
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_features_status CHECK (status IN ('live','soon')),
  CONSTRAINT plan_features_access_len CHECK (array_length(access,1) = 6)
);
GRANT SELECT ON public.plan_features TO anon, authenticated;
GRANT ALL ON public.plan_features TO service_role;
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone reads active features" ON public.plan_features;
CREATE POLICY "Anyone reads active features" ON public.plan_features FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.get_pack_estimates()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('category', estimate_category, 'model', model, 'unit', unit_label, 'cost', technova_cost)), '[]'::jsonb)
  FROM (SELECT DISTINCT ON (estimate_category) estimate_category, model, unit_label, technova_cost
        FROM public.credit_pricing_rules
        WHERE active AND price_verified AND estimate_category IS NOT NULL AND technova_cost > 0
        ORDER BY estimate_category, created_at DESC) r
$$;
GRANT EXECUTE ON FUNCTION public.get_pack_estimates() TO anon, authenticated;