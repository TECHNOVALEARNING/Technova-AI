-- Company plans: TechNova Team (5 accounts) and TechNova Entreprise (25 accounts), monthly like Mensuel Plus/Pro
-- (credits reset every month, see 0056; no automatic renewal). The buyer becomes the administrator of an
-- organization; the accounts they add (sub-accounts) spend the shared credit pool, which is the administrator's
-- own ledger, and get every Pro feature while the plan is active. The administrator unticks the features the
-- company does not use (organizations.disabled_features); every billable server route re-checks it
-- (org_feature_allowed), the share-link and agent triggers too.
-- Pricing (same floor as 0050: 1 credit <= USD 1/1 200, USD 1 <= 650 FCFA, 4 % fees):
--   Team 49 000 FCFA -> 58 000 credits (<= 31 417 FCFA of cost, margin >= 32 %),
--   Entreprise 149 000 FCFA -> 178 000 credits (<= 96 417 FCFA of cost, margin >= 31 %).
-- Rollback:
--   DROP TRIGGER IF EXISTS payments_organization ON public.payments; DROP FUNCTION IF EXISTS public.payments_organization();
--   DROP FUNCTION IF EXISTS public.org_feature_allowed(uuid, text); DROP FUNCTION IF EXISTS public.billing_owner(uuid);
--   DROP FUNCTION IF EXISTS public.org_is_active(uuid); DROP FUNCTION IF EXISTS public.user_id_by_email(text);
--   DROP FUNCTION IF EXISTS public.org_usage(uuid, timestamptz);
--   DROP TABLE IF EXISTS public.organization_events, public.organization_members, public.organizations;
--   DELETE FROM public.credit_packs WHERE slug IN ('team', 'entreprise');
--   re-run account_tier from 0050, the reserve / balance functions from 0056, the triggers from 0034.

