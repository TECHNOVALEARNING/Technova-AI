-- Provider spend chart: any period (7 days, 30 days, 3 months, since the beginning) and kie.ai history.
-- provider_credits = -1 marks a past creation whose real cost kie.ai could not give back (task too old or no
-- creditsConsumed); it is left out of the totals and counted as "not measured".
-- Rollback: re-run the admin_provider_costs definition of 0046_provider_costs.sql.

CREATE OR REPLACE FUNCTION public.admin_provider_costs(_days integer DEFAULT 30)
RETURNS TABLE (day date, provider text, model text, calls bigint, cost_usd numeric, provider_credits numeric, credits bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (c.created_at AT TIME ZONE 'Africa/Lagos')::date, 'openrouter', c.engine, count(*), COALESCE(sum(c.cost_usd), 0), NULL::numeric, COALESCE(sum(c.credits), 0)
  FROM public.chat_engine_costs c
  WHERE c.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 36500)))
  GROUP BY 1, 3
  UNION ALL
  SELECT (m.created_at AT TIME ZONE 'Africa/Lagos')::date, 'kie', m.model, count(*), COALESCE(sum(m.provider_credits), 0) * 0.005, COALESCE(sum(m.provider_credits), 0), COALESCE(sum(m.charged_credits), 0)
  FROM public.media_generations m
  WHERE m.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 36500))) AND m.provider_credits >= 0
  GROUP BY 1, 3
  ORDER BY 1, 2, 5 DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_provider_costs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_provider_costs(integer) TO service_role;
