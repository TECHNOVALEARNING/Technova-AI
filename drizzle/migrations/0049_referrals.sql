-- Referral programme: every account has a referral link (?ref=CODE). When someone signs up through it and
-- confirms their e-mail, both accounts receive REFERRAL_CREDITS (5) credits, once. Guards: no self-referral,
-- the referred account must be less than 7 days old and confirmed, an account is referred only once, and a
-- referrer earns at most 30 referrals per calendar month (UTC). Credits are written by security-definer functions
-- only; browsers read their own rows.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.claim_referral(text); DROP FUNCTION IF EXISTS public.my_referral_code();
--   DROP FUNCTION IF EXISTS public.my_referral_stats(); DROP TABLE IF EXISTS public.referrals; DROP TABLE IF EXISTS public.referral_codes;

CREATE TABLE IF NOT EXISTS public.referral_codes (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9]{6,12}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referral_codes FROM anon, authenticated;
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
DROP POLICY IF EXISTS "Owners read their referral code" ON public.referral_codes;
CREATE POLICY "Owners read their referral code" ON public.referral_codes FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.referrals (
  referee_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON public.referrals (referrer_id, created_at DESC);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.referrals FROM anon, authenticated;
GRANT ALL ON public.referrals TO service_role;

/** The caller's referral code, created on first use (8 hexadecimal characters). */
CREATE OR REPLACE FUNCTION public.my_referral_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c text;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT code INTO c FROM referral_codes WHERE owner_id = uid;
  IF c IS NOT NULL THEN RETURN c; END IF;
  LOOP
    c := substr(md5(random()::text || clock_timestamp()::text || uid::text), 1, 8);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = c);
  END LOOP;
  INSERT INTO referral_codes (owner_id, code) VALUES (uid, c) ON CONFLICT (owner_id) DO NOTHING;
  RETURN (SELECT code FROM referral_codes WHERE owner_id = uid);
END $$;
REVOKE ALL ON FUNCTION public.my_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_code() TO authenticated;

/**
 * Claims the referral of the caller (the new account) with the code from the link.
 * Returns: 'ok' (both credited), 'pending' (e-mail not confirmed yet: try again later), or a final refusal:
 * 'invalid', 'self', 'already', 'too_old', 'limit'.
 */
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ref uuid; u auth.users%ROWTYPE; n integer;
BEGIN
  IF uid IS NULL THEN RETURN 'invalid'; END IF;
  SELECT owner_id INTO ref FROM referral_codes WHERE code = lower(trim(coalesce(_code, '')));
  IF ref IS NULL THEN RETURN 'invalid'; END IF;
  IF ref = uid THEN RETURN 'self'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('referral:' || ref::text));
  IF EXISTS (SELECT 1 FROM referrals WHERE referee_id = uid) THEN RETURN 'already'; END IF;
  SELECT * INTO u FROM auth.users WHERE id = uid;
  IF u.created_at < now() - interval '7 days' THEN RETURN 'too_old'; END IF;
  IF u.email_confirmed_at IS NULL THEN RETURN 'pending'; END IF;
  IF EXISTS (SELECT 1 FROM account_suspensions WHERE user_id IN (uid, ref)) THEN RETURN 'invalid'; END IF;
  SELECT count(*) INTO n FROM referrals WHERE referrer_id = ref AND created_at >= date_trunc('month', now());
  IF n >= 30 THEN RETURN 'limit'; END IF;
  INSERT INTO referrals (referee_id, referrer_id, credits) VALUES (uid, ref, 5);
  INSERT INTO credit_transactions (owner_id, amount, kind, label) VALUES
    (uid, 5, 'referral', 'Parrainage · bienvenue'),
    (ref, 5, 'referral', 'Parrainage · nouveau filleul');
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

/** The caller's referral figures: referred accounts (all time, this month) and credits earned. */
CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS TABLE (referred integer, this_month integer, credits integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int, count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int, coalesce(sum(credits), 0)::int
  FROM referrals WHERE referrer_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_referral_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_stats() TO authenticated;
