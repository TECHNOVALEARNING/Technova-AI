ALTER TABLE public.media_generations ADD COLUMN IF NOT EXISTS reserved_credits integer NOT NULL DEFAULT 0;
ALTER TABLE public.media_generations ADD COLUMN IF NOT EXISTS charged_credits integer;
ALTER TABLE public.media_generations ADD COLUMN IF NOT EXISTS settled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.reserve_credits(_owner uuid, _amount integer, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer;
BEGIN
  IF _amount <= 0 THEN RETURN true; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  SELECT COALESCE(SUM(amount),0) INTO bal FROM credit_transactions WHERE owner_id = _owner;
  IF bal < _amount THEN RETURN false; END IF;
  INSERT INTO credit_transactions(owner_id, amount, kind, label) VALUES (_owner, -_amount, 'reserve', _label);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, text) TO service_role;