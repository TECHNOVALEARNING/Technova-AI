-- Welcome bonus only for accounts whose e-mail is confirmed (Google sign-ins are confirmed by Google):
-- throwaway sign-ups with fake addresses can no longer farm free credits.
-- Rollback: re-run the claim_welcome_bonus definition from 0003_credits_api_keys_usage.sql.

CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN 0; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(uid::text));
  IF NOT EXISTS (SELECT 1 FROM credit_transactions WHERE owner_id = uid AND kind = 'welcome')
     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = uid AND u.email_confirmed_at IS NOT NULL) THEN
    INSERT INTO credit_transactions (owner_id, amount, kind, label) VALUES (uid, 50, 'welcome', 'Bonus de bienvenue');
  END IF;
  RETURN (SELECT COALESCE(SUM(amount), 0) FROM credit_transactions WHERE owner_id = uid);
END $$;
REVOKE ALL ON FUNCTION public.claim_welcome_bonus() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;
