-- Center Parcs Games: a family scoreboard that lives at martincase.app/games.
-- Ported from the Lovable "Orlando Game Hub" project, whose schema lived in its own
-- Supabase project. Here the tables are prefixed cp_games_ so they sit apart from the
-- 358 Insight Central tables and can be dropped as a unit.
--
-- Access model is the same as the original app: no login, the anon key can read and
-- write these six tables (and only these six). The app's own "Reset" button relies on
-- anon DELETE. Nothing else in Insight Central references them.

CREATE TABLE public.cp_games_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cp_games_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cp_games_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.cp_games_events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.cp_games_players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position IN (1, 2)),
  points INTEGER NOT NULL CHECK (points IN (3, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cp_games_scores_event_id ON public.cp_games_scores(event_id);
CREATE INDEX idx_cp_games_scores_player_id ON public.cp_games_scores(player_id);

CREATE TABLE public.cp_games_mini_golf_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  holes_count INTEGER NOT NULL CHECK (holes_count IN (9, 18)),
  -- 'abandoned' is included: the original CHECK omitted it, so its Abandon button
  -- could never actually save.
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'in_progress', 'completed', 'abandoned')),
  current_hole INTEGER NOT NULL DEFAULT 1,
  current_player_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.cp_games_mini_golf_hole_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.cp_games_mini_golf_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.cp_games_players(id) ON DELETE CASCADE,
  hole_number INTEGER NOT NULL CHECK (hole_number >= 1 AND hole_number <= 18),
  strokes INTEGER NOT NULL CHECK (strokes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id, hole_number)
);

CREATE TABLE public.cp_games_mini_golf_round_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES public.cp_games_mini_golf_rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.cp_games_players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id)
);

CREATE INDEX idx_cp_games_mg_hole_scores_round_id ON public.cp_games_mini_golf_hole_scores(round_id);
CREATE INDEX idx_cp_games_mg_round_players_round_id ON public.cp_games_mini_golf_round_players(round_id);

ALTER TABLE public.cp_games_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_games_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_games_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_games_mini_golf_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_games_mini_golf_hole_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cp_games_mini_golf_round_players ENABLE ROW LEVEL SECURITY;

-- One permissive policy per table, scoped to anon + authenticated (not public).
CREATE POLICY "cp_games anon full access" ON public.cp_games_players
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cp_games anon full access" ON public.cp_games_events
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cp_games anon full access" ON public.cp_games_scores
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cp_games anon full access" ON public.cp_games_mini_golf_rounds
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cp_games anon full access" ON public.cp_games_mini_golf_hole_scores
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cp_games anon full access" ON public.cp_games_mini_golf_round_players
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
