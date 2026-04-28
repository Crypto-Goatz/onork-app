-- Jaxx Operator Layer 1 — security-first scaffold
-- Tables: conversation_ai_config, conversation_ai_logs, jaxx_rate_limits,
--         jaxx_iky_challenges, jaxx_training_pairs
-- All RLS-locked to service_role; Jaxx server is the only writer/reader.

-- ────────────────────────────────────────────────────────────────────────
-- conversation_ai_config — per-location settings
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_ai_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL UNIQUE,
  user_id UUID,                                    -- 0nCore owner of this location
  enabled BOOLEAN DEFAULT true,
  -- Action surface — DEFAULT IS KNOWLEDGE-ONLY. Automation execution is opt-in per category.
  allowed_actions TEXT[] DEFAULT ARRAY['knowledge']::TEXT[],
  -- Granular automation toggles (only honored if 'automation' is in allowed_actions)
  automation_can_generate BOOLEAN DEFAULT false,
  automation_can_test BOOLEAN DEFAULT false,
  automation_can_activate BOOLEAN DEFAULT false,
  automation_can_run BOOLEAN DEFAULT false,
  -- Behavior
  auto_execute BOOLEAN DEFAULT false,              -- if false, every mutation requires user 'yes'
  response_delay_seconds INTEGER DEFAULT 2,
  business_hours_only BOOLEAN DEFAULT false,
  business_hours_start TIME DEFAULT '08:00',
  business_hours_end TIME DEFAULT '20:00',
  business_hours_tz TEXT DEFAULT 'America/New_York',
  excluded_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_actions_per_conversation INTEGER DEFAULT 10,
  -- Custom override
  system_prompt_override TEXT,
  -- Limits
  daily_message_cap INTEGER DEFAULT 500,           -- per-location
  per_contact_hourly_cap INTEGER DEFAULT 30,       -- per-contact-per-location
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_ai_config_user ON conversation_ai_config(user_id);

