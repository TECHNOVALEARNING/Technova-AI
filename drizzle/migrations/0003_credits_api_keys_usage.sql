CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  amount integer NOT NULL,
  kind text NOT NULL,
  label text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE INDEX ON public.credit_transactions (owner_id, created_at DESC);

CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read keys" ON public.api_keys FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners delete keys" ON public.api_keys FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  credits integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.usage_logs TO authenticated;
GRANT ALL ON public.usage_logs TO service_role;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read usage" ON public.usage_logs FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE INDEX ON public.usage_logs (owner_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  IF NOT EXISTS (SELECT 1 FROM credit_transactions WHERE owner_id = uid AND kind = 'welcome') THEN
    INSERT INTO credit_transactions (owner_id, amount, kind, label) VALUES (uid, 50, 'welcome', 'Bonus de bienvenue');
  END IF;
  RETURN (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE owner_id = uid);
END $$;
REVOKE ALL ON FUNCTION public.claim_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;