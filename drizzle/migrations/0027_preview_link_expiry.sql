-- Phase 7 (V5.3) — shared preview links expire after 30 days (owners can also delete them at any time).
-- Rollback: ALTER TABLE public.studio_previews DROP COLUMN IF EXISTS expires_at;
ALTER TABLE public.studio_previews ADD COLUMN IF NOT EXISTS expires_at timestamptz;
UPDATE public.studio_previews SET expires_at = created_at + interval '30 days' WHERE expires_at IS NULL;
ALTER TABLE public.studio_previews ALTER COLUMN expires_at SET DEFAULT now() + interval '30 days';
ALTER TABLE public.studio_previews ALTER COLUMN expires_at SET NOT NULL;
