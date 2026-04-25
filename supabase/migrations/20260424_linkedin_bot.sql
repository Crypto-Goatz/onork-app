-- LinkedIn Bot: bot_config, bot_queue, bot_engagement, bot_targets, vpis_formula_weights, vpis_patterns

-- ── bot_config ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id     TEXT,
  name            TEXT NOT NULL DEFAULT 'My LinkedIn Bot',
  active          BOOLEAN NOT NULL DEFAULT false,
  linkedin_account_id TEXT,
  post_frequency  TEXT NOT NULL DEFAULT 'daily',   -- daily | weekdays | custom
  post_time_hour  INT NOT NULL DEFAULT 8,           -- 0-23 EST
  max_posts_day   INT NOT NULL DEFAULT 2,
  max_comments_day INT NOT NULL DEFAULT 12,
  icp_keywords    TEXT[] NOT NULL DEFAULT '{}',
  icp_titles      TEXT[] NOT NULL DEFAULT '{}',
  icp_industries  TEXT[] NOT NULL DEFAULT '{}',
  tone            TEXT NOT NULL DEFAULT 'thought_leader', -- thought_leader | builder | storyteller
  niche           TEXT,
  auto_approve    BOOLEAN NOT NULL DEFAULT false,
  slack_notify    BOOLEAN NOT NULL DEFAULT true,
  vpis_target     INT NOT NULL DEFAULT 85,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_config_user_id_idx ON bot_config(user_id);
CREATE INDEX IF NOT EXISTS bot_config_active_idx ON bot_config(active) WHERE active = true;

