-- TechNova credit engine V4 (spec §6-8): wallets, reservations, packs, pricing rules, adjustments.
-- The existing credit_transactions ledger stays the source of truth; new RPCs operate on it atomically.

CREATE TABLE public.credit_wallets (
  owner_id uuid PRIMARY KEY,
  balance integer NOT NULL DEFAULT 0,
  reserved_balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their wallet" ON public.credit_wallets FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Backfill one wallet per existing ledger owner.
INSERT INTO public.credit_wallets (owner_id, balance, reserved_balance)
SELECT owner_id, COALESCE(SUM(amount), 0), 0 FROM public.credit_transactions GROUP BY owner_id
ON CONFLICT (owner_id) DO NOTHING;

CREATE TABLE public.credit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  amount integer NOT NULL,
  label text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
GRANT SELECT ON public.credit_reservations TO authenticated;
GRANT ALL ON public.credit_reservations TO service_role;
ALTER TABLE public.credit_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their reservations" ON public.credit_reservations FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE public.credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_xof integer NOT NULL,
  credits integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packs TO anon;
GRANT SELECT ON public.credit_packs TO authenticated;
GRANT ALL ON public.credit_packs TO service_role;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active packs" ON public.credit_packs FOR SELECT TO anon, authenticated USING (active = true);

-- Initial packs (prices confirmed by the owner; 4 credits per FCFA as in spec §7).
INSERT INTO public.credit_packs (name, slug, price_xof, credits, featured, display_order) VALUES
  ('Starter', 'starter', 1000, 4000, false, 1),
  ('Essential', 'essential', 2500, 10000, false, 2),
  ('Creator', 'creator', 5000, 20000, true, 3),
  ('Pro', 'pro', 7500, 30000, false, 4),
  ('Expert', 'expert', 15000, 60000, false, 5),
  ('Business', 'business', 25000, 100000, false, 6);

CREATE TABLE public.credit_pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model text NOT NULL,
  provider text NOT NULL DEFAULT '',
  provider_cost numeric NOT NULL DEFAULT 0,
  technova_cost integer NOT NULL DEFAULT 0,
  margin_target numeric NOT NULL DEFAULT 3,
  max_allowed_cost integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (model, provider)
);
GRANT ALL ON public.credit_pricing_rules TO service_role;
ALTER TABLE public.credit_pricing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read pricing rules" ON public.credit_pricing_rules FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.credit_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL DEFAULT '',
  admin_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_adjustments TO authenticated;
GRANT ALL ON public.credit_adjustments TO service_role;
ALTER TABLE public.credit_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their adjustments" ON public.credit_adjustments FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Wallet balance: available = balance - reserved.
CREATE OR REPLACE FUNCTION public.get_wallet_balance(_owner uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE bal integer; res integer;
BEGIN
  IF _owner IS NULL OR (_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RETURN jsonb_build_object('balance', 0, 'reserved', 0, 'available', 0);
  END IF;
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount), 0) INTO res FROM public.credit_reservations WHERE owner_id = _owner AND status = 'pending';
  INSERT INTO public.credit_wallets (owner_id, balance, reserved_balance, updated_at)
  VALUES (_owner, bal, res, now())
  ON CONFLICT (owner_id) DO UPDATE SET balance = EXCLUDED.balance, reserved_balance = EXCLUDED.reserved_balance, updated_at = now();
  RETURN jsonb_build_object('balance', bal, 'reserved', res, 'available', bal - res);
END
$function$;

-- Reserve credits atomically: refuses when the available balance is insufficient.
CREATE OR REPLACE FUNCTION public.reserve_credits_v2(_owner uuid, _amount integer, _label text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE bal integer; res integer; rid uuid;
BEGIN
  IF _owner IS NULL OR _amount <= 0 THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount), 0) INTO res FROM public.credit_reservations WHERE owner_id = _owner AND status = 'pending';
  IF bal - res < _amount THEN RETURN NULL; END IF;
  INSERT INTO public.credit_reservations (owner_id, amount, label) VALUES (_owner, _amount, _label) RETURNING id INTO rid;
  RETURN rid;
END
$function$;

-- Confirm a reservation at its real cost: charges the ledger once, refunds any over-reservation.
CREATE OR REPLACE FUNCTION public.confirm_credits(_reservation uuid, _real_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r public.credit_reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.credit_reservations WHERE id = _reservation FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(r.owner_id::text));
  IF _real_amount > 0 THEN
    INSERT INTO public.credit_transactions (owner_id, amount, kind, label) VALUES (r.owner_id, -_real_amount, 'charge', r.label);
  END IF;
  UPDATE public.credit_reservations SET status = 'confirmed', settled_at = now() WHERE id = _reservation;
  RETURN true;
END
$function$;

-- Release a reservation without charging (generation failed or was cancelled).
CREATE OR REPLACE FUNCTION public.release_credits(_reservation uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r public.credit_reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.credit_reservations WHERE id = _reservation FOR UPDATE;
  IF NOT FOUND OR r.status <> 'pending' THEN RETURN false; END IF;
  UPDATE public.credit_reservations SET status = 'released', settled_at = now() WHERE id = _reservation;
  RETURN true;
END
$function$;

-- Refund credits to a wallet (admin or system use).
CREATE OR REPLACE FUNCTION public.refund_credits(_owner uuid, _amount integer, _label text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _owner IS NULL OR _amount <= 0 THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  INSERT INTO public.credit_transactions (owner_id, amount, kind, label) VALUES (_owner, _amount, 'refund', _label);
  RETURN true;
END
$function$;