INSERT INTO public.credit_packs (name, slug, price_xof, credits, featured, display_order, metadata) VALUES
  ('TechNova Team', 'team', 49000, 58000, false, 20, '{"billing": "monthly", "days": 30, "tier": 3, "org": true, "seats": 5}'::jsonb),
  ('TechNova Entreprise', 'entreprise', 149000, 178000, false, 21, '{"billing": "monthly", "days": 30, "tier": 3, "org": true, "seats": 25}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, price_xof = EXCLUDED.price_xof, credits = EXCLUDED.credits,
  featured = EXCLUDED.featured, display_order = EXCLUDED.display_order, metadata = EXCLUDED.metadata, active = true, updated_at = now();

CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  plan_slug text NOT NULL CHECK (plan_slug IN ('team', 'entreprise')),
  seats integer NOT NULL CHECK (seats > 0),
  disabled_features text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz,
  PRIMARY KEY (org_id, user_id)
);
-- An account belongs to one company at a time.
CREATE UNIQUE INDEX IF NOT EXISTS organization_members_one_active ON public.organization_members (user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS organization_members_user_idx ON public.organization_members (user_id);
CREATE TABLE IF NOT EXISTS public.organization_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_events_org_idx ON public.organization_events (org_id, created_at DESC);

-- Everything goes through server functions (service_role) that check the caller's role in the company.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organizations, public.organization_members, public.organization_events FROM anon, authenticated;
GRANT ALL ON public.organizations, public.organization_members, public.organization_events TO service_role;

/** The company plan is active while its administrator has an open Team / Entreprise month. */
CREATE OR REPLACE FUNCTION public.org_is_active(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM organizations o JOIN monthly_periods p ON p.owner_id = o.owner_id
    WHERE o.id = _org AND p.pack_slug IN ('team', 'entreprise') AND p.closed_at IS NULL AND p.ends_at > now());
$$;
REVOKE ALL ON FUNCTION public.org_is_active(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_is_active(uuid) TO service_role;

/** Whose credits a user spends: the company administrator for an active sub-account, else the user. */
CREATE OR REPLACE FUNCTION public.billing_owner(_user uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT o.owner_id FROM organization_members m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = _user AND m.status = 'active' AND m.role = 'member' AND public.org_is_active(o.id) LIMIT 1), _user);
$$;
REVOKE ALL ON FUNCTION public.billing_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_owner(uuid) TO service_role;

/** False when the user is a sub-account of an active company whose administrator unticked this feature. */
CREATE OR REPLACE FUNCTION public.org_feature_allowed(_user uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM organization_members m JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = _user AND m.status = 'active' AND m.role = 'member' AND _feature = ANY (o.disabled_features)
      AND public.org_is_active(o.id));
$$;
REVOKE ALL ON FUNCTION public.org_feature_allowed(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_feature_allowed(uuid, text) TO service_role;

/** Server-side lookup used to add an existing account to a company (never exposed to browsers). */
CREATE OR REPLACE FUNCTION public.user_id_by_email(_email text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.user_id_by_email(text) TO service_role;

/** A credited Team / Entreprise payment creates (or upgrades) the buyer's company, the buyer as administrator. */
CREATE OR REPLACE FUNCTION public.payments_organization()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE k public.credit_packs%ROWTYPE; oid uuid; nm text; mail text;
BEGIN
  IF NOT NEW.credited OR OLD.credited OR NEW.pack_slug NOT IN ('team', 'entreprise') THEN RETURN NEW; END IF;
  SELECT * INTO k FROM credit_packs WHERE slug = NEW.pack_slug;
  SELECT coalesce(nullif(trim(display_name), ''), 'Mon entreprise') INTO nm FROM profiles WHERE id = NEW.owner_id;
  SELECT email INTO mail FROM auth.users WHERE id = NEW.owner_id;
  INSERT INTO organizations (owner_id, name, plan_slug, seats)
  VALUES (NEW.owner_id, left(coalesce(nm, 'Mon entreprise'), 80), NEW.pack_slug, coalesce((k.metadata->>'seats')::integer, 5))
  ON CONFLICT (owner_id) DO UPDATE SET plan_slug = EXCLUDED.plan_slug, seats = EXCLUDED.seats, updated_at = now()
  RETURNING id INTO oid;
  -- The administrator leaves any company they were a sub-account of.
  DELETE FROM organization_members WHERE user_id = NEW.owner_id AND org_id <> oid;
  INSERT INTO organization_members (org_id, user_id, email, role, status, joined_at)
  VALUES (oid, NEW.owner_id, coalesce(mail, ''), 'admin', 'active', now())
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = 'admin', status = 'active';
  INSERT INTO organization_events (org_id, actor_id, action, detail) VALUES (oid, NEW.owner_id, 'plan_paid', jsonb_build_object('plan', NEW.pack_slug));
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.payments_organization() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS payments_organization ON public.payments;
CREATE TRIGGER payments_organization AFTER UPDATE OF credited ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.payments_organization();

-- Plans: Team / Entreprise open Pro (3); an active sub-account gets Pro while the company plan is active.
CREATE OR REPLACE FUNCTION public.account_tier(_user uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_user, 'admin') THEN 3
    WHEN public.billing_owner(_user) <> _user THEN 3
    ELSE coalesce((
    SELECT max(CASE pack_slug WHEN 'pro' THEN 3 WHEN 'mensuel-pro' THEN 3 WHEN 'team' THEN 3 WHEN 'entreprise' THEN 3
      WHEN 'creator' THEN 2 WHEN 'mensuel-plus' THEN 2 WHEN 'essential' THEN 1 ELSE 0 END)
    FROM public.payments WHERE owner_id = _user AND credited), 0) END;
$$;
REVOKE ALL ON FUNCTION public.account_tier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.account_tier(uuid) TO service_role;

-- Credits: a sub-account reserves and spends from the company pool (the reservation and the charge are written
-- on the administrator's ledger; usage_logs and chat_engine_costs keep the sub-account, for the company dashboard).
CREATE OR REPLACE FUNCTION public.reserve_credits_v2(_owner uuid, _amount integer, _label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE bal integer; res integer; rid uuid;
BEGIN
  IF _owner IS NULL OR _amount <= 0 THEN RETURN NULL; END IF;
  _owner := public.billing_owner(_owner);
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  PERFORM public.close_monthly_periods(_owner);
  UPDATE public.credit_reservations r SET status = 'released', settled_at = now()
  WHERE r.owner_id = _owner AND r.status = 'pending' AND r.created_at < now() - interval '30 minutes'
    AND NOT EXISTS (SELECT 1 FROM public.studio_jobs j WHERE j.reservation_id = r.id AND j.status = 'running');
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount), 0) INTO res FROM public.credit_reservations WHERE owner_id = _owner AND status = 'pending';
  IF bal - res < _amount THEN RETURN NULL; END IF;
  INSERT INTO public.credit_reservations (owner_id, amount, label) VALUES (_owner, _amount, _label) RETURNING id INTO rid;
  RETURN rid;
END
$function$;
REVOKE ALL ON FUNCTION public.reserve_credits_v2(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits_v2(uuid, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reserve_credits(_owner uuid, _amount integer, _label text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal integer; res integer;
BEGIN
  IF _amount <= 0 THEN RETURN true; END IF;
  _owner := public.billing_owner(_owner);
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  PERFORM public.close_monthly_periods(_owner);
  SELECT COALESCE(SUM(amount),0) INTO bal FROM credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount),0) INTO res FROM credit_reservations WHERE owner_id = _owner AND status = 'pending';
  IF bal - res < _amount THEN RETURN false; END IF;
  INSERT INTO credit_transactions(owner_id, amount, kind, label) VALUES (_owner, -_amount, 'reserve', _label);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.reserve_credits(uuid, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, integer, text) TO service_role;

/** Balance: a sub-account reads the company pool. */
CREATE OR REPLACE FUNCTION public.get_wallet_balance(_owner uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE bal integer; res integer;
BEGIN
  IF _owner IS NULL OR (_owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin'::public.app_role)) THEN
    RETURN jsonb_build_object('balance', 0, 'reserved', 0, 'available', 0);
  END IF;
  _owner := public.billing_owner(_owner);
  PERFORM pg_advisory_xact_lock(hashtext(_owner::text));
  PERFORM public.close_monthly_periods(_owner);
  SELECT COALESCE(SUM(amount), 0) INTO bal FROM public.credit_transactions WHERE owner_id = _owner;
  SELECT COALESCE(SUM(amount), 0) INTO res FROM public.credit_reservations WHERE owner_id = _owner AND status = 'pending';
  INSERT INTO public.credit_wallets (owner_id, balance, reserved_balance, updated_at)
  VALUES (_owner, bal, res, now())
  ON CONFLICT (owner_id) DO UPDATE SET balance = EXCLUDED.balance, reserved_balance = EXCLUDED.reserved_balance, updated_at = now();
  RETURN jsonb_build_object('balance', bal, 'reserved', res, 'available', bal - res);
END
$function$;
REVOKE ALL ON FUNCTION public.get_wallet_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated, service_role;

-- Share links and agents: the plan check of 0034 plus the company's ticked features.
CREATE OR REPLACE FUNCTION public.chat_threads_share_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.share_token IS NOT NULL AND OLD.share_token IS NULL THEN
    IF NOT public.org_feature_allowed(NEW.owner_id, 'share') THEN
      RAISE EXCEPTION 'ORG_FEATURE_DISABLED:share' USING ERRCODE = 'P0001';
    END IF;
    IF public.account_tier(NEW.owner_id) < 1 THEN
      RAISE EXCEPTION 'PLAN_UPGRADE_REQUIRED:share' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.chat_threads_share_plan() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.agents_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tier integer := public.account_tier(NEW.owner_id);
BEGIN
  IF TG_OP = 'INSERT' AND NOT public.org_feature_allowed(NEW.owner_id, 'agents') THEN
    RAISE EXCEPTION 'ORG_FEATURE_DISABLED:agents' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'INSERT' AND tier < 2 THEN
    RAISE EXCEPTION 'PLAN_UPGRADE_REQUIRED:agents' USING ERRCODE = 'P0001';
  END IF;
  IF tier < 3 THEN NEW.max_cost := 20; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.agents_plan() FROM PUBLIC, anon, authenticated;

/** Company dashboard: per-member usage since a date (credits from usage_logs, requests, last activity). */
CREATE OR REPLACE FUNCTION public.org_usage(_org uuid, _since timestamptz)
RETURNS TABLE (user_id uuid, credits bigint, requests bigint, last_at timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.user_id, coalesce(sum(u.credits), 0)::bigint, count(u.id)::bigint, max(u.created_at)
  FROM organization_members m LEFT JOIN usage_logs u ON u.owner_id = m.user_id AND u.created_at >= _since
  WHERE m.org_id = _org AND m.status = 'active' GROUP BY m.user_id;
$$;
REVOKE ALL ON FUNCTION public.org_usage(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.org_usage(uuid, timestamptz) TO service_role;
