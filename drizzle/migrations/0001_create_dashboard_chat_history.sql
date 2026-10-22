CREATE TABLE public.chat_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT ALL ON public.chat_threads TO service_role;
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read threads" ON public.chat_threads FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Owners create threads" ON public.chat_threads FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update threads" ON public.chat_threads FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete threads" ON public.chat_threads FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE INDEX chat_threads_owner_recent ON public.chat_threads(owner_id, updated_at DESC);
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  sdk_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(thread_id, sdk_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read messages" ON public.chat_messages FOR SELECT TO authenticated USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.owner_id = auth.uid()));
CREATE POLICY "Owners create messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.owner_id = auth.uid()));
CREATE POLICY "Owners update messages" ON public.chat_messages FOR UPDATE TO authenticated USING (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.owner_id = auth.uid())) WITH CHECK (owner_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_threads t WHERE t.id = thread_id AND t.owner_id = auth.uid()));
CREATE INDEX chat_messages_thread_order ON public.chat_messages(thread_id, created_at ASC);