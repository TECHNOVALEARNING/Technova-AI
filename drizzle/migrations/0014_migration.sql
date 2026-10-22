CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  pack_slug text NOT NULL,
  amount_xof integer NOT NULL,
  credits integer NOT NULL,
  provider text NOT NULL DEFAULT 'nyole',
  session_id text UNIQUE,
  checkout_url text,
  status text NOT NULL DEFAULT 'pending',
  livemode boolean NOT NULL DEFAULT false,
  credited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners read payments" ON public.payments;
CREATE POLICY "Owners read payments" ON public.payments FOR SELECT TO authenticated USING (owner_id = auth.uid());
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

-- Idempotent crediting: only the server (service_role) may call this.
CREATE OR REPLACE FUNCTION public.settle_payment(_payment uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p public.payments%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.payments WHERE id = _payment FOR UPDATE;
  IF NOT FOUND OR p.credited THEN RETURN false; END IF;
  INSERT INTO public.credit_transactions (owner_id, amount, kind, label)
  VALUES (p.owner_id, p.credits, 'purchase', 'Pack ' || p.pack_slug);
  UPDATE public.payments SET credited = true, status = 'success', updated_at = now() WHERE id = _payment;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.settle_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payment(uuid) TO service_role;