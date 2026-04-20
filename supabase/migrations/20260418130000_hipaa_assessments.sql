-- HIPAA 2026 Readiness Assessment scanner table
-- PRIVATE add-on: RocketOpp sub-location only (6MSqx0trfxgLxeHBJE1k)

CREATE TABLE IF NOT EXISTS hipaa_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_email TEXT,
  public_url TEXT NOT NULL,
  dashboard_url TEXT NOT NULL,
  entity_type TEXT,
  employee_count TEXT,
  primary_state TEXT,
  current_rule_score INTEGER,
  nprm_2026_score INTEGER,
  current_grade TEXT,
  nprm_grade TEXT,
  results JSONB NOT NULL,
  remediation JSONB DEFAULT '[]',
  crm_contact_id TEXT,
  location_id TEXT DEFAULT '6MSqx0trfxgLxeHBJE1k',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_assessments_location_date ON hipaa_assessments(location_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_assessments_email ON hipaa_assessments(contact_email);

-- RLS: service role can do everything, anon can read own assessments
ALTER TABLE hipaa_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON hipaa_assessments
  FOR ALL USING (true) WITH CHECK (true);
