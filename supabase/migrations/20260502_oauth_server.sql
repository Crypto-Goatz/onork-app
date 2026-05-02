-- OAuth 2.1 server tables — issue tokens for MCP / external clients.
--
-- 0nCore is the AS (Authorization Server). MCP servers, IDEs, and
-- agent runtimes are RS / clients. This migration adds the three
-- tables every OAuth 2.1 server needs:
--
--   oauth_clients               registered clients (incl. DCR)
--   oauth_authorization_codes   short-lived (10 min) auth codes + PKCE
--   oauth_access_tokens         issued bearer tokens (opaque) + refresh
--
-- All tables are service-role only — no RLS read for end users. The
-- token endpoint uses service-role to read/write rows; resource servers
-- introspect via /api/oauth/introspect or /api/oauth/userinfo.

-- ─────────────────────────────────────────────────────────────────────
-- Clients
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_clients (
  client_id TEXT PRIMARY KEY,
  client_secret TEXT,
  client_name TEXT NOT NULL,
  client_uri TEXT,
  logo_uri TEXT,
  redirect_uris TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  grant_types TEXT[] NOT NULL DEFAULT ARRAY['authorization_code','refresh_token']::TEXT[],
  response_types TEXT[] NOT NULL DEFAULT ARRAY['code']::TEXT[],
  scope TEXT NOT NULL DEFAULT 'openid profile email',
  token_endpoint_auth_method TEXT NOT NULL DEFAULT 'none',
  application_type TEXT NOT NULL DEFAULT 'native',
  software_id TEXT,
  software_version TEXT,
  -- DCR / dynamic clients have no human owner; manually-created ones do
  registered_by UUID,
  registered_via TEXT NOT NULL DEFAULT 'dcr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN oauth_clients.token_endpoint_auth_method IS
  'one of: none, client_secret_basic, client_secret_post. Public MCP clients use none + PKCE.';
COMMENT ON COLUMN oauth_clients.registered_via IS
  'dcr | seed | manual';

ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oauth_clients_no_anon ON oauth_clients;
CREATE POLICY oauth_clients_no_anon ON oauth_clients
  FOR ALL TO authenticated, anon
  USING (FALSE) WITH CHECK (FALSE);

-- ─────────────────────────────────────────────────────────────────────
-- Authorization codes (10 minute TTL, one-shot)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  code TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  -- PKCE
  code_challenge TEXT,
  code_challenge_method TEXT,
  -- Bookkeeping
  state TEXT,
  nonce TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS oauth_codes_expiry_idx
  ON oauth_authorization_codes (expires_at) WHERE consumed_at IS NULL;

ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oauth_codes_no_anon ON oauth_authorization_codes;
CREATE POLICY oauth_codes_no_anon ON oauth_authorization_codes
  FOR ALL TO authenticated, anon
  USING (FALSE) WITH CHECK (FALSE);

-- ─────────────────────────────────────────────────────────────────────
-- Access + refresh tokens
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  token TEXT PRIMARY KEY,
  refresh_token TEXT UNIQUE,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  refresh_expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  -- A best-effort JWT mirror of the bearer claims. NULL for opaque-only.
  jwt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS oauth_tokens_user_idx
  ON oauth_access_tokens (user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS oauth_tokens_refresh_idx
  ON oauth_access_tokens (refresh_token) WHERE revoked_at IS NULL;

ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS oauth_tokens_no_anon ON oauth_access_tokens;
CREATE POLICY oauth_tokens_no_anon ON oauth_access_tokens
  FOR ALL TO authenticated, anon
  USING (FALSE) WITH CHECK (FALSE);

-- ─────────────────────────────────────────────────────────────────────
-- Sweep helper — drop expired codes nightly
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION oauth_cleanup_expired()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  n INTEGER;
BEGIN
  DELETE FROM oauth_authorization_codes
   WHERE expires_at < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS n = ROW_COUNT;

  DELETE FROM oauth_access_tokens
   WHERE expires_at < NOW() - INTERVAL '7 days'
     AND (refresh_expires_at IS NULL OR refresh_expires_at < NOW() - INTERVAL '7 days');
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION oauth_cleanup_expired() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION oauth_cleanup_expired() TO service_role;
