-- Slack Phase 2 — App Home preferences column.
-- Added per docs/slack-phase-2-interactive-spec.md §"DATABASE".
-- Default empty object so existing rows behave like "use defaults".
ALTER TABLE IF EXISTS public.slack_user_links
  ADD COLUMN IF NOT EXISTS home_preferences JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.slack_user_links.home_preferences IS
  'Slack App Home user preferences — notifications + default_tone. See modal_settings flow.';
