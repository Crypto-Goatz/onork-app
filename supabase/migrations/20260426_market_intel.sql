-- 0n Market Intel — freelance market intelligence pipeline
-- Tracks listings across freelance platforms, aggregates skill-level stats,
-- generates AI summaries of weekly trends.

CREATE TABLE IF NOT EXISTS market_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,
  skill TEXT NOT NULL,
  category TEXT,
  title TEXT,
  description TEXT,
  budget_min DECIMAL,
  budget_max DECIMAL,
  fixed_price DECIMAL,
  currency TEXT DEFAULT 'USD',
  buyer_location TEXT,
  seller_location TEXT,
  proposals_count INTEGER,
  experience_level TEXT,
  duration TEXT,
  skills_tags TEXT[],
  listing_url TEXT,
  posted_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  raw_data JSONB
);

CREATE TABLE IF NOT EXISTS market_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL,
  category TEXT,
  avg_budget DECIMAL,
  avg_sold DECIMAL,
  listings_30d INTEGER DEFAULT 0,
  listings_7d INTEGER DEFAULT 0,
  growth_pct DECIMAL DEFAULT 0,
  prev_30d INTEGER DEFAULT 0,
  competition TEXT DEFAULT 'Medium',
  saturation_score INTEGER DEFAULT 50,
  top_buyer_location TEXT,
  top_seller_location TEXT,
  trend TEXT DEFAULT 'flat',
  platforms TEXT[],
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill)
);

CREATE TABLE IF NOT EXISTS market_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  listing_count INTEGER DEFAULT 0,
  avg_budget DECIMAL,
  avg_proposals INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(skill, period_start)
);

CREATE TABLE IF NOT EXISTS market_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_listings INTEGER,
  total_skills INTEGER,
  hot_skills TEXT[],
  rising_skills TEXT[],
  declining_skills TEXT[],
  top_opportunities JSONB,
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_listings_platform ON market_listings(platform, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_skill ON market_listings(skill);
CREATE INDEX IF NOT EXISTS idx_listings_url ON market_listings(listing_url);
CREATE INDEX IF NOT EXISTS idx_skills_trend ON market_skills(trend, growth_pct DESC);
CREATE INDEX IF NOT EXISTS idx_skills_sat ON market_skills(saturation_score);
