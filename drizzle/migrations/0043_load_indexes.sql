-- Load hardening (audit of 2026-11-12).
-- 1. get_wallet_balance sums the pending reservations of one owner on every balance read (every 30 s on chat
--    pages) and reserve_credits checks them on every billable action: without an index each read scans the
--    whole table, which gains a row per message, image or build. A partial index keeps only pending rows.
CREATE INDEX IF NOT EXISTS credit_reservations_owner_pending_idx
  ON public.credit_reservations (owner_id) WHERE status = 'pending';
-- Expiry sweeps and admin views look for old pending reservations by date.
CREATE INDEX IF NOT EXISTS credit_reservations_pending_created_idx
  ON public.credit_reservations (created_at) WHERE status = 'pending';

-- 2. hit_rate_limit deletes windows older than one day; the primary key starts with user_id, so that
--    clean-up scanned the whole table.
CREATE INDEX IF NOT EXISTS rate_limits_window_start_idx ON public.rate_limits (window_start);

-- 3. The security log is filtered by account in the admin console and by kind in monitoring.
CREATE INDEX IF NOT EXISTS security_events_user_created_idx ON public.security_events (user_id, created_at DESC);
