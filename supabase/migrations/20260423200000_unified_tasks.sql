-- Unified Task Layer — single source of truth for ALL tasks
-- Tasks can originate from ANY service and sync bidirectionally
-- The AI guardian ensures no task ever dies

CREATE TABLE IF NOT EXISTS unified_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core task data
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',       -- todo, in_progress, done, blocked, cancelled
  priority TEXT DEFAULT 'medium',   -- low, medium, high, urgent
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Categorization
  project TEXT,                     -- Project/group name
  tags TEXT[] DEFAULT '{}',
  assigned_to TEXT,                 -- Name or email
  client_id TEXT,                   -- CRM contact ID if linked

  -- Recurrence
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,             -- RRULE format (FREQ=DAILY;INTERVAL=1)
  next_occurrence TIMESTAMPTZ,
  parent_task_id UUID REFERENCES unified_tasks(id),  -- Recurring parent

  -- Multi-service sync (a task can exist in multiple places)
  sources JSONB DEFAULT '[]'::jsonb,
  -- Format: [{ "service": "google_tasks", "external_id": "abc123", "list_id": "def456", "synced_at": "..." }, ...]

  -- AI guardian
  guardian_enabled BOOLEAN DEFAULT true,
  guardian_last_check TIMESTAMPTZ,
  guardian_status TEXT DEFAULT 'healthy',  -- healthy, stalled, overdue, failed
  guardian_notes TEXT,
  stall_threshold_hours INTEGER DEFAULT 72, -- Alert if no progress in N hours

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task sync log — tracks every sync operation
CREATE TABLE IF NOT EXISTS task_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES unified_tasks(id) ON DELETE CASCADE,
  service TEXT NOT NULL,            -- google_tasks, crm, asana, linear, jira, github, slack
  direction TEXT NOT NULL,          -- inbound (service→0ncore), outbound (0ncore→service)
  action TEXT NOT NULL,             -- create, update, complete, delete
  external_id TEXT,
  payload JSONB,
  status TEXT DEFAULT 'success',    -- success, error
  error TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unified_tasks_user ON unified_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_tasks_status ON unified_tasks(user_id, status) WHERE status != 'done';
CREATE INDEX IF NOT EXISTS idx_unified_tasks_due ON unified_tasks(due_date) WHERE due_date IS NOT NULL AND status != 'done';
CREATE INDEX IF NOT EXISTS idx_unified_tasks_guardian ON unified_tasks(guardian_status, guardian_enabled)
  WHERE guardian_enabled = true AND status NOT IN ('done', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_unified_tasks_recurring ON unified_tasks(recurring, next_occurrence)
  WHERE recurring = true;
CREATE INDEX IF NOT EXISTS idx_unified_tasks_sources ON unified_tasks USING gin(sources);
CREATE INDEX IF NOT EXISTS idx_task_sync_log_task ON task_sync_log(task_id, synced_at DESC);

-- RLS
ALTER TABLE unified_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY unified_tasks_user ON unified_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY unified_tasks_user_insert ON unified_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY unified_tasks_user_update ON unified_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY unified_tasks_user_delete ON unified_tasks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY unified_tasks_service ON unified_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY task_sync_log_service ON task_sync_log FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_unified_tasks_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER unified_tasks_updated_at
  BEFORE UPDATE ON unified_tasks
  FOR EACH ROW EXECUTE FUNCTION update_unified_tasks_updated_at();
