-- Market Intelligence — User Profiles & AI Matches
-- Adds linked freelance profile records and AI-generated opportunity matches.

-- ────────────────────────────────────────────────────────────
-- 1. User market profiles — linked freelance accounts
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  display_name TEXT,
  headline TEXT,
  skills TEXT[] DEFAULT '{}',
  experience_years INTEGER,
  hourly_rate DECIMAL,
  total_earnings DECIMAL,
  completed_jobs INTEGER,
  rating DECIMAL,
  location TEXT,
  bio TEXT,
  raw_data JSONB,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_market_profiles_user ON market_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_market_profiles_platform ON market_profiles(platform);

-- ────────────────────────────────────────────────────────────
-- 2. AI-generated opportunity matches
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('opportunity', 'trending', 'build_suggestion', 'skill_gap')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Scoring (0-100)
  relevance_score INTEGER DEFAULT 0,
  demand_score INTEGER DEFAULT 0,
  competition_score INTEGER DEFAULT 0,
  profit_potential INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,

  -- Context
  related_skills TEXT[] DEFAULT '{}',
  related_listings JSONB DEFAULT '[]'::jsonb,
  suggested_price_range JSONB,
  suggested_action TEXT,

  -- For build suggestions
  app_idea TEXT,
  tech_stack TEXT[] DEFAULT '{}',
  estimated_build_time TEXT,
  potential_revenue TEXT,
  workflow_steps JSONB,

  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'saved', 'dismissed', 'acted_on')),

  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_market_matches_user ON market_matches(user_id, status, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_market_matches_type ON market_matches(match_type, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_market_matches_expires ON market_matches(expires_at);

-- ────────────────────────────────────────────────────────────
-- RLS — users see their own profiles & matches; service role bypasses
-- ────────────────────────────────────────────────────────────
ALTER TABLE market_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY market_profiles_owner ON market_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY market_profiles_service ON market_profiles
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY market_matches_owner ON market_matches
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY market_matches_service ON market_matches
  FOR ALL USING (true) WITH CHECK (true);
