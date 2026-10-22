-- Official pack prices (FCFA) and credits; Pro is the highlighted pack.
UPDATE public.credit_packs AS p SET price_xof = v.price, credits = v.credits, featured = v.featured, display_order = v.ord, active = true, updated_at = now()
FROM (VALUES
  ('starter',    999, 1000, false, 1),
  ('essential', 2499, 2600, false, 2),
  ('creator',   4999, 5500, false, 3),
  ('pro',       7699, 8500, true,  4)
) AS v(slug, price, credits, featured, ord)
WHERE p.slug = v.slug;
