-- Phase 3 (V5.3) — Arena: the same prompt answered by two models, then a vote.
-- Prompts and answers are NOT stored: only which models met, who won, and what it cost.
-- Rollback:
--   DROP FUNCTION IF EXISTS public.arena_leaderboard();
--   DROP TABLE IF EXISTS public.arena_battles;

CREATE TABLE IF NOT EXISTS public.arena_battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_a text NOT NULL,
  model_b text NOT NULL CHECK (model_b <> model_a),
  blind boolean NOT NULL DEFAULT true,
  winner text CHECK (winner IN ('a', 'b', 'tie')),
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  voted_at timestamptz
);
CREATE INDEX IF NOT EXISTS arena_battles_owner_idx ON public.arena_battles (owner_id, created_at DESC);
GRANT SELECT ON public.arena_battles TO authenticated;
GRANT ALL ON public.arena_battles TO service_role;
ALTER TABLE public.arena_battles ENABLE ROW LEVEL SECURITY;
-- Owners read their own battles; battles and votes are written only by the server.
DROP POLICY IF EXISTS "Owners read their arena battles" ON public.arena_battles;
CREATE POLICY "Owners read their arena battles" ON public.arena_battles FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

-- Public ranking from blind votes only (a voter who saw the names could be biased).
CREATE OR REPLACE FUNCTION public.arena_leaderboard()
RETURNS TABLE (model text, battles integer, wins integer, ties integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH sides AS (
    SELECT model_a AS model, CASE winner WHEN 'a' THEN 1 ELSE 0 END AS won, CASE winner WHEN 'tie' THEN 1 ELSE 0 END AS tied
    FROM public.arena_battles WHERE blind AND winner IS NOT NULL
    UNION ALL
    SELECT model_b, CASE winner WHEN 'b' THEN 1 ELSE 0 END, CASE winner WHEN 'tie' THEN 1 ELSE 0 END
    FROM public.arena_battles WHERE blind AND winner IS NOT NULL
  )
  SELECT model, count(*)::integer, sum(won)::integer, sum(tied)::integer
  FROM sides GROUP BY model
  ORDER BY (sum(won) + 0.5 * sum(tied)) / count(*) DESC, count(*) DESC;
$$;
REVOKE ALL ON FUNCTION public.arena_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.arena_leaderboard() TO authenticated, service_role;
