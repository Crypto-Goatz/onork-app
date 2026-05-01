-- Slack token rotation — security-first.
--
-- Slack rotates short-lived bot tokens (xoxb-…) every 12 hours and
-- issues a refresh token (xoxe-…) on install. Without rotation handling
-- the static bot token expires and every Slack API call 401s.
--
-- This migration:
--   * Adds rotation fields to slack_workspaces (refresh_token, expires_at,
--     lock + last-refresh bookkeeping, error counters).
--   * Locks the table down with RLS — only service_role may read or write.
--     User code never touches this table directly; everything funnels
--     through the lib/slack/tokens.ts service-role client.
--   * Adds an indexed flag for tokens that need refreshing soon, so a
--     batch refresher can sweep them efficiently.
--
-- The bot_token column (already used by the OAuth callback) continues to
-- hold the *current* access token and is written by the rotation code.
-- We keep the name for backwards compatibility instead of renaming it.

-- ─────────────────────────────────────────────────────────────────────
-- Table — create if missing (matches the shape the OAuth handler writes)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slack_workspaces (
  team_id TEXT PRIMARY KEY,
  team_name TEXT,
  bot_user_id TEXT,
  bot_token TEXT,
  app_id TEXT,
  installed_by_email TEXT,
  installed_by_oncore_user UUID,
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  uninstalled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────
-- Rotation columns
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE slack_workspaces
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_refresh_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_lock_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refresh_error_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refresh_error_message TEXT,
  ADD COLUMN IF NOT EXISTS rotation_enabled BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN slack_workspaces.refresh_token IS
  'Slack refresh token (xoxe-…). Rotated on every refresh. Service-role only.';
COMMENT ON COLUMN slack_workspaces.token_expires_at IS
  'When the current bot_token expires. Refresh when within 10 minutes.';
COMMENT ON COLUMN slack_workspaces.refresh_lock_until IS
  'Optimistic lock — set to NOW()+30s while a refresh is in flight to prevent thundering-herd.';
COMMENT ON COLUMN slack_workspaces.rotation_enabled IS
  'TRUE once the workspace has been bootstrapped onto rotating tokens. FALSE means bot_token is still a long-lived legacy token.';

-- ─────────────────────────────────────────────────────────────────────
-- Indexes — sweep candidates that need refresh soon
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS slack_workspaces_expires_idx
  ON slack_workspaces (token_expires_at)
  WHERE rotation_enabled = TRUE AND uninstalled_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────
-- updated_at trigger
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION slack_workspaces_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS slack_workspaces_touch ON slack_workspaces;
CREATE TRIGGER slack_workspaces_touch
  BEFORE UPDATE ON slack_workspaces
  FOR EACH ROW EXECUTE FUNCTION slack_workspaces_touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- RLS — deny everything; service_role bypasses RLS by design
-- ─────────────────────────────────────────────────────────────────────
ALTER TABLE slack_workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS slack_workspaces_no_anon ON slack_workspaces;
CREATE POLICY slack_workspaces_no_anon ON slack_workspaces
  FOR ALL TO authenticated, anon
  USING (FALSE)
  WITH CHECK (FALSE);

-- ─────────────────────────────────────────────────────────────────────
-- Atomic lock-acquisition helper
--
-- Returns the workspace row IF the caller successfully claimed the
-- refresh lock (refresh_lock_until <= NOW() OR NULL). If another worker
-- already holds the lock, returns no rows — the caller should re-read.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION slack_acquire_refresh_lock(p_team_id TEXT, p_lock_seconds INT DEFAULT 30)
RETURNS TABLE (
  team_id TEXT,
  bot_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  rotation_enabled BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE slack_workspaces w
     SET refresh_lock_until = NOW() + (p_lock_seconds || ' seconds')::INTERVAL
   WHERE w.team_id = p_team_id
     AND (w.refresh_lock_until IS NULL OR w.refresh_lock_until <= NOW())
     AND w.uninstalled_at IS NULL
  RETURNING w.team_id, w.bot_token, w.refresh_token, w.token_expires_at, w.rotation_enabled;
END $$;

REVOKE ALL ON FUNCTION slack_acquire_refresh_lock(TEXT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION slack_acquire_refresh_lock(TEXT, INT) TO service_role;
