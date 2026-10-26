-- Admin console: account suspensions and aggregated reports computed in SQL (no full-table reads in the app).
-- Every function here is SECURITY DEFINER and executable by service_role only; the app calls them from
-- server functions after checking has_role(…, 'admin').
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_list_users(text, integer, integer), public.admin_count_users(text),
--     public.admin_credit_totals(), public.admin_revenue();
--   DROP TABLE IF EXISTS public.account_suspensions;

CREATE TABLE IF NOT EXISTS public.account_suspensions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 300),
  suspended_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.account_suspensions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_suspensions FROM anon, authenticated;
GRANT ALL ON public.account_suspensions TO service_role;

-- Users with their balance and recent activity, newest first. _search matches e-mail or display name.
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT '', _limit integer DEFAULT 25, _offset integer DEFAULT 0)
RETURNS TABLE (id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz,
  balance bigint, credits_30d bigint, requests_30d bigint, paid_xof bigint, is_admin boolean, suspended boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.id, u.email::text, coalesce(p.display_name, ''), u.created_at, u.last_sign_in_at,
    coalesce((SELECT sum(t.amount) FROM credit_transactions t WHERE t.owner_id = u.id), 0)::bigint,
    coalesce((SELECT sum(l.credits) FROM usage_logs l WHERE l.owner_id = u.id AND l.created_at > now() - interval '30 days'), 0)::bigint,
    (SELECT count(*) FROM usage_logs l WHERE l.owner_id = u.id AND l.created_at > now() - interval '30 days')::bigint,
    coalesce((SELECT sum(y.amount_xof) FROM payments y WHERE y.owner_id = u.id AND y.status = 'success' AND y.livemode), 0)::bigint,
    EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
    EXISTS (SELECT 1 FROM account_suspensions s WHERE s.user_id = u.id)
  FROM auth.users u LEFT JOIN profiles p ON p.id = u.id
  WHERE coalesce(_search, '') = '' OR u.email ILIKE '%' || _search || '%' OR p.display_name ILIKE '%' || _search || '%'
  ORDER BY u.created_at DESC
  LIMIT least(greatest(_limit, 1), 100) OFFSET greatest(_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.admin_count_users(_search text DEFAULT '')
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT count(*) FROM auth.users u LEFT JOIN profiles p ON p.id = u.id
  WHERE coalesce(_search, '') = '' OR u.email ILIKE '%' || _search || '%' OR p.display_name ILIKE '%' || _search || '%';
$$;

-- Credits put into circulation (positive entries) and consumed (negative entries), by kind.
CREATE OR REPLACE FUNCTION public.admin_credit_totals()
RETURNS TABLE (distributed bigint, consumed bigint, purchased bigint, granted bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(sum(amount) FILTER (WHERE amount > 0), 0)::bigint,
    coalesce(-sum(amount) FILTER (WHERE amount < 0), 0)::bigint,
    coalesce(sum(amount) FILTER (WHERE amount > 0 AND kind = 'purchase'), 0)::bigint,
    coalesce(sum(amount) FILTER (WHERE amount > 0 AND kind <> 'purchase'), 0)::bigint
  FROM credit_transactions;
$$;

-- Real revenue (live, successful payments) and payment counts by status.
CREATE OR REPLACE FUNCTION public.admin_revenue()
RETURNS TABLE (revenue_total bigint, revenue_30d bigint, revenue_today bigint, paid_30d bigint, pending_30d bigint, failed_30d bigint, buyers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    coalesce(sum(amount_xof) FILTER (WHERE status = 'success' AND livemode), 0)::bigint,
    coalesce(sum(amount_xof) FILTER (WHERE status = 'success' AND livemode AND created_at > now() - interval '30 days'), 0)::bigint,
    coalesce(sum(amount_xof) FILTER (WHERE status = 'success' AND livemode AND created_at >= date_trunc('day', now())), 0)::bigint,
    count(*) FILTER (WHERE status = 'success' AND livemode AND created_at > now() - interval '30 days')::bigint,
    count(*) FILTER (WHERE status = 'pending' AND created_at > now() - interval '30 days')::bigint,
    count(*) FILTER (WHERE status NOT IN ('success', 'pending') AND created_at > now() - interval '30 days')::bigint,
    count(DISTINCT owner_id) FILTER (WHERE status = 'success' AND livemode)::bigint
  FROM payments;
$$;

REVOKE ALL ON FUNCTION public.admin_list_users(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_count_users(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_credit_totals() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_revenue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_count_users(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_credit_totals() TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_revenue() TO service_role;
