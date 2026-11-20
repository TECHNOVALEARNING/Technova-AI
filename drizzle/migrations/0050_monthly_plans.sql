-- Optional monthly formulas next to the one-time packs: paid once a month (no automatic renewal: Mobile Money
-- and the card pages do not debit by themselves), credits added at once and never expiring, 30 days of
-- "formule active" counted from the payment (renewing early adds 30 days after the current end).
-- Pricing (worst case: every credit spent at its real cost, 1 credit <= USD 1/1 200, USD 1 <= 650 FCFA,
-- 4 % payment fees): Mensuel Plus 10 000 FCFA -> 12 000 credits (<= 6 500 FCFA of cost, margin >= 31 %),
-- Mensuel Pro 15 000 FCFA -> 18 000 credits (<= 9 750 FCFA of cost, margin >= 32 %).
-- Mensuel Plus opens the Creator plan, Mensuel Pro the Pro plan (account_tier, highest purchase as for packs).
-- Rollback:
--   DELETE FROM public.credit_packs WHERE slug IN ('mensuel-plus', 'mensuel-pro');
--   re-run account_tier from 0034_plan_limits.sql; DROP FUNCTION IF EXISTS public.my_monthly_plan();

INSERT INTO public.credit_packs (name, slug, price_xof, credits, featured, display_order, metadata) VALUES
  ('Mensuel Plus', 'mensuel-plus', 10000, 12000, false, 10, '{"billing": "monthly", "days": 30, "tier": 2}'::jsonb),
  ('Mensuel Pro', 'mensuel-pro', 15000, 18000, true, 11, '{"billing": "monthly", "days": 30, "tier": 3}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price_xof = EXCLUDED.price_xof, credits = EXCLUDED.credits,
  featured = EXCLUDED.featured, display_order = EXCLUDED.display_order, metadata = EXCLUDED.metadata, active = true, updated_at = now();

CREATE OR REPLACE FUNCTION public.account_tier(_user uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_user, 'admin') THEN 3 ELSE coalesce((
    SELECT max(CASE pack_slug WHEN 'pro' THEN 3 WHEN 'mensuel-pro' THEN 3 WHEN 'creator' THEN 2 WHEN 'mensuel-plus' THEN 2 WHEN 'essential' THEN 1 ELSE 0 END)
    FROM public.payments WHERE owner_id = _user AND credited), 0) END;
$$;
REVOKE ALL ON FUNCTION public.account_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_tier(uuid) TO service_role;

/** The caller's monthly formula: which one and until when (null when none was ever bought). */
CREATE OR REPLACE FUNCTION public.my_monthly_plan()
RETURNS TABLE (slug text, ends_at timestamptz) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; e timestamptz := NULL; s text := NULL;
BEGIN
  FOR r IN SELECT pack_slug, updated_at FROM payments
           WHERE owner_id = auth.uid() AND credited AND pack_slug IN ('mensuel-plus', 'mensuel-pro') ORDER BY updated_at LOOP
    e := greatest(coalesce(e, r.updated_at), r.updated_at) + interval '30 days';
    s := r.pack_slug;
  END LOOP;
  IF s IS NULL THEN RETURN; END IF;
  slug := s; ends_at := e; RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.my_monthly_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_monthly_plan() TO authenticated;
