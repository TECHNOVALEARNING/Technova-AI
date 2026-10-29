-- Credits used are read from the credit ledger, the same source as the balance: usage_logs never held
-- images, videos and music, so "used" could stay far below what the balance had lost.
-- Consumption = -(charge + usage + reserve + refund) entries; transfers and grants are not usage.
-- Also copies past media generations into usage_logs so the Usage page lists them (re-runnable).
-- Rollback: re-run the admin_list_users definition from 0033; DELETE FROM usage_logs WHERE model LIKE 'Média · %';

CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT '', _limit integer DEFAULT 25, _offset integer DEFAULT 0)
RETURNS TABLE (id uuid, email text, display_name text, created_at timestamptz, last_sign_in_at timestamptz,
  balance bigint, credits_30d bigint, requests_30d bigint, paid_xof bigint, is_admin boolean, suspended boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.id, u.email::text, coalesce(p.display_name, ''), u.created_at, u.last_sign_in_at,
    coalesce((SELECT sum(t.amount) FROM credit_transactions t WHERE t.owner_id = u.id), 0)::bigint,
    greatest(0, coalesce((SELECT -sum(t.amount) FROM credit_transactions t WHERE t.owner_id = u.id
      AND t.kind IN ('charge', 'usage', 'reserve', 'refund') AND t.created_at > now() - interval '30 days'), 0))::bigint,
    (SELECT count(*) FROM usage_logs l WHERE l.owner_id = u.id AND l.created_at > now() - interval '30 days')::bigint,
    coalesce((SELECT sum(y.amount_xof) FROM payments y WHERE y.owner_id = u.id AND y.status = 'success' AND y.livemode), 0)::bigint,
    EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin'),
    EXISTS (SELECT 1 FROM account_suspensions s WHERE s.user_id = u.id)
  FROM auth.users u LEFT JOIN profiles p ON p.id = u.id
  WHERE coalesce(_search, '') = '' OR u.email ILIKE '%' || _search || '%' OR p.display_name ILIKE '%' || _search || '%'
  ORDER BY u.created_at DESC
  LIMIT least(greatest(_limit, 1), 100) OFFSET greatest(_offset, 0);
$$;
REVOKE ALL ON FUNCTION public.admin_list_users(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer, integer) TO service_role;

INSERT INTO public.usage_logs (owner_id, model, input_tokens, output_tokens, credits, latency_ms, created_at)
SELECT m.owner_id, 'Média · ' || initcap(m.kind), 0, 0, m.charged_credits, 0, m.created_at
FROM public.media_generations m
WHERE m.settled AND coalesce(m.charged_credits, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM public.usage_logs l WHERE l.owner_id = m.owner_id AND l.created_at = m.created_at AND l.model LIKE 'Média · %');
