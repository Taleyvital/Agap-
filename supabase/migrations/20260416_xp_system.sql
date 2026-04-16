-- ============================================================
-- XP progression system
-- ============================================================

-- user_xp : one row per XP-earning event
CREATE TABLE IF NOT EXISTS user_xp (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type    text        NOT NULL,
  xp_earned      int         NOT NULL,
  created_at     timestamptz DEFAULT now() NOT NULL
);

-- user_levels : one row per user, updated on every XP event
CREATE TABLE IF NOT EXISTS user_levels (
  user_id            uuid  PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp           int   DEFAULT 0   NOT NULL,
  current_level      int   DEFAULT 1   NOT NULL,
  current_streak     int   DEFAULT 0   NOT NULL,
  longest_streak     int   DEFAULT 0   NOT NULL,
  last_activity_date date,
  updated_at         timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS user_xp_user_id_idx    ON user_xp (user_id);
CREATE INDEX IF NOT EXISTS user_xp_created_at_idx ON user_xp (created_at DESC);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE user_xp     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;

-- user_xp : each user sees and writes only their own rows
CREATE POLICY "user_xp_select_own"
  ON user_xp FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_xp_insert_own"
  ON user_xp FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_levels : each user sees and modifies only their own row
CREATE POLICY "user_levels_select_own"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_levels_insert_own"
  ON user_levels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_levels_update_own"
  ON user_levels FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
