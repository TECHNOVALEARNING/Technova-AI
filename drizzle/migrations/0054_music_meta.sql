-- Songs shown as an album card in the chat: title, lyrics, tags and duration returned by the music engine, and
-- whether the lyrics were written by the user (no lyrics file then) or the song is instrumental.
-- Rollback: ALTER TABLE public.media_generations DROP COLUMN IF EXISTS result_meta;
ALTER TABLE public.media_generations ADD COLUMN IF NOT EXISTS result_meta jsonb;
