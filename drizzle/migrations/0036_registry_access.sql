-- Registry access by plan: the official TechNova designs are included with the Creator and Pro packs.
-- Starter, Essential and accounts without a purchase keep one open design (Halo — Landing SaaS) and see the
-- rest of the catalogue as locked cards (title, description, category only; never the content).
-- Community and personal items are unchanged. Also adds the "dashboard" category (consoles).
-- Rollback:
--   DROP FUNCTION IF EXISTS public.registry_catalog(); DROP FUNCTION IF EXISTS public.registry_item_open(uuid, uuid);
--   recreate the 0015 SELECT policy, registry_download and registry_remix; restore the 0015 category check.

ALTER TABLE public.registry_items DROP CONSTRAINT IF EXISTS registry_items_category_check;
ALTER TABLE public.registry_items ADD CONSTRAINT registry_items_category_check
  CHECK (category IN ('landing','animation','font','ui_kit','prompt','template','component','workflow','dashboard'));

-- Whether the signed-in account may read an item's content: its own or a community item, the one open
-- official design, or any official design with a Creator or Pro pack.
CREATE OR REPLACE FUNCTION public.registry_item_open(_id uuid, _owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner IS NOT NULL
    OR _id = '7e0c0000-0000-4000-8000-000000000101'::uuid
    OR (auth.uid() IS NOT NULL AND public.account_tier(auth.uid()) >= 2);
$$;
REVOKE ALL ON FUNCTION public.registry_item_open(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registry_item_open(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Read public or own items" ON public.registry_items;
CREATE POLICY "Read public or own items" ON public.registry_items FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (visibility = 'public' AND public.registry_item_open(id, owner_id)));

CREATE OR REPLACE FUNCTION public.registry_download(_item uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.registry_items%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.registry_items WHERE id = _item
    AND (owner_id = auth.uid() OR (visibility = 'public' AND public.registry_item_open(id, owner_id)));
  IF NOT FOUND THEN RETURN NULL; END IF;
  UPDATE public.registry_items SET downloads = downloads + 1 WHERE id = _item;
  RETURN r.content;
END $$;

CREATE OR REPLACE FUNCTION public.registry_remix(_item uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r public.registry_items%ROWTYPE; nid uuid; uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.registry_items WHERE id = _item
    AND (owner_id = uid OR (visibility = 'public' AND public.registry_item_open(id, owner_id)));
  IF NOT FOUND OR (NOT r.modification AND r.owner_id IS DISTINCT FROM uid) THEN RETURN NULL; END IF;
  INSERT INTO public.registry_items (owner_id, title, description, category, content, file_ext, source, author, license, commercial_use, modification, redistribution, attribution_required, visibility, remix_of)
  VALUES (uid, left('Remix · ' || r.title, 120), r.description, r.category, r.content, r.file_ext, r.source, r.author, r.license, r.commercial_use, r.modification, r.redistribution, r.attribution_required, 'private', r.id)
  RETURNING id INTO nid;
  RETURN nid;
END $$;
REVOKE ALL ON FUNCTION public.registry_download(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registry_download(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.registry_remix(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registry_remix(uuid) TO authenticated;

-- The official catalogue for locked cards: metadata only, plus whether this account can open each design.
CREATE OR REPLACE FUNCTION public.registry_catalog()
RETURNS TABLE (id uuid, title text, description text, category text, file_ext text, downloads integer, created_at timestamptz, unlocked boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.title, r.description, r.category, r.file_ext, r.downloads, r.created_at, public.registry_item_open(r.id, r.owner_id)
  FROM public.registry_items r
  WHERE r.owner_id IS NULL AND r.visibility = 'public' AND auth.uid() IS NOT NULL
  ORDER BY r.id;
$$;
REVOKE ALL ON FUNCTION public.registry_catalog() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registry_catalog() TO authenticated;
