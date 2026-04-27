-- LinkedIn Bot schema fix: align bot_queue / bot_config / bot_engagement / vpis_formula_weights
-- with the columns the application code actually reads and writes.
-- Idempotent — safe to re-run.

-- ── bot_queue: rename legacy columns + add per-factor scores and timing ──────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'bot_queue' AND column_name = 'type') THEN
    ALTER TABLE bot_queue RENAME COLUMN type TO content_type;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'bot_queue' AND column_name = 'content') THEN
    ALTER TABLE bot_queue RENAME COLUMN content TO content_text;
  END IF;
END $$;

ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS content_type     TEXT NOT NULL DEFAULT 'post';
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS content_text     TEXT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS hook_score        INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS emotion_score     INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS platform_score    INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS viral_score       INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS specificity_score INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS structure_score   INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS keywords_score    INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS cta_score         INT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS patterns_fired    TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS posted_at         TIMESTAMPTZ;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS rejected_at       TIMESTAMPTZ;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS rejection_reason  TEXT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS linkedin_post_id  TEXT;
ALTER TABLE bot_queue ADD COLUMN IF NOT EXISTS timing_status     TEXT;

CREATE INDEX IF NOT EXISTS bot_queue_posted_at_idx ON bot_queue(posted_at) WHERE posted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS bot_queue_content_type_idx ON bot_queue(content_type);

-- ── bot_config: add columns the dashboard / cron / register-account expect ───
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS max_posts_per_day     INT     NOT NULL DEFAULT 2;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS max_comments_per_day  INT     NOT NULL DEFAULT 12;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS target_keywords       TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS icp_description       TEXT;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS auto_post_enabled     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS auto_comment_enabled  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS emergency_pause       BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS posting_window_start  INT     NOT NULL DEFAULT 8;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS posting_window_end    INT     NOT NULL DEFAULT 18;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS product_mention_level TEXT    NOT NULL DEFAULT 'moderate';
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS value_prop            TEXT;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS brand_voice           TEXT;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS content_pillars       TEXT[]  NOT NULL DEFAULT '{}';
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS target_vpis_score     INT     NOT NULL DEFAULT 85;
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS tier                  TEXT    NOT NULL DEFAULT 'starter';
ALTER TABLE bot_config ADD COLUMN IF NOT EXISTS api_key               TEXT;

-- Sync legacy values where the new columns are still at default
UPDATE bot_config
   SET max_posts_per_day = max_posts_day
 WHERE max_posts_per_day = 2 AND max_posts_day IS NOT NULL AND max_posts_day <> 2;
UPDATE bot_config
   SET max_comments_per_day = max_comments_day
 WHERE max_comments_per_day = 12 AND max_comments_day IS NOT NULL AND max_comments_day <> 12;
UPDATE bot_config
   SET target_keywords = icp_keywords
 WHERE COALESCE(array_length(target_keywords, 1), 0) = 0
   AND COALESCE(array_length(icp_keywords, 1), 0) > 0;
UPDATE bot_config
   SET target_vpis_score = vpis_target
 WHERE target_vpis_score = 85 AND vpis_target IS NOT NULL AND vpis_target <> 85;

CREATE UNIQUE INDEX IF NOT EXISTS bot_config_api_key_idx ON bot_config(api_key) WHERE api_key IS NOT NULL;

-- ── bot_engagement: align with code that writes predicted/actual + reposts ───
ALTER TABLE bot_engagement ADD COLUMN IF NOT EXISTS queue_id                 UUID REFERENCES bot_queue(id) ON DELETE SET NULL;
ALTER TABLE bot_engagement ADD COLUMN IF NOT EXISTS predicted_score          INT;
ALTER TABLE bot_engagement ADD COLUMN IF NOT EXISTS actual_engagement_score  INT;
ALTER TABLE bot_engagement ADD COLUMN IF NOT EXISTS score_delta              INT;
ALTER TABLE bot_engagement ADD COLUMN IF NOT EXISTS reposts                  INT NOT NULL DEFAULT 0;
ALTER TABLE bot_engagement ADD COLUMN IF NOT EXISTS measured_at              TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill queue_id from legacy queue_item_id, reposts from legacy shares
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'bot_engagement' AND column_name = 'queue_item_id') THEN
    EXECUTE 'UPDATE bot_engagement SET queue_id = queue_item_id WHERE queue_id IS NULL AND queue_item_id IS NOT NULL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'bot_engagement' AND column_name = 'shares') THEN
    EXECUTE 'UPDATE bot_engagement SET reposts = shares WHERE reposts = 0 AND shares IS NOT NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS bot_engagement_queue_id_idx   ON bot_engagement(queue_id);
CREATE INDEX IF NOT EXISTS bot_engagement_measured_at_idx ON bot_engagement(measured_at DESC);

-- ── vpis_formula_weights: rename `active` → `is_active`, add MAE column ──────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'vpis_formula_weights' AND column_name = 'active')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'vpis_formula_weights' AND column_name = 'is_active') THEN
    ALTER TABLE vpis_formula_weights RENAME COLUMN active TO is_active;
  END IF;
END $$;

ALTER TABLE vpis_formula_weights ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vpis_formula_weights ADD COLUMN IF NOT EXISTS mean_absolute_error NUMERIC(6,3);

-- Refresh the partial index so the WHERE predicate references the new name
DROP INDEX IF EXISTS vpis_weights_active_idx;
CREATE INDEX IF NOT EXISTS vpis_weights_is_active_idx
  ON vpis_formula_weights(is_active) WHERE is_active = true;
