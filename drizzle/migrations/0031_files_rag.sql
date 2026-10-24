-- Files in chat + knowledge bases (RAG on pgvector).
-- Pipeline (server only, src/lib/files.server.ts): UPLOAD → VALIDATE → SCAN → EXTRACT → CHUNK → EMBED → VECTOR DB → RETRIEVAL → AI.
-- Browsers upload straight to the private "user-files" bucket through a signed upload URL and can only READ
-- their own rows; every write (files, jobs, chunks, embeddings, logs) is done by server functions.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.match_document_chunks(uuid, extensions.vector, uuid[], uuid[], integer, double precision);
--   ALTER TABLE public.agents DROP COLUMN IF EXISTS knowledge_base_ids;
--   DROP TABLE IF EXISTS public.retrieval_logs, public.document_embeddings, public.document_chunks,
--     public.knowledge_sources, public.knowledge_bases, public.file_metadata, public.file_processing_jobs, public.files;
--   DELETE FROM storage.buckets WHERE id = 'user-files';  -- only if empty

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-files', 'user-files', false, 52428800)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 52428800;

CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  filename text NOT NULL CHECK (char_length(filename) BETWEEN 1 AND 255),
  ext text NOT NULL CHECK (char_length(ext) <= 20),
  mime text NOT NULL DEFAULT 'application/octet-stream' CHECK (char_length(mime) <= 120),
  size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 1 AND 52428800),
  kind text NOT NULL CHECK (kind IN ('document', 'spreadsheet', 'presentation', 'text', 'code', 'image', 'audio', 'video', 'archive')),
  origin text NOT NULL DEFAULT 'chat' CHECK (origin IN ('chat', 'knowledge')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed', 'rejected')),
  error text CHECK (char_length(error) <= 500),
  char_count integer NOT NULL DEFAULT 0,
  chunk_count integer NOT NULL DEFAULT 0,
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS files_owner_idx ON public.files (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.file_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'upload' CHECK (stage IN ('upload', 'validate', 'scan', 'extract', 'chunk', 'embed', 'index', 'done')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  error text CHECK (char_length(error) <= 500),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS file_jobs_file_idx ON public.file_processing_jobs (file_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.file_metadata (
  file_id uuid PRIMARY KEY REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sha256 text,
  detected_type text,
  pages integer,
  entries integer,
  extractor text,
  token_estimate integer,
  warnings text[] NOT NULL DEFAULT '{}',
  extracted_text text CHECK (char_length(extracted_text) <= 500000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.knowledge_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_bases_owner_idx ON public.knowledge_bases (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id uuid NOT NULL REFERENCES public.knowledge_bases(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (knowledge_base_id, file_id)
);
CREATE INDEX IF NOT EXISTS knowledge_sources_file_idx ON public.knowledge_sources (file_id);

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL CHECK (char_length(content) <= 8000),
  token_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, chunk_index)
);

CREATE TABLE IF NOT EXISTS public.document_embeddings (
  chunk_id uuid PRIMARY KEY REFERENCES public.document_chunks(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text NOT NULL,
  embedding extensions.vector(1536) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS document_embeddings_owner_idx ON public.document_embeddings (owner_id, file_id);
CREATE INDEX IF NOT EXISTS document_embeddings_hnsw ON public.document_embeddings USING hnsw (embedding extensions.vector_cosine_ops);

CREATE TABLE IF NOT EXISTS public.retrieval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context text NOT NULL CHECK (context IN ('chat', 'agent', 'search')),
  knowledge_base_ids uuid[] NOT NULL DEFAULT '{}',
  file_ids uuid[] NOT NULL DEFAULT '{}',
  query text NOT NULL CHECK (char_length(query) <= 2000),
  results jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retrieval_logs_owner_idx ON public.retrieval_logs (owner_id, created_at DESC);

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS knowledge_base_ids uuid[] NOT NULL DEFAULT '{}';

-- Owners read their own rows; only the server writes. Embeddings are never exposed to browsers.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['files', 'file_processing_jobs', 'file_metadata', 'knowledge_bases', 'knowledge_sources', 'document_chunks', 'retrieval_logs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('DROP POLICY IF EXISTS "Owners read" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Owners read" ON public.%I FOR SELECT TO authenticated USING (owner_id = auth.uid())', t);
  END LOOP;
END $$;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.document_embeddings FROM anon, authenticated;
GRANT ALL ON public.document_embeddings TO service_role;

-- Cosine search limited to one owner's ready files, from the given knowledge bases and/or files.
CREATE OR REPLACE FUNCTION public.match_document_chunks(
  _owner uuid, _embedding extensions.vector, _kb_ids uuid[], _file_ids uuid[], _k integer DEFAULT 6, _min_score double precision DEFAULT 0.2
) RETURNS TABLE (chunk_id uuid, file_id uuid, filename text, chunk_index integer, content text, score double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT c.id, c.file_id, f.filename, c.chunk_index, c.content, 1 - (e.embedding <=> _embedding) AS score
  FROM document_embeddings e
  JOIN document_chunks c ON c.id = e.chunk_id
  JOIN files f ON f.id = e.file_id
  WHERE e.owner_id = _owner AND f.owner_id = _owner AND f.status = 'ready'
    AND (e.file_id = ANY (coalesce(_file_ids, '{}'))
      OR e.file_id IN (SELECT s.file_id FROM knowledge_sources s WHERE s.owner_id = _owner AND s.knowledge_base_id = ANY (coalesce(_kb_ids, '{}'))))
    AND 1 - (e.embedding <=> _embedding) >= _min_score
  ORDER BY e.embedding <=> _embedding
  LIMIT least(greatest(_k, 1), 20);
$$;
REVOKE ALL ON FUNCTION public.match_document_chunks(uuid, extensions.vector, uuid[], uuid[], integer, double precision) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(uuid, extensions.vector, uuid[], uuid[], integer, double precision) TO service_role;
