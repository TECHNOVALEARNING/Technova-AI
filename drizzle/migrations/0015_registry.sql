CREATE TABLE IF NOT EXISTS public.registry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '',
  category text NOT NULL CHECK (category IN ('landing','animation','font','ui_kit','prompt','template','component','workflow')),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 60000),
  file_ext text NOT NULL DEFAULT 'txt' CHECK (file_ext IN ('txt','md','html','css','js','tsx','json','sql')),
  source text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT '',
  license text NOT NULL DEFAULT 'all_rights_reserved' CHECK (license IN ('cc0','mit','cc_by','cc_by_sa','ofl','technova','all_rights_reserved')),
  commercial_use boolean NOT NULL DEFAULT false,
  modification boolean NOT NULL DEFAULT false,
  redistribution boolean NOT NULL DEFAULT false,
  attribution_required boolean NOT NULL DEFAULT true,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private','public')),
  remix_of uuid REFERENCES public.registry_items(id) ON DELETE SET NULL,
  downloads integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A resource cannot be public unless its licence allows redistribution.
  CONSTRAINT registry_public_needs_rights CHECK (visibility = 'private' OR redistribution)
);
CREATE INDEX IF NOT EXISTS registry_items_cat_idx ON public.registry_items (category, visibility);
CREATE INDEX IF NOT EXISTS registry_items_owner_idx ON public.registry_items (owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registry_items TO authenticated;
GRANT ALL ON public.registry_items TO service_role;
ALTER TABLE public.registry_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read public or own items" ON public.registry_items;
CREATE POLICY "Read public or own items" ON public.registry_items FOR SELECT TO authenticated USING (visibility = 'public' OR owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners insert items" ON public.registry_items;
CREATE POLICY "Owners insert items" ON public.registry_items FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND downloads = 0);
DROP POLICY IF EXISTS "Owners update items" ON public.registry_items;
CREATE POLICY "Owners update items" ON public.registry_items FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Owners delete items" ON public.registry_items;
CREATE POLICY "Owners delete items" ON public.registry_items FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.registry_favorites (
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  item_id uuid NOT NULL REFERENCES public.registry_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.registry_favorites TO authenticated;
GRANT ALL ON public.registry_favorites TO service_role;
ALTER TABLE public.registry_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners manage favorites" ON public.registry_favorites;
CREATE POLICY "Owners manage favorites" ON public.registry_favorites FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Count a download; returns content only if the caller may read the item.
CREATE OR REPLACE FUNCTION public.registry_download(_item uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.registry_items%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.registry_items WHERE id = _item AND (visibility = 'public' OR owner_id = auth.uid());
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.registry_items SET downloads = downloads + 1 WHERE id = _item;
  RETURN r.content;
END $$;
REVOKE ALL ON FUNCTION public.registry_download(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registry_download(uuid) TO authenticated;

-- Remix: private copy for the caller, only when the licence allows modification.
CREATE OR REPLACE FUNCTION public.registry_remix(_item uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.registry_items%ROWTYPE; nid uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.registry_items WHERE id = _item AND (visibility = 'public' OR owner_id = uid);
  IF NOT FOUND OR (NOT r.modification AND r.owner_id IS DISTINCT FROM uid) THEN RETURN NULL; END IF;
  INSERT INTO public.registry_items (owner_id, title, description, category, content, file_ext, source, author, license, commercial_use, modification, redistribution, attribution_required, visibility, remix_of)
  VALUES (uid, left('Remix · ' || r.title, 120), r.description, r.category, r.content, r.file_ext, r.source, r.author, r.license, r.commercial_use, r.modification, r.redistribution, r.attribution_required, 'private', r.id)
  RETURNING id INTO nid;
  RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.registry_remix(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registry_remix(uuid) TO authenticated;