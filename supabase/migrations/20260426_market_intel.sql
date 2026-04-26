-- Market Intelligence Pipeline
-- Aggregates freelance market data from public sources to surface skill trends, demand, and pricing.

-- ────────────────────────────────────────────────────────────
-- 1. Raw listings — every job/post we collect from public feeds
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,                -- upwork, reddit, hackernews, fiverr, freelancer
  external_id TEXT,                      -- platform-specific id for dedup
  skill TEXT,                            -- normalized primary skill
  category TEXT,                         -- broader bucket (development, design, writing, marketing, ai)
  title TEXT,
  description TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_type TEXT,                      -- fixed, hourly, unspecified
  currency TEXT DEFAULT 'USD',
  skills_tags TEXT[] DEFAULT '{}',
  location TEXT,
  client_country TEXT,
  listing_url TEXT,
  posted_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ DEFAULT now(),
  raw JSONB,                             -- full original payload
  UNIQUE (platform, external_id)
);

CREATE INDEX IF NOT EXISTS idx_market_listings_platform ON market_listings(platform);
CREATE INDEX IF NOT EXISTS idx_market_listings_skill ON market_listings(skill);
CREATE INDEX IF NOT EXISTS idx_market_listings_category ON market_listings(category);
CREATE INDEX IF NOT EXISTS idx_market_listings_posted_at ON market_listings(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_listings_collected_at ON market_listings(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_listings_skills_tags ON market_listings USING GIN(skills_tags);

-- ────────────────────────────────────────────────────────────
-- 2. Aggregated per-skill metrics — refreshed daily
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT UNIQUE NOT NULL,
  category TEXT,
  avg_budget NUMERIC,
  median_budget NUMERIC,
  budget_min NUMERIC,
  budget_max NUMERIC,
  listing_count_7d INTEGER DEFAULT 0,
  listing_count_30d INTEGER DEFAULT 0,
  listing_count_90d INTEGER DEFAULT 0,
  growth_pct NUMERIC,                    -- 7d vs prior 7d, percentage
  competition_level TEXT,                -- low, medium, high
  saturation_score INTEGER,              -- 0-100, higher = more saturated
  trend TEXT,                            -- hot, up, flat, down
  top_locations JSONB DEFAULT '[]'::jsonb,
  top_platforms JSONB DEFAULT '[]'::jsonb,
  related_skills JSONB DEFAULT '[]'::jsonb,
  last_listing_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_skills_category ON market_skills(category);
CREATE INDEX IF NOT EXISTS idx_market_skills_trend ON market_skills(trend);
CREATE INDEX IF NOT EXISTS idx_market_skills_listing_count_7d ON market_skills(listing_count_7d DESC);
CREATE INDEX IF NOT EXISTS idx_market_skills_avg_budget ON market_skills(avg_budget DESC);
CREATE INDEX IF NOT EXISTS idx_market_skills_growth_pct ON market_skills(growth_pct DESC);

-- ────────────────────────────────────────────────────────────
-- 3. Time series — one row per skill per day
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL,
  date DATE NOT NULL,
  listing_count INTEGER DEFAULT 0,
  avg_budget NUMERIC,
  median_budget NUMERIC,
  platforms JSONB DEFAULT '{}'::jsonb,   -- {upwork: 12, reddit: 5, ...}
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (skill, date)
);

CREATE INDEX IF NOT EXISTS idx_market_trends_skill ON market_trends(skill);
CREATE INDEX IF NOT EXISTS idx_market_trends_date ON market_trends(date DESC);
CREATE INDEX IF NOT EXISTS idx_market_trends_skill_date ON market_trends(skill, date DESC);

-- ────────────────────────────────────────────────────────────
-- 4. Weekly AI snapshots — Groq-generated market summaries
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE UNIQUE NOT NULL,
  summary TEXT,                          -- the markdown summary
  hot_skills JSONB DEFAULT '[]'::jsonb,
  declining_skills JSONB DEFAULT '[]'::jsonb,
  emerging_skills JSONB DEFAULT '[]'::jsonb,
  top_categories JSONB DEFAULT '[]'::jsonb,
  total_listings INTEGER DEFAULT 0,
  unique_skills INTEGER DEFAULT 0,
  insights JSONB DEFAULT '{}'::jsonb,
  generated_by TEXT DEFAULT 'groq:llama-3.3-70b-versatile',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_week_start ON market_snapshots(week_start DESC);

-- ────────────────────────────────────────────────────────────
-- RLS — read-only for authenticated users, service role writes
-- ────────────────────────────────────────────────────────────
ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_listings_read ON market_listings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY market_listings_service ON market_listings FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY market_skills_read ON market_skills FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY market_skills_service ON market_skills FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY market_trends_read ON market_trends FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY market_trends_service ON market_trends FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY market_snapshots_read ON market_snapshots FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY market_snapshots_service ON market_snapshots FOR ALL USING (true) WITH CHECK (true);
