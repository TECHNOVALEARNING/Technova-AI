-- Monthly formulas (Mensuel Plus, Mensuel Pro, and the Team / Entreprise plans of 0057) reset every month:
-- each credited payment opens a 30-day period holding its credits; when the period ends, or when the next
-- monthly payment is credited (renewing starts a fresh month at once), the period's unused credits are removed
-- from the balance (credit_transactions kind 'expire'). One-time packs, the welcome bonus and referral credits
-- never expire. Monthly credits are counted as spent first: unused = credits of the period minus what the owner
-- spent since it started, never more than the balance itself.
-- Purchases made before this migration were sold as never expiring: their periods are recorded as already
-- closed, with nothing removed.
-- Periods close (a) in the daily /api/public/media-purge job, (b) lazily before any reservation and whenever the
-- balance is read, so expired credits can never be spent.
-- Rollback:
--   DROP TRIGGER IF EXISTS payments_monthly_period ON public.payments; DROP FUNCTION IF EXISTS public.payments_monthly_period();
--   DROP FUNCTION IF EXISTS public.close_monthly_periods(uuid); DROP FUNCTION IF EXISTS public.close_monthly_period(uuid);
--   DROP TABLE IF EXISTS public.monthly_periods;
--   re-run my_monthly_plan from 0050_monthly_plans.sql, reserve_credits_v2 / reserve_credits from 0022 and
--   get_wallet_balance from 0013.

