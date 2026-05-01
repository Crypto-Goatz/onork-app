---
description: Full project sync for onork-app — reads CLAUDE.md, scans specs, checks git, finds TODOs, lists routes, reports built vs pending vs broken
---

# /0nAI — Project Sync

Run a full project sync on `onork-app`. The goal is a single status report
the user can read on a fresh machine to know exactly where this project
stands.

## Steps (run in order — do not skip)

### 1. Reload context
- Read `CLAUDE.md` at the repo root in full. Re-anchor on the rules,
  architecture, and key systems.

### 2. Scan specs
- List every file in `docs/` (one level deep + nested if any).
- For each, read the first ~30 lines and produce a one-line summary
  (what surface it covers + its status if stated).

### 3. Check git
Run in parallel:
- `git rev-parse --abbrev-ref HEAD` — current branch.
- `git log --oneline -20` — recent commits.
- `git status` — working-tree state.
- `git log origin/main..HEAD --oneline` — unpushed commits (if remote set).

### 4. Find TODOs
- Grep for `TODO|FIXME|XXX|@todo|@fixme` across `app/`, `lib/`,
  `0n-extension/`, `components/`, `scripts/`.
- Group by file. Note the line so the user can jump.
- Use ripgrep: `rg -n "TODO|FIXME|XXX|@todo|@fixme" app lib 0n-extension components scripts 2>/dev/null`.

### 5. List API routes
- Enumerate `app/api/**/route.ts` (and `route.tsx`).
- Group by top-level area: `dispatch`, `brain`, `exec`, `vpis`, `crm`,
  `auth`, `apps`, etc.
- For each group, count routes and list the verbs (GET/POST/PUT/DELETE)
  by reading the export names (`export async function GET`, etc.).

### 6. Check migrations
- List `supabase/migrations/*.sql` with timestamps.
- Cross-reference against `git log --oneline -- supabase/migrations/` to
  flag migrations that are committed locally but possibly not pushed.

### 7. Read the brain registry
- Open `lib/brain/registry.ts` and list every registered AI surface.
- Run `node scripts/truth-lint.mjs` if it exists; report pass/fail.

### 8. Report

Produce three clear buckets at the end. Be concrete — file paths, route
names, commit SHAs.

**🟢 Built & live**
- Features with code, routes, and recent commits in the last 30 days.
- Each line: `<feature>` — `<entry path>` — last touched `<short SHA>`.

**🟡 Pending**
- Specs in `docs/` with no matching implementation directory or route.
- Each line: `<spec file>` — `<what's missing>`.

**🔴 Broken / known issues**
- The OAuth `refresh_token` gap in
  `app/api/crm/oauth/callback/route.ts` (always include unless verified
  fixed during this run).
- All TODO/FIXME hits from step 4.
- Any truth-lint failures from step 7.
- Anything in `git status` that looks like an abandoned change.

## Output format

Keep the report tight. Use the three-bucket structure above. End with one
line: `Next obvious move: <single concrete suggestion>` based on what
you found.

Do not modify files. This is a read-only sync.
