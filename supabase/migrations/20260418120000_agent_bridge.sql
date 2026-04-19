-- Agent Bridge execution log
CREATE TABLE IF NOT EXISTS bridge_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  location_id TEXT NOT NULL,
  action TEXT NOT NULL,
  intent TEXT NOT NULL,
  result JSONB,
  status TEXT DEFAULT 'running',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_bridge_exec_user ON bridge_executions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bridge_exec_location ON bridge_executions(location_id, created_at DESC);

-- Agent Bridge workflow definitions (stored workflows, voice agents, chat configs)
CREATE TABLE IF NOT EXISTS bridge_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  definition JSONB NOT NULL,
  status TEXT DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bridge_wf_location ON bridge_workflows(location_id, status);
CREATE INDEX IF NOT EXISTS idx_bridge_wf_trigger ON bridge_workflows(trigger, status);

-- Enable RLS
ALTER TABLE bridge_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridge_workflows ENABLE ROW LEVEL SECURITY;

-- Policies: users can see their own executions
CREATE POLICY bridge_exec_select ON bridge_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bridge_exec_insert ON bridge_executions
  FOR INSERT WITH CHECK (true);

CREATE POLICY bridge_exec_update ON bridge_executions
  FOR UPDATE USING (true);

-- Policies: users can see workflows for their location
CREATE POLICY bridge_wf_select ON bridge_workflows
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY bridge_wf_insert ON bridge_workflows
  FOR INSERT WITH CHECK (true);

CREATE POLICY bridge_wf_update ON bridge_workflows
  FOR UPDATE USING (true);
