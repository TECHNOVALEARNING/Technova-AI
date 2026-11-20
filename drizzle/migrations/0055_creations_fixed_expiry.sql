-- Saved creations (Projects) are deleted exactly 14 days after they were FIRST saved: later saves change the
-- content but never push the date back (no renewal, so storage cannot be kept forever). An account also keeps at
-- most 50 MB of saved creations in total, besides the 300-file and 5 MB-per-file caps of 0051.
-- Rollback: re-run user_creations_guard from 0051_projects_creations.sql.

CREATE OR REPLACE FUNCTION public.user_creations_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE used bigint;
BEGIN
  NEW.size_bytes := octet_length(NEW.data::text);
  IF NEW.size_bytes > 5 * 1024 * 1024 THEN RAISE EXCEPTION 'CREATION_TOO_LARGE' USING ERRCODE = 'P0001'; END IF;
  IF NEW.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM projects WHERE id = NEW.project_id AND owner_id = NEW.owner_id) THEN
    RAISE EXCEPTION 'PROJECT_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  SELECT coalesce(sum(size_bytes), 0) INTO used FROM user_creations
    WHERE owner_id = NEW.owner_id AND (TG_OP = 'INSERT' OR id <> NEW.id);
  IF used + NEW.size_bytes > 50 * 1024 * 1024 THEN RAISE EXCEPTION 'CREATIONS_STORAGE_FULL' USING ERRCODE = 'P0001'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF (SELECT count(*) FROM user_creations WHERE owner_id = NEW.owner_id) >= 300 THEN RAISE EXCEPTION 'CREATIONS_LIMIT' USING ERRCODE = 'P0001'; END IF;
    NEW.created_at := now();
    NEW.expires_at := now() + interval '14 days';
  ELSE
    NEW.owner_id := OLD.owner_id; NEW.created_at := OLD.created_at;
    NEW.expires_at := OLD.expires_at;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.user_creations_guard() FROM PUBLIC, anon, authenticated;
