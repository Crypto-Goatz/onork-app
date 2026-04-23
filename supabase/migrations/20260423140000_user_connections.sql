-- Unified OAuth Connections — stores per-user tokens for all providers
-- Replaces scattered google_tokens JSONB, enables multi-provider OAuth

CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,  -- google, facebook, github, x, linkedin
  provider_account_id TEXT,  -- provider's user/account ID
  provider_email TEXT,  -- email from provider profile
  provider_name TEXT,  -- display name from provider
  provider_avatar TEXT,  -- avatar URL from provider

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scopes TEXT,  -- space-separated scopes granted

  -- Provider-specific config (e.g. GA4 property ID, FB page ID)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Health tracking
  status TEXT DEFAULT 'active',  -- active, expired, revoked, error
  health_status TEXT DEFAULT 'healthy',  -- healthy, degraded, unhealthy
  last_used_at TIMESTAMPTZ,
  last_health_check TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  last_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One connection per provider per user
  UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_connections_user
  ON user_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_user_connections_provider
  ON user_connections(provider, status);

CREATE INDEX IF NOT EXISTS idx_user_connections_expiry
  ON user_connections(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Users can read their own connections
CREATE POLICY user_connections_select ON user_connections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own connections
CREATE POLICY user_connections_insert ON user_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own connections
CREATE POLICY user_connections_update ON user_connections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own connections
CREATE POLICY user_connections_delete ON user_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Service role bypass for API routes
CREATE POLICY user_connections_service ON user_connections
  FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_user_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_connections_updated_at
  BEFORE UPDATE ON user_connections
  FOR EACH ROW EXECUTE FUNCTION update_user_connections_updated_at();

-- Migrate existing google_tokens from profiles into user_connections
-- (Run once, then google_tokens column becomes legacy)
INSERT INTO user_connections (user_id, provider, access_token, refresh_token, expires_at, scopes, provider_email, metadata, status)
SELECT
  p.id,
  'google',
  p.google_tokens->>'access_token',
  p.google_tokens->>'refresh_token',
  CASE
    WHEN p.google_tokens->>'expiry_date' IS NOT NULL
    THEN to_timestamp((p.google_tokens->>'expiry_date')::bigint / 1000)
    ELSE NULL
  END,
  p.google_tokens->>'scope',
  p.google_tokens->>'email',
  '{}'::jsonb,
  'active'
FROM profiles p
WHERE p.google_tokens IS NOT NULL
  AND p.google_tokens->>'access_token' IS NOT NULL
ON CONFLICT (user_id, provider) DO NOTHING;
