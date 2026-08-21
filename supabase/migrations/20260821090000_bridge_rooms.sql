-- ─────────────────────────────────────────────────────────────────────────
-- ROOMS PER AGENCY.
--
-- `bridge_messages.room` and `bridge_peers.room` have carried a room key since
-- the day they were created, and every query pinned it to the literal '0n'. The
-- storage was multi-tenant; the code was not. That is the difference between
-- internal tooling and a seat you can sell — an agency whose agents land in the
-- same room as everybody else's does not own anything.
--
-- WHY A TABLE AND NOT A DERIVED STRING. The obvious shortcut is to make the room
-- key the CRM company id and skip the table. It fails on the room that already
-- exists: '0n' holds a live transcript, three joined peers and a launchd sync
-- daemon that posts into it every five minutes. Deriving the key would have
-- silently moved Mike's agency to a new empty room and orphaned all of it. A
-- lookup lets the legacy slug KEEP its name while belonging to the agency it
-- always belonged to.
--
-- ONE ROOM PER AGENCY, ENFORCED IN THE DATABASE. Rooms are minted on demand the
-- first time an agency's key asks for one, and "on demand" means concurrently —
-- two agents joining at once would each find no room and each create one. The
-- partial unique index below is what makes that race a no-op instead of a split
-- brain, because the loser can re-read and find the winner's room.
-- ─────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bridge_rooms (
  id          BIGSERIAL PRIMARY KEY,
  -- The value written into bridge_messages.room / bridge_peers.room.
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT,
  -- The CRM agency (company) that owns this room. A 20-char platform string
  -- like 'bknfhTkdDLapbwfZqQNi' — never our own agency uuid.
  company_id  TEXT,
  -- A direct grant to one account, for rooms that predate any install or that
  -- exist for internal use. Independent of company_id: a room may have both.
  owner_user_id UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An agency gets exactly one room. Partial, because rooms granted only to a
-- user carry no company and must not collide with each other on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS bridge_rooms_company_key
  ON bridge_rooms (company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bridge_rooms_owner
  ON bridge_rooms (owner_user_id) WHERE owner_user_id IS NOT NULL;

-- RLS on, no policies: the routes read through the service client, and nothing
-- else has any business reading the roster of every agency's agents.
ALTER TABLE bridge_rooms ENABLE ROW LEVEL SECURITY;

-- ── the room that already exists ────────────────────────────────────────
-- Claimed for the agency it has always been, rather than recreated. Every
-- bridge_messages / bridge_peers row already carries room='0n', so this makes
-- the existing transcript resolve without moving a single row.
--
-- ANCHORED TO THE PEERS ACTUALLY IN IT, not to a pasted id. The account that
-- owns the room is the one whose agents are standing in it; its agency is that
-- account's active install. Written this way, the migration cannot seed a room
-- pointing at an agency that has nothing to do with the transcript — and on a
-- database where nobody has joined, it inserts nothing rather than guessing.
INSERT INTO bridge_rooms (slug, name, company_id, owner_user_id)
SELECT
  '0n',
  '0n',
  (SELECT i.company_id
     FROM crm_installations i
    WHERE i.user_id = p.user_id
      AND i.status = 'active'
      AND i.company_id IS NOT NULL
    ORDER BY i.updated_at DESC
    LIMIT 1),
  p.user_id
FROM (
  SELECT user_id
    FROM bridge_peers
   WHERE room = '0n' AND user_id IS NOT NULL
   ORDER BY joined_at ASC
   LIMIT 1
) p
ON CONFLICT (slug) DO NOTHING;