-- ── bot_queue ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_config_id   UUID NOT NULL REFERENCES bot_config(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'post',     -- post | comment
  content         TEXT NOT NULL,
  vpis_score      INT,
  vpis_breakdown  JSONB,
  hook_archetype  TEXT,
  rewrite_count   INT NOT NULL DEFAULT 0,
  target_post_url TEXT,                             -- for comments
  target_post_id  TEXT,                             -- for comments
  status          TEXT NOT NULL DEFAULT 'pending_approval', -- pending_approval | approved | scheduled | published | rejected | failed
  crm_post_id     TEXT,
  scheduled_at    TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  error_msg       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_queue_bot_config_id_idx ON bot_queue(bot_config_id);
CREATE INDEX IF NOT EXISTS bot_queue_user_id_status_idx ON bot_queue(user_id, status);
CREATE INDEX IF NOT EXISTS bot_queue_status_idx ON bot_queue(status);
CREATE INDEX IF NOT EXISTS bot_queue_scheduled_at_idx ON bot_queue(scheduled_at) WHERE status = 'scheduled';

-- ── bot_engagement ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_engagement (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_config_id   UUID NOT NULL REFERENCES bot_config(id) ON DELETE CASCADE,
  queue_item_id   UUID REFERENCES bot_queue(id) ON DELETE SET NULL,
  post_id         TEXT,
  impressions     INT NOT NULL DEFAULT 0,
  likes           INT NOT NULL DEFAULT 0,
  comments        INT NOT NULL DEFAULT 0,
  shares          INT NOT NULL DEFAULT 0,
  clicks          INT NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  vpis_score_at_post INT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_engagement_bot_config_id_idx ON bot_engagement(bot_config_id);
CREATE INDEX IF NOT EXISTS bot_engagement_recorded_at_idx ON bot_engagement(recorded_at DESC);

-- ── bot_targets ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bot_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_config_id   UUID NOT NULL REFERENCES bot_config(id) ON DELETE CASCADE,
  linkedin_url    TEXT NOT NULL,
  name            TEXT,
  title           TEXT,
  company         TEXT,
  icp_match_score INT,
  status          TEXT NOT NULL DEFAULT 'active',  -- active | commented | converted | ignored
  last_engaged_at TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_targets_bot_config_id_idx ON bot_targets(bot_config_id);
CREATE INDEX IF NOT EXISTS bot_targets_status_idx ON bot_targets(status);

-- ── vpis_formula_weights ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vpis_formula_weights (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_config_id   UUID REFERENCES bot_config(id) ON DELETE CASCADE,  -- NULL = global defaults
  version         INT NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT true,
  hook_weight     NUMERIC(5,4) NOT NULL DEFAULT 0.25,
  emotion_weight  NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  platform_weight NUMERIC(5,4) NOT NULL DEFAULT 0.12,
  viral_weight    NUMERIC(5,4) NOT NULL DEFAULT 0.13,
  specificity_weight NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  structure_weight NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  keywords_weight NUMERIC(5,4) NOT NULL DEFAULT 0.10,
  cta_weight      NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  gradient_step   NUMERIC(6,5) NOT NULL DEFAULT 0.01,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT weights_sum CHECK (
    ROUND(hook_weight + emotion_weight + platform_weight + viral_weight +
          specificity_weight + structure_weight + keywords_weight + cta_weight, 2) = 1.00
  )
);

CREATE INDEX IF NOT EXISTS vpis_weights_bot_config_id_idx ON vpis_formula_weights(bot_config_id);
CREATE INDEX IF NOT EXISTS vpis_weights_active_idx ON vpis_formula_weights(active) WHERE active = true;

-- Global baseline weights (bot_config_id = NULL)
INSERT INTO vpis_formula_weights (
  bot_config_id, version, active,
  hook_weight, emotion_weight, platform_weight, viral_weight,
  specificity_weight, structure_weight, keywords_weight, cta_weight
) VALUES (
  NULL, 1, true,
  0.25, 0.10, 0.12, 0.13,
  0.10, 0.15, 0.10, 0.05
) ON CONFLICT DO NOTHING;

-- ── vpis_patterns ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vpis_patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL,   -- hook | structure | viral | penalty
  regex_pattern   TEXT NOT NULL,
  score_delta     INT NOT NULL,    -- positive = bonus, negative = penalty
  description     TEXT,
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vpis_patterns_category_idx ON vpis_patterns(category);
CREATE INDEX IF NOT EXISTS vpis_patterns_active_idx ON vpis_patterns(active) WHERE active = true;

-- Baseline patterns
INSERT INTO vpis_patterns (name, category, regex_pattern, score_delta, description) VALUES
  -- Hook patterns (positive)
  ('absolute_declaration',  'hook', '^\s*[A-Z][^.!?]*\.$',                                     8,  'Bold declarative opening sentence'),
  ('number_hook',           'hook', '^\s*\d+[\.\)]\s',                                          7,  'Numbered list hook'),
  ('question_hook',         'hook', '^\s*[A-Z][^?]*\?',                                        6,  'Question-based hook'),
  ('confession_hook',       'hook', '(?i)^\s*(i used to|i wasted|i spent|i made a mistake)',   8,  'Confession/personal failure hook'),
  ('bait_flip',             'hook', '(?i)(but here''s the thing|but the truth is|until i)',     7,  'Bait and flip pattern'),
  -- Structure patterns (positive)
  ('short_paragraphs',      'structure', '^.{1,120}$',                                          5,  'Short punchy paragraphs'),
  ('whitespace_breaks',     'structure', '\n\n',                                                 4,  'Intentional whitespace for readability'),
  ('bullet_list',           'structure', '^\s*[•▪▸\-\*]\s',                                    3,  'Bullet list structure'),
  -- Viral patterns (positive)
  ('social_proof',          'viral', '(?i)(clients?|customers?|users?|companies|brands?)\s+(we|I|we''ve|i''ve)\s+(helped|worked|scaled)', 6, 'Social proof language'),
  ('specific_number',       'viral', '\b\d{1,3}(,\d{3})*(\.\d+)?(%|x|\s*leads?|\s*clients?|\s*ARR|\s*MRR|\s*k|\s*dollars?)\b', 8, 'Specific metric/number'),
  ('timeframe',             'viral', '(?i)(in \d+ (days?|weeks?|months?|hours?))',               5,  'Specific timeframe claim'),
  -- CTA patterns (positive)
  ('soft_cta',              'cta',  '(?i)(what do you think|drop a comment|let me know|agree\?|thoughts\?)', 6, 'Soft engagement CTA'),
  ('question_cta',          'cta',  '\?\s*$',                                                   4,  'Ends with question'),
  -- Penalty patterns (negative)
  ('emoji_overload',        'penalty', '(\p{Emoji}){5,}',                                       -8, 'Too many emojis'),
  ('hashtag_spam',          'penalty', '(#\w+\s*){6,}',                                        -6, 'Hashtag spam (6+ tags)'),
  ('corporate_speak',       'penalty', '(?i)(synergy|leverage|paradigm|utilize|holistic solution)', -5, 'Corporate buzzword language'),
  ('wall_of_text',          'penalty', '.{500,}',                                               -7, 'Single paragraph wall of text'),
  ('weak_opener',           'penalty', '(?i)^(i am|we are|today i|in this post)',               -6, 'Weak generic opener')
ON CONFLICT (name) DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE bot_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_queue         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_engagement    ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_targets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpis_formula_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE vpis_patterns     ENABLE ROW LEVEL SECURITY;

-- bot_config
CREATE POLICY "Users own their bot configs"
  ON bot_config FOR ALL USING (auth.uid() = user_id);

-- bot_queue
CREATE POLICY "Users own their bot queue"
  ON bot_queue FOR ALL USING (auth.uid() = user_id);

-- bot_engagement
CREATE POLICY "Users view their engagement"
  ON bot_engagement FOR SELECT
  USING (bot_config_id IN (SELECT id FROM bot_config WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages engagement"
  ON bot_engagement FOR ALL
  USING (auth.role() = 'service_role');

-- bot_targets
CREATE POLICY "Users own their targets"
  ON bot_targets FOR ALL
  USING (bot_config_id IN (SELECT id FROM bot_config WHERE user_id = auth.uid()));

-- vpis_formula_weights: users can read global + their own
CREATE POLICY "Users read global and own weights"
  ON vpis_formula_weights FOR SELECT
  USING (
    bot_config_id IS NULL OR
    bot_config_id IN (SELECT id FROM bot_config WHERE user_id = auth.uid())
  );

CREATE POLICY "Service role manages weights"
  ON vpis_formula_weights FOR ALL
  USING (auth.role() = 'service_role');

-- vpis_patterns: public read, service role write
CREATE POLICY "Anyone reads patterns"
  ON vpis_patterns FOR SELECT USING (true);

CREATE POLICY "Service role manages patterns"
  ON vpis_patterns FOR ALL
  USING (auth.role() = 'service_role');

-- ── updated_at triggers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER bot_config_updated_at        BEFORE UPDATE ON bot_config        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bot_queue_updated_at         BEFORE UPDATE ON bot_queue         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER vpis_weights_updated_at      BEFORE UPDATE ON vpis_formula_weights FOR EACH ROW EXECUTE FUNCTION update_updated_at();