-- ────────────────────────────────────────────────────────────────────────
-- conversation_ai_logs — every Jaxx interaction
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identity
  location_id TEXT NOT NULL,
  conversation_id TEXT,                            -- CRM conversation id (or 'dashboard:<userId>')
  contact_id TEXT,                                 -- CRM contact (the subject — who Jaxx is talking to)
  actor_user_id UUID,                              -- 0nCore user (the actor — whose perms are used)
  surface TEXT NOT NULL,                           -- 'crm_inbound' | 'dashboard_widget' | 'slack' | 'chrome' | 'test'
  -- Trust + IKY
  source_ip TEXT,
  user_agent TEXT,
  trust_score INTEGER DEFAULT 50,
  iky_triggered BOOLEAN DEFAULT false,
  iky_challenge_id UUID,
  iky_outcome TEXT,                                -- 'unlocked' | 'failed' | 'pending'
  -- Content
  inbound_message TEXT,
  ai_response TEXT,
  ai_response_redacted TEXT,                       -- post-scrubber output (what was actually sent)
  disclosure_violations JSONB DEFAULT '[]'::JSONB, -- array of {pattern, masked_term}
  -- Tool calls (the only execution surface in L1 = automation)
  tool_calls JSONB DEFAULT '[]'::JSONB,
  tool_results JSONB DEFAULT '[]'::JSONB,
  required_confirmation BOOLEAN DEFAULT false,
  confirmation_received BOOLEAN DEFAULT false,
  -- Model
  model TEXT DEFAULT 'llama-3.3-70b-versatile',
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  -- Outcome
  status TEXT DEFAULT 'ok',                        -- 'ok' | 'rate_limited' | 'iky_locked' | 'disclosure_blocked' | 'error'
  error TEXT,
  responded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conv_ai_logs_location ON conversation_ai_logs(location_id, responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_ai_logs_conversation ON conversation_ai_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_ai_logs_actor ON conversation_ai_logs(actor_user_id, responded_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_ai_logs_iky ON conversation_ai_logs(location_id, iky_triggered) WHERE iky_triggered = true;

-- ────────────────────────────────────────────────────────────────────────
-- jaxx_rate_limits — per-location daily, per-contact hourly counters
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jaxx_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  contact_id TEXT,                                 -- nullable (when null = location-level row)
  bucket TEXT NOT NULL,                            -- 'location_daily' | 'contact_hourly'
  bucket_key TEXT NOT NULL,                        -- e.g. '2026-04-27' or '2026-04-27T15'
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(location_id, contact_id, bucket, bucket_key)
);

CREATE INDEX IF NOT EXISTS idx_jaxx_rate_limits_lookup ON jaxx_rate_limits(location_id, bucket, bucket_key);

-- ────────────────────────────────────────────────────────────────────────
-- jaxx_iky_challenges — pending identity challenges
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jaxx_iky_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  user_id UUID,                                    -- the user being challenged (the actor)
  challenge_type TEXT NOT NULL,                    -- 'active_automation' | 'recent_service' | 'last_login' | 'task_on_list'
  expected_answer_hash TEXT NOT NULL,              -- sha256 of normalized expected
  expected_answer_hint TEXT,                       -- for fuzzy match comparisons (sanitized stored form)
  question TEXT NOT NULL,                          -- the human-readable question Jaxx asked
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  status TEXT DEFAULT 'pending',                   -- 'pending' | 'passed' | 'failed' | 'expired'
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_jaxx_iky_active ON jaxx_iky_challenges(conversation_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jaxx_iky_user ON jaxx_iky_challenges(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────────────────
-- jaxx_training_pairs — self-learning capture
-- ────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jaxx_training_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES conversation_ai_logs(id) ON DELETE CASCADE,
  surface TEXT,                                    -- inherits from log
  input TEXT NOT NULL,                             -- redacted user message
  context_snapshot JSONB,                          -- redacted context blob (no secrets, no internal names)
  response TEXT NOT NULL,                          -- redacted Jaxx reply
  tool_calls JSONB DEFAULT '[]'::JSONB,
  -- Outcome signals
  tool_succeeded BOOLEAN,
  user_thanked BOOLEAN,                            -- detected via follow-up sentiment
  user_corrected BOOLEAN,                          -- "no, that's wrong" / "actually..."
  conversation_continued_smoothly BOOLEAN,
  iky_triggered_after BOOLEAN,                     -- penalty: response made user suspicious
  disclosure_violation BOOLEAN DEFAULT false,
  -- Quality
  quality_score NUMERIC(4,3) DEFAULT 0.500,        -- 0.000 - 1.000
  source TEXT DEFAULT 'live',                      -- 'live' | 'curated' | 'rejected'
  model_used TEXT,
  promoted_at TIMESTAMPTZ,                         -- when (if) promoted to curated
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jaxx_training_quality ON jaxx_training_pairs(source, quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_jaxx_training_curated ON jaxx_training_pairs(source) WHERE source = 'curated';

-- ────────────────────────────────────────────────────────────────────────
-- RLS — service_role only
-- ────────────────────────────────────────────────────────────────────────
ALTER TABLE conversation_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jaxx_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE jaxx_iky_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE jaxx_training_pairs ENABLE ROW LEVEL SECURITY;

-- Owners can read their own config; nothing else readable from client.
CREATE POLICY "owners_read_own_config" ON conversation_ai_config
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "owners_update_own_config" ON conversation_ai_config
  FOR UPDATE USING (auth.uid() = user_id);

-- Logs: owner can read their own location's logs (read-only from client)
CREATE POLICY "owners_read_own_logs" ON conversation_ai_logs
  FOR SELECT USING (
    actor_user_id = auth.uid()
    OR location_id IN (
      SELECT crm_location_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Rate limits, IKY challenges, training pairs: service_role only (no client policies)

COMMENT ON TABLE conversation_ai_config IS 'Jaxx Operator per-location settings. allowed_actions defaults to knowledge-only.';
COMMENT ON TABLE conversation_ai_logs IS 'Every Jaxx interaction logged here. Includes trust score, IKY outcome, disclosure violations.';
COMMENT ON TABLE jaxx_iky_challenges IS 'Active identity challenges. 5-minute TTL. 3 wrong = lock + alert.';
COMMENT ON TABLE jaxx_training_pairs IS 'Self-learning corpus. quality_score >= 0.8 promoted to curated for Ollama fine-tune.';

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
