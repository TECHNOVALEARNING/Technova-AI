ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

CREATE OR REPLACE FUNCTION public.get_shared_thread(_token text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'title', t.title,
    'updated_at', t.updated_at,
    'messages', COALESCE((SELECT jsonb_agg(jsonb_build_object('role', m.role, 'parts', m.parts) ORDER BY m.created_at) FROM public.chat_messages m WHERE m.thread_id = t.id), '[]'::jsonb)
  )
  FROM public.chat_threads t
  WHERE _token IS NOT NULL AND length(_token) >= 20 AND t.share_token = _token
$$;
REVOKE ALL ON FUNCTION public.get_shared_thread(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_thread(text) TO anon, authenticated;