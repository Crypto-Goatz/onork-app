-- 0nCore AI Agent Engine — Phase 1
-- Spec: docs/0ncore-ai-agent-architecture.md
--
-- Tables:
--   ai_agents         — per-location agent profile (Layer 2 K-Layer data)
--   ai_prompt_packs   — unlockable capability packs sold as add-ons
--   ai_conversations  — full chat history per location/channel
--   ai_action_log     — every action the AI executed
--
-- All action identifiers are snake_case (Critical Rule #2).
-- All RLS-locked to service_role; the API server is the only writer/reader.

-- ────────────────────────────────────────────────────────────────────────
-- ai_agents — Layer 2 (per-location) K-Layer data
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL UNIQUE,
  agent_name TEXT DEFAULT 'AI Assistant',
  base_prompt TEXT,                                -- last-resolved system prompt (cache; recomputed at chat time)
  brand_tone TEXT DEFAULT 'professional',
  brand_phrases JSONB DEFAULT '[]'::JSONB,
  brand_avoid JSONB DEFAULT '[]'::JSONB,
  services JSONB DEFAULT '[]'::JSONB,
  pricing JSONB DEFAULT '[]'::JSONB,
  faq JSONB DEFAULT '[]'::JSONB,
  competitors JSONB DEFAULT '[]'::JSONB,
  business_name TEXT,
  business_address TEXT,
  business_phone TEXT,
  business_website TEXT,
  business_hours TEXT,
  booking_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_location ON ai_agents(location_id);

-- ────────────────────────────────────────────────────────────────────────
-- ai_prompt_packs — unlockable capability packs per location
-- pack_id values: campaign_builder | content_generator | pipeline_coach
--                 | reputation_manager | report_generator
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_prompt_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,                          -- NULL = never expires
  UNIQUE(location_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_packs_active ON ai_prompt_packs(location_id, is_active);

-- ────────────────────────────────────────────────────────────────────────
-- ai_conversations — chat history (admin, widget, sms, email channels)
-- messages: [{ role: 'user'|'assistant'|'system', content: string, ts: iso8601 }]
-- actions_taken: [{ action_type, action_params, result, success }]
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  user_id TEXT,                                    -- CRM user id or contact id; NULL for anonymous admin
  channel TEXT DEFAULT 'admin',                    -- admin | widget | sms | email
  messages JSONB NOT NULL DEFAULT '[]'::JSONB,
  actions_taken JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_convos_location ON ai_conversations(location_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_convos_channel ON ai_conversations(location_id, channel, updated_at DESC);

-- ────────────────────────────────────────────────────────────────────────
-- ai_action_log — every concrete action the AI took
-- action_type is snake_case (e.g. 'create_tag', 'send_sms', 'deploy_campaign')
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  action_params JSONB,
  result JSONB,
  success BOOLEAN,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_location ON ai_action_log(location_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_actions_convo ON ai_action_log(conversation_id);

-- ────────────────────────────────────────────────────────────────────────
-- updated_at trigger for ai_agents and ai_conversations
-- ────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at_ai() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_agents_updated ON ai_agents;
CREATE TRIGGER trg_ai_agents_updated
  BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_ai();

DROP TRIGGER IF EXISTS trg_ai_convos_updated ON ai_conversations;
CREATE TRIGGER trg_ai_convos_updated
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_ai();

-- ────────────────────────────────────────────────────────────────────────
-- RLS — server-only access. The API server uses service_role; clients
-- never read these tables directly.
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE ai_agents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompt_packs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_action_log      ENABLE ROW LEVEL SECURITY;

-- Block all anon / authenticated direct access. service_role bypasses RLS.
DROP POLICY IF EXISTS "deny_all_ai_agents"       ON ai_agents;
DROP POLICY IF EXISTS "deny_all_ai_prompt_packs" ON ai_prompt_packs;
DROP POLICY IF EXISTS "deny_all_ai_conversations" ON ai_conversations;
DROP POLICY IF EXISTS "deny_all_ai_action_log"   ON ai_action_log;

CREATE POLICY "deny_all_ai_agents"        ON ai_agents       FOR ALL TO PUBLIC USING (false);
CREATE POLICY "deny_all_ai_prompt_packs"  ON ai_prompt_packs FOR ALL TO PUBLIC USING (false);
CREATE POLICY "deny_all_ai_conversations" ON ai_conversations FOR ALL TO PUBLIC USING (false);
CREATE POLICY "deny_all_ai_action_log"    ON ai_action_log   FOR ALL TO PUBLIC USING (false);

COMMENT ON TABLE ai_agents IS '0nCore AI Agent Engine — per-location agent profile (Layer 2 K-Layer data). Spec: docs/0ncore-ai-agent-architecture.md';
COMMENT ON TABLE ai_prompt_packs IS 'Unlockable capability packs per location. pack_id ∈ {campaign_builder, content_generator, pipeline_coach, reputation_manager, report_generator}.';
COMMENT ON TABLE ai_conversations IS 'Full chat history per location/channel. messages = [{role, content, ts}]; actions_taken summarizes side-effects.';
COMMENT ON TABLE ai_action_log IS 'Every concrete action the AI executed. action_type is snake_case per Critical Rule #2.';
