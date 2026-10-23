-- Phase 5 (V5.3) — music generations (kie.ai Suno) share the media pipeline and its 14-day archive.
-- Rollback: ALTER TABLE public.media_generations DROP CONSTRAINT media_generations_kind_check;
--           ALTER TABLE public.media_generations ADD CONSTRAINT media_generations_kind_check CHECK (kind IN ('image', 'video'));
ALTER TABLE public.media_generations DROP CONSTRAINT IF EXISTS media_generations_kind_check;
ALTER TABLE public.media_generations ADD CONSTRAINT media_generations_kind_check CHECK (kind IN ('image', 'video', 'music'));
