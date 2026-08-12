-- Course enrolments for CRM CONTACTS, which are not platform users.
--
-- public.enrollments already exists and is keyed on user_id uuid — a 0nCORE
-- account learning from the 0nCORE course library. The Course Builder enrols a
-- CRM CONTACT into a course inside a CLIENT'S location, identified by
-- (location_id, contact_id, course_id) with no platform account anywhere in it.
-- Overloading the existing table would have forced a fake user row per contact
-- and mixed two products' data in one place.
--
-- RLS ON IN THE SAME MIGRATION, with no permissive policy: every writer is a
-- server route holding the service role, which bypasses RLS. Anything reaching
-- this table with an anon key gets nothing. Tokens have leaked from this
-- database before by being left readable; a new table does not get to repeat it.

create table if not exists public.crm_course_enrollments (
  id                  uuid primary key default gen_random_uuid(),
  company_id          text        not null,
  location_id         text        not null,
  contact_id          text        not null,
  course_id           text        not null,
  status              text        not null default 'active',
  enrolled_at         timestamptz not null default now(),
  completed_at        timestamptz,
  -- Which modules are done. An array rather than a child table: completion is
  -- only ever read as a whole, and a join per workflow step is a cost with no
  -- reader to justify it.
  modules_completed   text[]      not null default '{}',
  -- Drives the stalled trigger. Bumped on every enrol and completion.
  last_activity_at    timestamptz not null default now(),
  -- Set when the stalled trigger fires, so a stalled student starts one
  -- automation rather than one per sweep.
  stalled_fired_at    timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint crm_course_enrollments_status_check
    check (status in ('active', 'completed'))
);

-- Re-enrolling the same contact in the same course must update, never
-- duplicate: a workflow can legitimately run its enrol step twice.
create unique index if not exists crm_course_enrollments_unique
  on public.crm_course_enrollments (location_id, contact_id, course_id);

-- The stalled sweep reads exactly this shape.
create index if not exists crm_course_enrollments_stalled_idx
  on public.crm_course_enrollments (status, last_activity_at)
  where status = 'active';

create index if not exists crm_course_enrollments_location_idx
  on public.crm_course_enrollments (location_id, course_id);

alter table public.crm_course_enrollments enable row level security;
