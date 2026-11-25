-- Referral figures: the referrer now also sees how many of their friends have paid (my_referral_stats.paid), and
-- the admin console gets a « Parrainage » dashboard built on service_role-only aggregates (totals, link versus
-- promo code, conversion to payment, revenue brought by referred accounts, daily curve, top referrers, latest
-- referrals).
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_referral_overview(integer), public.admin_referral_daily(integer),
--     public.admin_referral_top(integer), public.admin_referral_recent(integer);
--   DROP FUNCTION IF EXISTS public.my_referral_stats(); then re-run my_referral_stats from 0049.

DROP FUNCTION IF EXISTS public.my_referral_stats();
/** The caller's referral figures: friends referred (all time, this month), credits earned, friends who paid. */
CREATE FUNCTION public.my_referral_stats()
RETURNS TABLE (referred integer, this_month integer, credits integer, paid integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int,
         count(*) FILTER (WHERE r.created_at >= date_trunc('month', now()))::int,
         coalesce(sum(r.credits), 0)::int,
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments p WHERE p.owner_id = r.referee_id AND p.credited))::int
  FROM referrals r WHERE r.referrer_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_referral_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_stats() TO authenticated;

/** Totals over all time and over the last _days days. */
CREATE OR REPLACE FUNCTION public.admin_referral_overview(_days integer DEFAULT 30)
RETURNS TABLE (total bigint, period bigint, period_promo bigint, period_link bigint, referrers bigint, promo_codes bigint,
  referees_paid bigint, revenue_xof bigint, period_revenue_xof bigint, credits_given bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH since AS (SELECT now() - make_interval(days => _days) AS t),
  paid AS (SELECT p.owner_id, p.amount_xof, p.updated_at FROM payments p JOIN referrals r ON r.referee_id = p.owner_id WHERE p.credited)
  SELECT (SELECT count(*) FROM referrals),
         (SELECT count(*) FROM referrals, since WHERE created_at >= since.t),
         (SELECT count(*) FROM referrals, since WHERE created_at >= since.t AND via = 'promo'),
         (SELECT count(*) FROM referrals, since WHERE created_at >= since.t AND via = 'link'),
         (SELECT count(DISTINCT referrer_id) FROM referrals),
         (SELECT count(*) FROM referral_codes WHERE promo_code IS NOT NULL),
         (SELECT count(DISTINCT owner_id) FROM paid),
         (SELECT coalesce(sum(amount_xof), 0) FROM paid),
         (SELECT coalesce(sum(amount_xof), 0) FROM paid, since WHERE paid.updated_at >= since.t),
         (SELECT coalesce(sum(amount), 0) FROM credit_transactions WHERE kind = 'referral');
$$;

/** New referrals per day (and how many came by promo code). */
CREATE OR REPLACE FUNCTION public.admin_referral_daily(_days integer DEFAULT 30)
RETURNS TABLE (day date, referrals bigint, via_promo bigint) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d::date, count(r.referee_id), count(r.referee_id) FILTER (WHERE r.via = 'promo')
  FROM generate_series((now() - make_interval(days => _days - 1))::date, now()::date, interval '1 day') d
  LEFT JOIN referrals r ON r.created_at::date = d::date
  GROUP BY d ORDER BY d;
$$;

/** Best referrers: friends referred, friends who paid and the revenue they brought. */
CREATE OR REPLACE FUNCTION public.admin_referral_top(_limit integer DEFAULT 20)
RETURNS TABLE (referrer_id uuid, email text, display_name text, promo_code text, referred bigint, paid bigint, revenue_xof bigint, last_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT r.referrer_id, u.email, p.display_name, rc.promo_code, count(*),
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM payments x WHERE x.owner_id = r.referee_id AND x.credited)),
         coalesce((SELECT sum(x.amount_xof) FROM payments x JOIN referrals r2 ON r2.referee_id = x.owner_id WHERE r2.referrer_id = r.referrer_id AND x.credited), 0),
         max(r.created_at)
  FROM referrals r
  LEFT JOIN auth.users u ON u.id = r.referrer_id
  LEFT JOIN profiles p ON p.id = r.referrer_id
  LEFT JOIN referral_codes rc ON rc.owner_id = r.referrer_id
  GROUP BY r.referrer_id, u.email, p.display_name, rc.promo_code
  ORDER BY count(*) DESC, max(r.created_at) DESC
  LIMIT _limit;
$$;

/** Latest referrals: who referred whom, which way, and whether the friend has paid. */
CREATE OR REPLACE FUNCTION public.admin_referral_recent(_limit integer DEFAULT 30)
RETURNS TABLE (created_at timestamptz, referrer_email text, referee_email text, via text, referee_paid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT r.created_at, a.email, b.email, r.via, EXISTS (SELECT 1 FROM payments x WHERE x.owner_id = r.referee_id AND x.credited)
  FROM referrals r LEFT JOIN auth.users a ON a.id = r.referrer_id LEFT JOIN auth.users b ON b.id = r.referee_id
  ORDER BY r.created_at DESC LIMIT _limit;
$$;

REVOKE ALL ON FUNCTION public.admin_referral_overview(integer), public.admin_referral_daily(integer),
  public.admin_referral_top(integer), public.admin_referral_recent(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_referral_overview(integer), public.admin_referral_daily(integer),
  public.admin_referral_top(integer), public.admin_referral_recent(integer) TO service_role;
