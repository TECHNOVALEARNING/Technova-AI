-- Only four packs are sold: Starter, Essential, Creator, Pro.
-- Expert and Business are deactivated (kept for payment history) so they can no longer be shown or bought.
UPDATE public.credit_packs SET active = false, updated_at = now() WHERE slug IN ('expert', 'business');
