-- Website generation (TechNova Studio) is unlocked by a paid Essential, Creator or Pro pack (admins always).
-- Rollback: DROP FUNCTION IF EXISTS public.has_site_access(uuid);
CREATE OR REPLACE FUNCTION public.has_site_access(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user, 'admin')
      OR EXISTS (SELECT 1 FROM public.payments
                 WHERE owner_id = _user AND credited AND pack_slug IN ('essential', 'creator', 'pro'));
$$;
REVOKE ALL ON FUNCTION public.has_site_access(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_site_access(uuid) TO service_role;
