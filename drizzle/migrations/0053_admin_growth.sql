-- Admin console → « Croissance »: aggregate figures only (no personal data leaves the database), service_role
-- only, called from server functions that re-check the admin role.
--   admin_growth_funnel(days): sign-ups of the period, then how many confirmed their e-mail, finished the
--     onboarding, used a paid feature, bought once, were referred.
--   admin_growth_cohorts(weeks): per sign-up week, accounts and the share still active (any usage_logs row)
--     in week 1, 2 and 4 after sign-up.
--   admin_feature_margins(days): per chat_engine_costs mode, calls, credits billed, real USD cost and the margin
--     at cost (1 - cost × 1 200 / credits) — negative or thin margins are flagged in the console.
--   admin_revenue_split(days): revenue of one-time packs versus monthly formulas, monthly formulas active now,
--     referral rewards given.
-- Rollback: DROP FUNCTION IF EXISTS public.admin_growth_funnel(integer), public.admin_growth_cohorts(integer),
--   public.admin_feature_margins(integer), public.admin_revenue_split(integer);

CREATE OR REPLACE FUNCTION public.admin_growth_funnel(_days integer)
RETURNS TABLE (signups bigint, confirmed bigint, onboarded bigint, active bigint, paying bigint, referred bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (SELECT id, email_confirmed_at FROM auth.users WHERE created_at >= now() - make_interval(days => greatest(1, _days)))
  SELECT
    (SELECT count(*) FROM u),
    (SELECT count(*) FROM u WHERE email_confirmed_at IS NOT NULL),
    (SELECT count(*) FROM u JOIN profiles p ON p.id = u.id WHERE p.onboarded_at IS NOT NULL),
    (SELECT count(DISTINCT l.owner_id) FROM usage_logs l JOIN u ON u.id = l.owner_id),
    (SELECT count(DISTINCT p.owner_id) FROM payments p JOIN u ON u.id = p.owner_id WHERE p.credited),
    (SELECT count(*) FROM referrals r JOIN u ON u.id = r.referee_id);
$$;

CREATE OR REPLACE FUNCTION public.admin_growth_cohorts(_weeks integer)
RETURNS TABLE (week date, accounts bigint, week1 bigint, week2 bigint, week4 bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH u AS (
    SELECT id, created_at, date_trunc('week', created_at)::date AS wk FROM auth.users
    WHERE created_at >= date_trunc('week', now()) - make_interval(weeks => greatest(1, least(_weeks, 26)))
  ), act AS (
    SELECT u.id, u.wk,
      bool_or(l.created_at >= u.created_at + interval '7 days' AND l.created_at < u.created_at + interval '14 days') AS w1,
      bool_or(l.created_at >= u.created_at + interval '14 days' AND l.created_at < u.created_at + interval '21 days') AS w2,
      bool_or(l.created_at >= u.created_at + interval '28 days' AND l.created_at < u.created_at + interval '35 days') AS w4
    FROM u LEFT JOIN usage_logs l ON l.owner_id = u.id AND l.created_at >= u.created_at
    GROUP BY u.id, u.wk
  )
  SELECT wk, count(*), count(*) FILTER (WHERE w1), count(*) FILTER (WHERE w2), count(*) FILTER (WHERE w4)
  FROM act GROUP BY wk ORDER BY wk DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_feature_margins(_days integer)
RETURNS TABLE (mode text, calls bigint, credits bigint, cost_usd numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT mode, count(*), coalesce(sum(credits), 0)::bigint, coalesce(sum(cost_usd), 0)
  FROM chat_engine_costs WHERE created_at >= now() - make_interval(days => greatest(1, _days))
  GROUP BY mode ORDER BY coalesce(sum(credits), 0) DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_revenue_split(_days integer)
RETURNS TABLE (packs_xof bigint, monthly_xof bigint, packs_count bigint, monthly_count bigint, monthly_active bigint, referral_credits bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH p AS (SELECT * FROM payments WHERE credited AND livemode AND updated_at >= now() - make_interval(days => greatest(1, _days)))
  SELECT
    coalesce(sum(amount_xof) FILTER (WHERE pack_slug NOT IN ('mensuel-plus', 'mensuel-pro')), 0)::bigint,
    coalesce(sum(amount_xof) FILTER (WHERE pack_slug IN ('mensuel-plus', 'mensuel-pro')), 0)::bigint,
    count(*) FILTER (WHERE pack_slug NOT IN ('mensuel-plus', 'mensuel-pro')),
    count(*) FILTER (WHERE pack_slug IN ('mensuel-plus', 'mensuel-pro')),
    (SELECT count(DISTINCT owner_id) FROM payments WHERE credited AND livemode AND pack_slug IN ('mensuel-plus', 'mensuel-pro') AND updated_at >= now() - interval '30 days'),
    (SELECT coalesce(sum(amount), 0)::bigint FROM credit_transactions WHERE kind = 'referral' AND created_at >= now() - make_interval(days => greatest(1, _days)))
  FROM p;
$$;

REVOKE ALL ON FUNCTION public.admin_growth_funnel(integer), public.admin_growth_cohorts(integer), public.admin_feature_margins(integer), public.admin_revenue_split(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_growth_funnel(integer), public.admin_growth_cohorts(integer), public.admin_feature_margins(integer), public.admin_revenue_split(integer) TO service_role;
