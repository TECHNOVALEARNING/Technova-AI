-- Custom promo codes: each account may choose its own short code (4 to 20 letters, digits, - or _, stored in
-- capitals, unique, e.g. AWA2026) in Parrainage. A new account that types it at sign-up or in Parrainage is
-- credited exactly like a referral link (claim_referral: same rules, 5 credits each), and the referral records
-- which way it came (via = 'promo' or 'link'). Codes starting with TECHNOVA are reserved; a code can be changed
-- once a day; a code equal to someone's link code is refused.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.set_my_promo_code(text); DROP FUNCTION IF EXISTS public.my_promo_code();
--   ALTER TABLE public.referral_codes DROP COLUMN IF EXISTS promo_code, DROP COLUMN IF EXISTS promo_updated_at;
--   ALTER TABLE public.referrals DROP COLUMN IF EXISTS via;  -- then re-run claim_referral from 0049

ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS promo_code text CHECK (promo_code ~ '^[A-Z0-9][A-Z0-9_-]{3,19}$');
ALTER TABLE public.referral_codes ADD COLUMN IF NOT EXISTS promo_updated_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_promo_code_key ON public.referral_codes (promo_code) WHERE promo_code IS NOT NULL;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS via text NOT NULL DEFAULT 'link' CHECK (via IN ('link', 'promo'));

/** The caller's own promo code, or null when none was chosen yet. */
CREATE OR REPLACE FUNCTION public.my_promo_code()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT promo_code FROM referral_codes WHERE owner_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_promo_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_promo_code() TO authenticated;

/** Chooses (or removes with '') the caller's promo code: 'ok', 'invalid', 'taken', 'reserved' or 'too_soon'. */
CREATE OR REPLACE FUNCTION public.set_my_promo_code(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); c text := upper(regexp_replace(coalesce(_code, ''), '\s+', '', 'g')); row referral_codes%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RETURN 'invalid'; END IF;
  PERFORM public.my_referral_code();  -- makes sure the caller has a referral row
  SELECT * INTO row FROM referral_codes WHERE owner_id = uid FOR UPDATE;
  IF row.promo_code IS NOT DISTINCT FROM nullif(c, '') THEN RETURN 'ok'; END IF;
  IF row.promo_code IS NOT NULL AND row.promo_updated_at > now() - interval '1 day' THEN RETURN 'too_soon'; END IF;
  IF c = '' THEN
    UPDATE referral_codes SET promo_code = NULL, promo_updated_at = now() WHERE owner_id = uid;
    RETURN 'ok';
  END IF;
  IF c !~ '^[A-Z0-9][A-Z0-9_-]{3,19}$' THEN RETURN 'invalid'; END IF;
  IF c LIKE 'TECHNOVA%' OR c IN ('ADMIN', 'SUPPORT', 'PROMO', 'TEST', 'GRATUIT', 'FREE') THEN RETURN 'reserved'; END IF;
  IF EXISTS (SELECT 1 FROM referral_codes WHERE (promo_code = c OR code = lower(c)) AND owner_id <> uid) THEN RETURN 'taken'; END IF;
  UPDATE referral_codes SET promo_code = c, promo_updated_at = now() WHERE owner_id = uid;
  RETURN 'ok';
EXCEPTION WHEN unique_violation THEN RETURN 'taken';
END $$;
REVOKE ALL ON FUNCTION public.set_my_promo_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_promo_code(text) TO authenticated;

/** Same rules as 0049, now also accepting a promo code (checked first), and recording which way it came. */
CREATE OR REPLACE FUNCTION public.claim_referral(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ref uuid; u auth.users%ROWTYPE; n integer; how text := 'link';
  c text := regexp_replace(coalesce(_code, ''), '\s+', '', 'g');
BEGIN
  IF uid IS NULL OR c = '' THEN RETURN 'invalid'; END IF;
  SELECT owner_id INTO ref FROM referral_codes WHERE promo_code = upper(c);
  IF ref IS NOT NULL THEN how := 'promo';
  ELSE SELECT owner_id INTO ref FROM referral_codes WHERE code = lower(c); END IF;
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
  INSERT INTO referrals (referee_id, referrer_id, credits, via) VALUES (uid, ref, 5, how);
  INSERT INTO credit_transactions (owner_id, amount, kind, label) VALUES
    (uid, 5, 'referral', CASE how WHEN 'promo' THEN 'Code promo · bienvenue' ELSE 'Parrainage · bienvenue' END),
    (ref, 5, 'referral', CASE how WHEN 'promo' THEN 'Code promo · nouveau filleul' ELSE 'Parrainage · nouveau filleul' END);
  RETURN 'ok';
END $$;
REVOKE ALL ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;
