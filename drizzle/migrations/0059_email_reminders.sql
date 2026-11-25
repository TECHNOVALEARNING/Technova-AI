-- E-mail reminders (sent by the daily /api/public/media-purge job through Resend, src/lib/reminders.server.ts):
--   * monthly_ending  — a monthly formula or company plan ends within 3 days (once per period): renew, unused
--                       credits go back to zero at the end;
--   * low_balance     — a customer who has paid at least once has fewer than 100 credits left (at most every 14 days);
--   * unused_credits  — a customer who has paid at least once still holds 300 credits or more and has not used
--                       TechNova for 14 days (at most once a month).
-- Each e-mail carries an unsubscribe link (profiles.email_reminders = false); suspended accounts and accounts
-- waiting for deletion are skipped. email_reminders_sent prevents any duplicate.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.reminder_candidates(integer); DROP TABLE IF EXISTS public.email_reminders_sent;
--   ALTER TABLE public.profiles DROP COLUMN IF EXISTS email_reminders;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_reminders boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.email_reminders_sent (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('monthly_ending', 'low_balance', 'unused_credits')),
  ref text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_id, kind, ref)
);
CREATE INDEX IF NOT EXISTS email_reminders_sent_recent_idx ON public.email_reminders_sent (owner_id, kind, sent_at DESC);
ALTER TABLE public.email_reminders_sent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_reminders_sent FROM anon, authenticated;
GRANT ALL ON public.email_reminders_sent TO service_role;

/** Who should receive which reminder today (at most _limit rows). */
CREATE OR REPLACE FUNCTION public.reminder_candidates(_limit integer DEFAULT 200)
RETURNS TABLE (owner_id uuid, email text, display_name text, kind text, ref text, balance bigint, pack_slug text, ends_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  WITH eligible AS (
    SELECT u.id, u.email, coalesce(nullif(trim(p.display_name), ''), '') AS display_name
    FROM auth.users u JOIN profiles p ON p.id = u.id
    WHERE u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND p.email_reminders
      AND NOT EXISTS (SELECT 1 FROM account_suspensions s WHERE s.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM account_deletions d WHERE d.user_id = u.id)
  ),
  payers AS (SELECT DISTINCT owner_id FROM payments WHERE credited),
  balances AS (
    SELECT e.id, coalesce((SELECT sum(amount) FROM credit_transactions t WHERE t.owner_id = e.id), 0)
      - coalesce((SELECT sum(amount) FROM credit_reservations r WHERE r.owner_id = e.id AND r.status = 'pending'), 0) AS bal
    FROM eligible e WHERE e.id IN (SELECT owner_id FROM payers)
  )
  (SELECT e.id, e.email, e.display_name, 'monthly_ending'::text, mp.id::text, NULL::bigint, mp.pack_slug, mp.ends_at
   FROM eligible e JOIN monthly_periods mp ON mp.owner_id = e.id
   WHERE mp.closed_at IS NULL AND mp.ends_at > now() AND mp.ends_at <= now() + interval '3 days'
     AND NOT EXISTS (SELECT 1 FROM email_reminders_sent s WHERE s.owner_id = e.id AND s.kind = 'monthly_ending' AND s.ref = mp.id::text))
  UNION ALL
  (SELECT e.id, e.email, e.display_name, 'low_balance', to_char(now(), 'YYYY-MM-DD'), b.bal::bigint, NULL, NULL
   FROM eligible e JOIN balances b ON b.id = e.id
   WHERE b.bal < 100
     AND NOT EXISTS (SELECT 1 FROM email_reminders_sent s WHERE s.owner_id = e.id AND s.kind = 'low_balance' AND s.sent_at > now() - interval '14 days'))
  UNION ALL
  (SELECT e.id, e.email, e.display_name, 'unused_credits', to_char(now(), 'YYYY-MM'), b.bal::bigint, NULL, NULL
   FROM eligible e JOIN balances b ON b.id = e.id
   WHERE b.bal >= 300
     AND NOT EXISTS (SELECT 1 FROM usage_logs ul WHERE ul.owner_id = e.id AND ul.created_at > now() - interval '14 days')
     AND NOT EXISTS (SELECT 1 FROM email_reminders_sent s WHERE s.owner_id = e.id AND s.kind = 'unused_credits' AND s.ref = to_char(now(), 'YYYY-MM')))
  LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.reminder_candidates(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reminder_candidates(integer) TO service_role;
