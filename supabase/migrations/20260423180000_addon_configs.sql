-- Add-on Configuration — stores user settings that drive AI workflows
-- Each add-on's config fields are defined by the add-on, stored as JSONB

CREATE TABLE IF NOT EXISTS addon_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_slug TEXT NOT NULL,

  -- User-defined config that feeds into the AI workflow
  -- e.g. content-engine: { topics: [...], tone: "professional", frequency: "daily", platforms: ["linkedin", "x"] }
  config JSONB DEFAULT '{}'::jsonb,

  -- Execution state
  enabled BOOLEAN DEFAULT true,
  schedule TEXT DEFAULT 'daily',  -- daily, weekly, manual
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  run_count INTEGER DEFAULT 0,
  last_result JSONB,  -- result of last execution
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, addon_slug)
);

-- Execution history — every run of every add-on
CREATE TABLE IF NOT EXISTS addon_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_slug TEXT NOT NULL,
  status TEXT DEFAULT 'running',  -- running, success, error
  config_snapshot JSONB,  -- config at time of execution
  result JSONB,  -- what was produced
  error TEXT,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_addon_configs_user ON addon_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_addon_configs_schedule ON addon_configs(addon_slug, enabled, schedule)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_addon_configs_next_run ON addon_configs(next_run_at)
  WHERE enabled = true AND next_run_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_addon_executions_user ON addon_executions(user_id, addon_slug, started_at DESC);

-- RLS
ALTER TABLE addon_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY addon_configs_user_select ON addon_configs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY addon_configs_user_insert ON addon_configs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY addon_configs_user_update ON addon_configs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY addon_configs_user_delete ON addon_configs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY addon_configs_service ON addon_configs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY addon_executions_user_select ON addon_executions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY addon_executions_service ON addon_executions FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_addon_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER addon_configs_updated_at
  BEFORE UPDATE ON addon_configs
  FOR EACH ROW EXECUTE FUNCTION update_addon_configs_updated_at();
