-- Universal 0n_live_ access token on profiles.
-- One row per user; the raw token IS the credential every platform pastes
-- (MCP, Chrome extension, Slack, WordPress, API).
--
-- Format: 0n_live_{user_id_hash}_{random}_{checksum}  (lib/0n-token.ts)
-- Verification: format checksum + DB lookup + user_hash cross-check.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_token             TEXT,
  ADD COLUMN IF NOT EXISTS access_token_rotated_at  TIMESTAMPTZ;

-- Unique when set; allow many NULLs (users without an issued token yet).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_access_token_unique
  ON profiles (access_token)
  WHERE access_token IS NOT NULL;
