-- Phase 2 (V5.3) — video access (D1) and admin credit transfers (D6).
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_transfer_credits(uuid, uuid, integer, text, text);
--   DROP FUNCTION IF EXISTS public.admin_find_user(text);
--   DROP FUNCTION IF EXISTS public.has_video_access(uuid);
--   DROP TABLE IF EXISTS public.credit_transfers;

-- D1: video is unlocked once the account has paid for a Creator or Pro pack (admins always).
CREATE OR REPLACE FUNCTION public.has_video_access(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user, 'admin')
      OR EXISTS (SELECT 1 FROM public.payments
                 WHERE owner_id = _user AND credited AND pack_slug IN ('creator', 'pro'));
$$;
REVOKE ALL ON FUNCTION public.has_video_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_video_access(uuid) TO service_role;

-- D6: credits created by an admin for a user (no deduction from the admin), max 1 000 per transfer.
CREATE TABLE IF NOT EXISTS public.credit_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  to_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount BETWEEN 1 AND 1000),
  reason text NOT NULL DEFAULT '' CHECK (char_length(reason) <= 300),
  idempotency_key text NOT NULL UNIQUE CHECK (char_length(idempotency_key) BETWEEN 8 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS credit_transfers_to_user_idx ON public.credit_transfers (to_user_id, created_at DESC);
GRANT SELECT ON public.credit_transfers TO authenticated;
GRANT ALL ON public.credit_transfers TO service_role;
ALTER TABLE public.credit_transfers ENABLE ROW LEVEL SECURITY;
-- Read-only for admins; rows are written exclusively by admin_transfer_credits (no INSERT policy).
DROP POLICY IF EXISTS "Admins read credit transfers" ON public.credit_transfers;
CREATE POLICY "Admins read credit transfers" ON public.credit_transfers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Called only by the server after it has authenticated the admin; re-checks the role itself.
CREATE OR REPLACE FUNCTION public.admin_transfer_credits(_admin uuid, _to uuid, _amount integer, _reason text, _key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.credit_transfers%ROWTYPE; tid uuid; bal integer;
BEGIN
  IF NOT public.has_role(_admin, 'admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 1000 THEN RAISE EXCEPTION 'INVALID_AMOUNT'; END IF;
  IF _key IS NULL OR char_length(_key) NOT BETWEEN 8 AND 100 THEN RAISE EXCEPTION 'MISSING_IDEMPOTENCY_KEY'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _to) THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('credit_transfer:' || _key));
  SELECT * INTO existing FROM public.credit_transfers WHERE idempotency_key = _key;
  IF FOUND THEN
    IF existing.to_user_id <> _to OR existing.amount <> _amount THEN RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED'; END IF;
    RETURN jsonb_build_object('status', 'already_done', 'transfer_id', existing.id);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(_to::text));
  INSERT INTO public.credit_transfers (admin_id, to_user_id, amount, reason, idempotency_key)
  VALUES (_admin, _to, _amount, left(coalesce(_reason, ''), 300), _key) RETURNING id INTO tid;
  INSERT INTO public.credit_transactions (owner_id, amount, kind, label)
  VALUES (_to, _amount, 'admin_transfer', 'Crédits offerts par TechNova');
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _to;
  RETURN jsonb_build_object('status', 'success', 'transfer_id', tid, 'new_balance', bal);
END $$;
REVOKE ALL ON FUNCTION public.admin_transfer_credits(uuid, uuid, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_transfer_credits(uuid, uuid, integer, text, text) TO service_role;

-- Admin lookup by exact e-mail (auth.users is not reachable from the browser).
CREATE OR REPLACE FUNCTION public.admin_find_user(_email text)
RETURNS TABLE (id uuid, email text, display_name text, balance integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text, coalesce(p.display_name, ''),
         (SELECT COALESCE(SUM(t.amount), 0)::integer FROM public.credit_transactions t WHERE t.owner_id = u.id)
  FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id
  WHERE lower(u.email) = lower(btrim(_email))
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.admin_find_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_find_user(text) TO service_role;
