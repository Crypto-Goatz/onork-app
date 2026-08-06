-- Generated prospect sites — a real page built for a real business, before
-- they have asked for one.
--
-- WHY THE HTML IS STORED RATHER THAN RE-RENDERED ON REQUEST. What we send in an
-- outreach message has to be exactly what we send them tomorrow. Re-rendering
-- per view means the model can rewrite the page between the message going out
-- and them clicking it — the prospect sees something the sender never saw, and
-- the sender cannot answer for it. Render once, store the bytes, serve those.
--
-- `slug` is the public identity and is unguessable on purpose: these pages name
-- a real business that never asked us to build one. They should be reachable by
-- the person we sent the link to and nobody enumerating URLs.

create table if not exists public.prospect_sites (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,

  -- who it was built for
  business      text not null,
  contact_name  text,
  linkedin_url  text,
  industry      text,

  -- what was served
  html          text not null,
  spec          jsonb,

  -- provenance
  created_by    text,
  source        text not null default 'linkedin',
  location_id   text,

  -- did it work
  views         integer not null default 0,
  first_viewed  timestamptz,
  last_viewed   timestamptz,

  created_at    timestamptz not null default now(),
  -- Expiry is a courtesy AND a liability limit: a page about someone else's
  -- business should not sit on our infrastructure indefinitely.
  expires_at    timestamptz not null default (now() + interval '90 days')
);

create index if not exists prospect_sites_slug_idx on public.prospect_sites (slug);
create index if not exists prospect_sites_created_idx on public.prospect_sites (created_at desc);

-- RLS ON, in the same migration that creates the table. A table shipped without
-- it is readable with the public anon key, and this one holds LinkedIn URLs and
-- names of people who never opted in. That has already happened once here.
alter table public.prospect_sites enable row level security;

-- No policies for anon or authenticated: every read and write goes through the
-- service role in a route we control. The public page reads by slug server-side.
create policy "service role manages prospect sites"
  on public.prospect_sites
  for all
  to service_role
  using (true)
  with check (true);
