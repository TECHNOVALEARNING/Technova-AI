-- Studio builds are billed at their real provider cost when it exceeds the standard price (250 credits minimum,
-- 800 at most, reserved up front). The job keeps the USD cost of every attempt so a resumed build still bills
-- what interrupted runs consumed. The code skips this column until the migration has run.
-- Rollback: ALTER TABLE public.studio_jobs DROP COLUMN IF EXISTS cost_usd;
ALTER TABLE public.studio_jobs ADD COLUMN IF NOT EXISTS cost_usd numeric(12, 6) NOT NULL DEFAULT 0;
