-- Provider spend chart safety net: readings of what OpenRouter really billed, so the chart shows the true daily
-- total even for calls TechNova does not log one by one (tests, help chat, any other key of the account).
-- total_usd = the account's cumulative spend (/api/v1/credits); key_daily_usd = today's spend of the app's key
-- (/api/v1/key usage_daily, UTC day). Taken when the admin opens the chart and every evening by a cron.
-- service_role only. Rollback: DROP TABLE public.provider_usage_snapshots;
CREATE TABLE IF NOT EXISTS public.provider_usage_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider text NOT NULL DEFAULT 'openrouter',
  total_usd numeric(14, 6),
  key_daily_usd numeric(14, 6),
  taken_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_usage_snapshots_taken_idx ON public.provider_usage_snapshots (provider, taken_at);
ALTER TABLE public.provider_usage_snapshots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_usage_snapshots FROM anon, authenticated;
GRANT ALL ON public.provider_usage_snapshots TO service_role;