CREATE TABLE IF NOT EXISTS public.monthly_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL UNIQUE,
  pack_slug text NOT NULL,
  credits integer NOT NULL CHECK (credits >= 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  closed_at timestamptz,
  expired_credits integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS monthly_periods_open_idx ON public.monthly_periods (owner_id, ends_at) WHERE closed_at IS NULL;
ALTER TABLE public.monthly_periods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.monthly_periods FROM anon, authenticated;
GRANT SELECT ON public.monthly_periods TO authenticated;
GRANT ALL ON public.monthly_periods TO service_role;
DROP POLICY IF EXISTS "Owners read their monthly periods" ON public.monthly_periods;
CREATE POLICY "Owners read their monthly periods" ON public.monthly_periods FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- Past monthly purchases: recorded, already closed, nothing removed (they were sold as never expiring).
INSERT INTO public.monthly_periods (owner_id, payment_id, pack_slug, credits, starts_at, ends_at, closed_at, expired_credits)
SELECT p.owner_id, p.id, p.pack_slug, p.credits, p.updated_at, p.updated_at + interval '30 days', now(), 0
FROM public.payments p JOIN public.credit_packs k ON k.slug = p.pack_slug
WHERE p.credited AND k.metadata->>'billing' = 'monthly'
ON CONFLICT (payment_id) DO NOTHING;

/** Closes one open period now: removes its unused credits (kind 'expire'). Caller holds the owner's lock. */
CREATE OR REPLACE FUNCTION public.close_monthly_period(_period uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.monthly_periods%ROWTYPE; spent integer; bal integer; res integer; unused integer;
BEGIN
  SELECT * INTO p FROM monthly_periods WHERE id = _period FOR UPDATE;
  IF NOT FOUND OR p.closed_at IS NOT NULL THEN RETURN 0; END IF;
  -- Net spending since the period started (charges, usage, media reservations, minus refunds).
  SELECT coalesce(-sum(amount), 0) INTO spent FROM credit_transactions
  WHERE owner_id = p.owner_id AND created_at >= p.starts_at AND kind IN ('charge', 'usage', 'reserve', 'refund');
  SELECT coalesce(sum(amount), 0) INTO bal FROM credit_transactions WHERE owner_id = p.owner_id;
  SELECT coalesce(sum(amount), 0) INTO res FROM credit_reservations WHERE owner_id = p.owner_id AND status = 'pending';
  unused := greatest(0, least(p.credits - greatest(spent, 0), bal - res));
  IF unused > 0 THEN
    INSERT INTO credit_transactions (owner_id, amount, kind, label)
    VALUES (p.owner_id, -unused, 'expire', 'Formule mensuelle · crédits non utilisés remis à zéro');
  END IF;
  UPDATE monthly_periods SET closed_at = now(), expired_credits = unused WHERE id = _period;
  RETURN unused;
END $$;
REVOKE ALL ON FUNCTION public.close_monthly_period(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_monthly_period(uuid) TO service_role;

/** Closes the ended periods of one owner (or of everyone when _owner is null, for the daily job). */
CREATE OR REPLACE FUNCTION public.close_monthly_periods(_owner uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n integer := 0;
BEGIN
  FOR r IN SELECT id, owner_id FROM monthly_periods
           WHERE closed_at IS NULL AND ends_at <= now() AND (_owner IS NULL OR owner_id = _owner) ORDER BY ends_at LOOP
    IF _owner IS NULL THEN PERFORM pg_advisory_xact_lock(hashtext(r.owner_id::text)); END IF;
    PERFORM close_monthly_period(r.id); n := n + 1;
  END LOOP;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.close_monthly_periods(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_monthly_periods(uuid) TO service_role;

/** A credited monthly payment closes the owner's open period (renewal = fresh month) and opens a new one. */
CREATE OR REPLACE FUNCTION public.payments_monthly_period()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; days integer;
BEGIN
  IF NOT NEW.credited OR OLD.credited THEN RETURN NEW; END IF;
  SELECT coalesce((metadata->>'days')::integer, 30) INTO days FROM credit_packs WHERE slug = NEW.pack_slug AND metadata->>'billing' = 'monthly';
  IF NOT FOUND THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.owner_id::text));
  FOR r IN SELECT id FROM monthly_periods WHERE owner_id = NEW.owner_id AND closed_at IS NULL LOOP
    PERFORM close_monthly_period(r.id);
  END LOOP;
  INSERT INTO monthly_periods (owner_id, payment_id, pack_slug, credits, starts_at, ends_at)
  VALUES (NEW.owner_id, NEW.id, NEW.pack_slug, NEW.credits, now(), now() + make_interval(days => days))
  ON CONFLICT (payment_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.payments_monthly_period() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS payments_monthly_period ON public.payments;
CREATE TRIGGER payments_monthly_period AFTER UPDATE OF credited ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_monthly_period();

/** The caller's monthly formula: the latest period (open or not), with its end date. */
CREATE OR REPLACE FUNCTION public.my_monthly_plan()
RETURNS TABLE (slug text, ends_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pack_slug, monthly_periods.ends_at FROM monthly_periods WHERE owner_id = auth.uid() ORDER BY starts_at DESC LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_monthly_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_monthly_plan() TO authenticated;

-- Reservations and the balance close ended periods first, so expired credits are never spent or shown.
CREATE OR REPLACE FUNCTION public.reserve_credits_v2(_owner uuid, _amount integer, _label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE bal integer; res integer; rid uuid;
BEGIN
  IF _owner IS NULL OR _amount <= 0 THEN RETURN NULL; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  PERFORM public.close_monthly_periods(_owner);
  UPDATE public.credit_reservations r SET status = 'released', settled_at = now()
  WHERE r.owner_id = _owner AND r.status = 'pending' AND r.created_at < now() - interval '30 minutes'
    AND NOT EXISTS (SELECT 1 FROM public.studio_jobs j WHERE j.reservation_id = r.id AND j.status = 'running');
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount), 0) INTO res FROM public.credit_reservations WHERE owner_id = _owner AND status = 'pending';
  IF bal - res < _amount THEN RETURN NULL; END IF;
  INSERT INTO public.credit_reservations (owner_id, amount, label) VALUES (_owner, _amount, _label) RETURNING id INTO rid;
  RETURN rid;
END
$function$;
REVOKE ALL ON FUNCTION public.reserve_credits_v2(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits_v2(uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_credits(_owner uuid, _amount integer, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; res integer;
BEGIN
  IF _amount <= 0 THEN RETURN true; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  PERFORM public.close_monthly_periods(_owner);
  SELECT COALESCE(SUM(amount),0) INTO bal FROM credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount),0) INTO res FROM credit_reservations WHERE owner_id = _owner AND status = 'pending';
  IF bal - res < _amount THEN RETURN false; END IF;
  INSERT INTO credit_transactions(owner_id, amount, kind, label) VALUES (_owner, -_amount, 'reserve', _label);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.get_wallet_balance(_owner uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE bal integer; res integer;
BEGIN
  IF _owner IS NULL OR (_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RETURN jsonb_build_object('balance', 0, 'reserved', 0, 'available', 0);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  PERFORM public.close_monthly_periods(_owner);
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount), 0) INTO res FROM public.credit_reservations WHERE owner_id = _owner AND status = 'pending';
  INSERT INTO public.credit_wallets (owner_id, balance, reserved_balance, updated_at)
  VALUES (_owner, bal, res, now())
  ON CONFLICT (owner_id) DO UPDATE SET balance = EXCLUDED.balance, reserved_balance = EXCLUDED.reserved_balance, updated_at = now();
  RETURN jsonb_build_object('balance', bal, 'reserved', res, 'available', bal - res);
END
$function$;
REVOKE ALL ON FUNCTION public.get_wallet_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated, service_role;
