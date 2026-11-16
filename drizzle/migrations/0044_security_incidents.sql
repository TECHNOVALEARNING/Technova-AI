-- Incident register (admin console → Incidents). Backs the privacy policy's breach-notification commitment:
-- authority within 72 h, e-mail to affected users when the risk is high, every incident recorded even when it is
-- not reported. Incidents open automatically from the security log (any "critical" event, or a burst of the same
-- warning) or by hand; the admin only decides. service_role only: the console reads them through server functions
-- that re-check the admin role.
-- Rollback: DROP TRIGGER security_events_incident ON public.security_events; DROP FUNCTION public.open_incident_from_event();
--           DROP FUNCTION public.admin_user_emails(uuid[]); DROP FUNCTION public.admin_all_user_emails(integer, integer);
--           DROP TABLE public.security_incidents;

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('auto', 'manual')),
  kind text,                                   -- security event kind that opened it (auto)
  event_count integer NOT NULL DEFAULT 0,
  detected_at timestamptz NOT NULL DEFAULT now(), -- start of the 72-hour window
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'not_reportable', 'reported', 'closed')),
  risk text NOT NULL DEFAULT 'unknown' CHECK (risk IN ('unknown', 'none', 'low', 'high')),
  affected_users uuid[] NOT NULL DEFAULT '{}',
  all_users boolean NOT NULL DEFAULT false,    -- the whole user base is concerned (e.g. database leak)
  data_categories text NOT NULL DEFAULT '' CHECK (char_length(data_categories) <= 1000),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 8000),
  measures text NOT NULL DEFAULT '' CHECK (char_length(measures) <= 8000),
  decision_note text NOT NULL DEFAULT '' CHECK (char_length(decision_note) <= 4000),
  decided_by uuid,
  decided_at timestamptz,
  authority_notified_at timestamptz,
  users_notified_at timestamptz,
  users_notified_count integer NOT NULL DEFAULT 0,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS security_incidents_detected_idx ON public.security_incidents (detected_at DESC);
CREATE INDEX IF NOT EXISTS security_incidents_open_idx ON public.security_incidents (status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS security_events_kind_time_idx ON public.security_events (kind, created_at DESC);
REVOKE ALL ON public.security_incidents FROM anon, authenticated;
GRANT ALL ON public.security_incidents TO service_role;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY; -- no policy: only service_role reads or writes

-- Opens (or adds to) an incident from the security log:
--   * every "critical" event;
--   * bursts of the same warning within one hour: forged payment webhooks (10), OAuth state mismatches (10),
--     test payments refused in production (5). Other warnings are protections that worked (file refused, site
--     blocked) or admin actions, so they stay in the log only. Real breaches found outside the log (a provider's
--     notice, a leaked key) are opened by hand.
-- A failure here never blocks the security log itself.
-- While an incident of that kind is still open, new events only raise its counter and add the account concerned.
CREATE OR REPLACE FUNCTION public.open_incident_from_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  threshold integer;
  recent integer;
  open_id uuid;
BEGIN
  IF NEW.severity NOT IN ('critical', 'warning') THEN RETURN NEW; END IF;
  SELECT id INTO open_id FROM public.security_incidents
    WHERE source = 'auto' AND kind = NEW.kind AND status = 'open' ORDER BY detected_at DESC LIMIT 1;
  IF open_id IS NOT NULL THEN
    UPDATE public.security_incidents SET event_count = event_count + 1, updated_at = now(),
      affected_users = CASE WHEN NEW.user_id IS NULL OR NEW.user_id = ANY(affected_users) OR cardinality(affected_users) >= 5000
                            THEN affected_users ELSE affected_users || NEW.user_id END
      WHERE id = open_id;
    RETURN NEW;
  END IF;
  IF NEW.severity = 'critical' THEN
    threshold := 1;
  ELSE
    threshold := CASE NEW.kind
      WHEN 'payment_webhook_invalid_signature' THEN 10
      WHEN 'connector_state_mismatch' THEN 10
      WHEN 'test_payment_blocked' THEN 5
      ELSE NULL END;
    IF threshold IS NULL THEN RETURN NEW; END IF;
  END IF;
  IF threshold > 1 THEN
    SELECT count(*) INTO recent FROM public.security_events
      WHERE kind = NEW.kind AND severity IN ('critical', 'warning') AND created_at > now() - interval '1 hour';
    IF recent < threshold THEN RETURN NEW; END IF;
  ELSE
    recent := 1;
  END IF;
  INSERT INTO public.security_incidents (title, source, kind, event_count, affected_users, description)
  VALUES (
    CASE WHEN NEW.severity = 'critical' THEN 'Événement critique : ' ELSE 'Série d''alertes : ' END || NEW.kind,
    'auto', NEW.kind, recent,
    COALESCE((SELECT array_agg(DISTINCT user_id) FROM (
      SELECT user_id FROM public.security_events
      WHERE kind = NEW.kind AND user_id IS NOT NULL AND created_at > now() - interval '1 hour' LIMIT 5000) s), '{}'),
    'Ouvert automatiquement à partir du journal de sécurité (' || recent || ' événement(s) « ' || NEW.kind || ' » en une heure). '
      || 'À qualifier : s''agit-il d''une violation de données personnelles (perte, vol, accès non autorisé, modification ou suppression) ?'
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'open_incident_from_event: %', SQLERRM;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.open_incident_from_event() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS security_events_incident ON public.security_events;
CREATE TRIGGER security_events_incident AFTER INSERT ON public.security_events
  FOR EACH ROW EXECUTE FUNCTION public.open_incident_from_event();

-- E-mail addresses for the notification step (service_role only, called after the admin check).
CREATE OR REPLACE FUNCTION public.admin_user_emails(_ids uuid[])
RETURNS TABLE (id uuid, email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text FROM auth.users u WHERE u.id = ANY(_ids) AND u.email IS NOT NULL
$$;
CREATE OR REPLACE FUNCTION public.admin_all_user_emails(_limit integer, _offset integer)
RETURNS TABLE (id uuid, email text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email::text FROM auth.users u WHERE u.email IS NOT NULL
  ORDER BY u.created_at LIMIT least(greatest(_limit, 1), 1000) OFFSET greatest(_offset, 0)
$$;
REVOKE ALL ON FUNCTION public.admin_user_emails(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_all_user_emails(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_emails(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_all_user_emails(integer, integer) TO service_role;
