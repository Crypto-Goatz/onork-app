-- Slack multi-workspace OAuth — finalize columns + indexes.
--
-- The OAuth callback now writes `installed_by` (the installer's Slack
-- user id) and `installed_at` (the moment the workspace was first
-- linked). Both add value beyond the existing `installed_by_email`
-- and `created_at` — they're the canonical answers to "who installed
-- the bot?" and "when did this workspace come online?" without having
-- to hit Slack again.
--
-- The app_id index makes resolveHomeTeamId() in lib/slack/tokens.ts
-- O(log n) instead of a full scan once we have many workspaces.

ALTER TABLE slack_workspaces
  ADD COLUMN IF NOT EXISTS installed_by TEXT,
  ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ;

-- Backfill installed_at from created_at for workspaces that pre-date
-- this column. Leave installed_by NULL for those — we don't have
-- the original installer's Slack id.
UPDATE slack_workspaces
   SET installed_at = COALESCE(installed_at, created_at)
 WHERE installed_at IS NULL;

COMMENT ON COLUMN slack_workspaces.installed_by IS
  'Slack user id (U…) of whoever clicked the install link. Set on first install; not updated on re-install.';
COMMENT ON COLUMN slack_workspaces.installed_at IS
  'When the workspace was first linked. Stable across re-installs (unlike updated_at).';

CREATE INDEX IF NOT EXISTS slack_workspaces_app_id_idx
  ON slack_workspaces (app_id)
  WHERE uninstalled_at IS NULL;
