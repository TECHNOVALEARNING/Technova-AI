-- Real provider cost of every chat reply, for the admin console only: which engine answered a mode,
-- the tokens OpenRouter billed (hidden reasoning included), its USD cost and the credits charged.
-- No policy: browsers cannot read it (engines are never shown to customers); service_role only.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_engine_usage(integer);
--   DROP TABLE IF EXISTS public.chat_engine_costs;

CREATE TABLE IF NOT EXISTS public.chat_engine_costs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  mode text NOT NULL,
  engine text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  reasoning_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6),
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_engine_costs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_engine_costs FROM anon, authenticated;
GRANT ALL ON public.chat_engine_costs TO service_role;
CREATE INDEX IF NOT EXISTS chat_engine_costs_created_idx ON public.chat_engine_costs (created_at DESC);

-- Totals per mode and engine over the last _days days.
CREATE OR REPLACE FUNCTION public.admin_engine_usage(_days integer DEFAULT 30)
RETURNS TABLE (mode text, engine text, replies bigint, input_tokens bigint, output_tokens bigint, reasoning_tokens bigint, cost_usd numeric, credits bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.mode, c.engine, count(*), COALESCE(sum(c.input_tokens), 0), COALESCE(sum(c.output_tokens), 0),
         COALESCE(sum(c.reasoning_tokens), 0), COALESCE(sum(c.cost_usd), 0), COALESCE(sum(c.credits), 0)
  FROM public.chat_engine_costs c
  WHERE c.created_at >= now() - make_interval(days => GREATEST(1, LEAST(_days, 365)))
  GROUP BY c.mode, c.engine
  ORDER BY sum(c.cost_usd) DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.admin_engine_usage(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_engine_usage(integer) TO service_role;
