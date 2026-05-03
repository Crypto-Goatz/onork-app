-- Detect & Refine — per-domain click-grading system
--
-- Clients register a domain and receive a unique tracking script. The script
-- runs on their site, observes 30+ behavioral signals per session, calculates
-- a 0-100 score, assigns a letter grade (A+ → F, X = bot), and reports each
-- session back to /api/dr/events. Daily aggregates feed the admin dashboard.

-- Registered domains for D&R tracking
CREATE TABLE IF NOT EXISTS dr_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  site_id TEXT NOT NULL UNIQUE,
  script_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Click grade events received from the D&R script
CREATE TABLE IF NOT EXISTS dr_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  grade TEXT,
  score INTEGER,
  url TEXT,
  referrer TEXT,
  ad_platform TEXT,
  click_id TEXT,
  behavioral_signals JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily aggregates for dashboard
CREATE TABLE IF NOT EXISTS dr_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sessions INTEGER DEFAULT 0,
  grade_a INTEGER DEFAULT 0,
  grade_b INTEGER DEFAULT 0,
  grade_c INTEGER DEFAULT 0,
  grade_d INTEGER DEFAULT 0,
  grade_f INTEGER DEFAULT 0,
  grade_x INTEGER DEFAULT 0,
  avg_score DECIMAL(5,2),
  top_referrer TEXT,
  top_ad_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(site_id, date)
);

CREATE INDEX IF NOT EXISTS idx_dr_domains ON dr_domains(location_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dr_events ON dr_events(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_events_grade ON dr_events(site_id, grade, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dr_stats ON dr_daily_stats(site_id, date DESC);

-- Seed: Spa Ligonier (location F76MNKOMQCMruMrumtdf, domain spaligonier.com).
-- site_id and script_key are stable so the install snippet survives reseeds.
INSERT INTO dr_domains (location_id, domain, site_id, script_key, is_active)
VALUES (
  'F76MNKOMQCMruMrumtdf',
  'spaligonier.com',
  'dr_spa_ligonier_a1b2c3',
  'd92f4a7c8b1e6f3a5d2c9b8e7f4a1c6d',
  true
)
ON CONFLICT (site_id) DO NOTHING;
