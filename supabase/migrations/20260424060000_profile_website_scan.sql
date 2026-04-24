-- Add website scan data to profiles for onboarding pre-population
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website_scan JSONB;
