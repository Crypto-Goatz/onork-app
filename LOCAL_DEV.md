# LOCAL_DEV.md — Local-first Development Workflow

> Set up by Operation Reset Phase 0. **Always run risky migrations against the local replica first.** This file documents the workflow.

---

## What's installed and where

| Tool | Status | Location |
|------|--------|----------|
| Supabase CLI | ✅ v2.67.1 | `/opt/homebrew/bin/supabase` |
| pg_dump | ✅ v16.11 | `/opt/homebrew/bin/pg_dump` (symlinked from postgresql@16) |
| psql | ✅ v16.11 | `/opt/homebrew/bin/psql` |
| Docker | ❌ **Mike-side install needed** | `docker.com/products/docker-desktop` |
| Supabase config | ✅ initialized | `supabase/config.toml` |
| Linked project | ✅ `pwujhhmlrtxjmjzyttwn` (canonical) | |

**Blocker before this rig works end-to-end:** install Docker Desktop. `supabase start` needs it to boot a local Postgres container.

---

## One-time setup (after Docker installed)

```bash
# 1. Boot local Postgres + Supabase (port 54322 for DB, 54321 for API)
npm run db:start

# 2. Snapshot production into a SQL file
#    Requires the Postgres password from Supabase dashboard:
#    https://supabase.com/dashboard/project/pwujhhmlrtxjmjzyttwn/settings/database
PGPASSWORD='<your-postgres-password>' \
  pg_dump "postgres://postgres:[redacted]@db.pwujhhmlrtxjmjzyttwn.supabase.co:5432/postgres" \
  --no-owner --no-acl \
  > /tmp/production_snapshot_$(date +%s).sql

# 3. Restore that snapshot into local
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  < /tmp/production_snapshot_*.sql

# 4. Now `npm run dev:local` runs the app against the local DB
npm run dev:local
```

---

## Daily workflow

```bash
# Start the local DB once per day
npm run db:start

# Run app against local DB
npm run dev:local

# Test a migration locally before pushing to production
supabase migration new <name>
# (edit the .sql file)
supabase db reset --local        # re-applies all migrations against local
# verify app works
supabase db push                 # only NOW push to production canonical

# When done
npm run db:stop
```

---

## When to use local vs production

| Scenario | Use |
|----------|-----|
| Writing a new feature that adds a column | Local first, verify, push |
| Dropping ANY table | **MANDATORY** local-first via Phase 2 rename pattern |
| Consolidating two tables | **MANDATORY** local-first per Phase 3 |
| Reading existing data | Either is fine |
| Quick UI work that doesn't touch DB | Either is fine |

---

## Resetting the local DB to fresh production state

Anytime you want to re-snapshot production:

```bash
# Re-pull production snapshot
PGPASSWORD='<password>' pg_dump "<connection-string>" > /tmp/prod_snap.sql

# Wipe local + reload
supabase db reset --local
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" < /tmp/prod_snap.sql
```

This is non-destructive to production. Local is your sandbox.

---

## Rules (reinforce in CLAUDE.md)

1. **Never `DROP TABLE` directly against canonical.** Always rename to `_deprecated_<name>`, soak 48 hours, monitor Slack alert, then drop.
2. **Never `npm run dev` (which uses production envs) for migration work.** Use `npm run dev:local`.
3. **The local DB is ephemeral.** Don't store data there you can't lose. Re-snapshot anytime.
4. **The `/tmp/production_snapshot_*.sql` file is sensitive.** Don't commit it. `.gitignore` already excludes `/tmp/`.

---

## Troubleshooting

### `supabase start` errors with "docker not running"
Install Docker Desktop and start it. `supabase start` won't work without it.

### `pg_dump: connection refused`
Check the password in the Supabase dashboard. If it's been rotated, update your local copy.

### `psql: relation already exists`
You forgot to reset. Run `supabase db reset --local` and re-import.

### `npm run dev:local` returns blank pages
Local DB is empty (no production restore yet) OR the anon key didn't get pulled. Run `supabase status -o env` to see the local keys.
