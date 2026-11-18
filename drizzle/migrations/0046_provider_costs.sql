-- Admin console → "Consommation chez les fournisseurs": real provider cost per day and per model.
-- kie.ai reports the credits each task really consumed (recordInfo.creditsConsumed); the media poll stores them
-- here. OpenRouter costs come from chat_engine_costs (or from OpenRouter's own activity report when an
-- OPENROUTER_MANAGEMENT_KEY is configured). service_role only, called after the admin check.
-- Rollback: DROP FUNCTION public.admin_provider_costs(integer); ALTER TABLE public.media_generations DROP COLUMN provider_credits;

ALTER TABLE public.media_generations ADD COLUMN IF NOT EXISTS provider_credits numeric(12, 2);
CREATE INDEX IF NOT EXISTS chat_engine_costs_day_idx ON public.chat_engine_costs (created_at);
CREATE INDEX IF NOT EXISTS media_generations_created_idx ON public.media_generations (created_at);

-- One row per day, provider and model: cost in USD (kie.ai credits cost USD 0.005 each), provider credits for
-- kie.ai, number of calls and TechNova credits charged.
CREATE OR REPLACE FUNCTION public.admin_provider_costs(_days integer DEFAULT 30)
RETURNS TABLE (day date, provider text, model text, calls bigint, cost_usd numeric, provider_credits numeric, credits bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (c.created_at AT TIME ZONE 'Africa/Lagos')::date, 'openrouter', c.engine, count(*), COALESCE(sum(c.cost_usd), 0), NULL::numeric, COALESCE(sum(c.credits), 0)
  FROM public.chat_engine_costs c
  WHERE c.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 365)))
  GROUP BY 1, 3
  UNION ALL
  SELECT (m.created_at AT TIME ZONE 'Africa/Lagos')::date, 'kie', m.model, count(*), COALESCE(sum(m.provider_credits), 0) * 0.005, COALESCE(sum(m.provider_credits), 0), COALESCE(sum(m.charged_credits), 0)
  FROM public.media_generations m
  WHERE m.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 365))) AND m.provider_credits IS NOT NULL
  GROUP BY 1, 3
  ORDER BY 1, 2, 5 DESC;
$$;
REVOKE ALL ON FUNCTION public.admin_provider_costs(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_provider_costs(integer) TO service_role;
