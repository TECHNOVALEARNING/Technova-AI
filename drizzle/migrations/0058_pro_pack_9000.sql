-- Pro pack: 9 000 FCFA for 10 000 credits (was 7 699 FCFA / 8 500 credits).
-- Profitability floor (as in 0050): 10 000 credits <= USD 8.33 of real cost <= 5 417 FCFA (USD 1 <= 650 FCFA),
-- plus 4 % payment fees (360 FCFA) -> margin >= 35 % even if every credit is spent at cost.
-- Rollback: UPDATE public.credit_packs SET price_xof = 7699, credits = 8500, updated_at = now() WHERE slug = 'pro';
UPDATE public.credit_packs SET price_xof = 9000, credits = 10000, active = true, updated_at = now() WHERE slug = 'pro';
