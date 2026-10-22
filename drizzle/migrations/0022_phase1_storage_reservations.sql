-- Phase 1 (V5.3) — storage bucket for archived media + atomic credit reservations for chat/Studio.
-- Rollback:
--   ALTER TABLE public.studio_jobs DROP COLUMN IF EXISTS reservation_id;
--   (re-run the reserve_credits_v2 definition from 0013)
--   DELETE FROM storage.buckets WHERE id = 'media-files';  -- only if empty

-- A1: private bucket used by src/lib/media-archive.server.ts (served through signed URLs only).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media-files', 'media-files', false, 524288000)
ON CONFLICT (id) DO NOTHING;

-- A2: a Studio build keeps its credit reservation until it finishes, even across worker resumes.
ALTER TABLE public.studio_jobs ADD COLUMN IF NOT EXISTS reservation_id uuid;

-- reserve_credits_v2 now also frees reservations abandoned for 30 minutes (closed tab, crashed
-- request), except those held by a Studio build that is still running.
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

-- Media generations (reserve_credits v1) must not spend credits already reserved by chat/Studio.
CREATE OR REPLACE FUNCTION public.reserve_credits(_owner uuid, _amount integer, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; res integer;
BEGIN
  IF _amount <= 0 THEN RETURN true; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  SELECT COALESCE(SUM(amount),0) INTO bal FROM credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount),0) INTO res FROM credit_reservations WHERE owner_id = _owner AND status = 'pending';
  IF bal - res < _amount THEN RETURN false; END IF;
  INSERT INTO credit_transactions(owner_id, amount, kind, label) VALUES (_owner, -_amount, 'reserve', _label);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, text) TO service_role;
