-- The one free account, chosen once.
--
-- Every agency signs up by handing over their AGENCY pit, which lets us list
-- their sub-accounts and nothing more. Verified in production 2026-08-11: an
-- agency PIT returns 401 "not authorized for this scope" on /contacts and on
-- the courses importer. So the client list is free; ACTING inside a client
-- needs a credential scoped to that client.
--
-- Hence the flow: list their sub-accounts, let them pick ONE as the free
-- account, then collect that sub-account's PIT. Everything downstream — the
-- command bar, the course builder, tagging, email — resolves through that
-- credential, which is why a half-finished onboarding shows up as "works until
-- it touches a client" rather than as an obvious error.
--
-- WHY THE CHOICE LOCKS. The free slot is worth $5/month. If an agency could
-- move it freely they would move it to whichever client is currently billable,
-- and the included account stops meaning anything. Changing it is a support
-- action on purpose.

alter table public.agency_connections
  add column if not exists free_locked_at  timestamptz,
  add column if not exists free_location_id text,
  add column if not exists onboarding_step  text not null default 'agency';

comment on column public.agency_connections.free_locked_at is
  'When the one free account was chosen. Once set the choice is final — changing it is a support action, deliberately, so an agency cannot rotate the free slot to dodge billing.';
comment on column public.agency_connections.free_location_id is
  'The sub-account chosen as free. Also the DEFAULT client for every command unless one is named.';
comment on column public.agency_connections.onboarding_step is
  'agency -> pick_free -> need_pit -> done. Drives the alert shown at sign-in.';
