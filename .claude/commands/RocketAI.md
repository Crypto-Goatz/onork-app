---
description: Business-wide sync across all RocketOpp repos — scans onork-app, marketing-repo, 0n-extension, 0n-command-center, checks Vercel + docs, reports product/marketing/sales/infra status
---

# /RocketAI — Business-wide Sync

Run a single sweep across every known RocketOpp repository and produce a
unified product / marketing / sales / infrastructure status report. The
goal: open a fresh laptop, run `/RocketAI`, and know what's running, what's
broken, and what needs attention across the whole business in under
two minutes.

## Repos to scan

Look for each in `~/Github/`. If a repo is missing on this machine, list it
in the final report under "Not on this machine — clone needed" rather than
failing.

| Repo | Role |
|---|---|
| `onork-app` | 0nCore customer portal (this repo when run from inside it) |
| `0n-extension` | Chrome extension (may be subfolder of onork-app or standalone) |
| `0n-command-center` | API command center / 545-tool surface |
| `0nMCP` | The orchestrator npm package |
| `0nmcp-website` | Marketing site (0nmcp.com) |
| `0n-marketplace` | SaaS platform (marketplace.rocketclients.com) |
| `0n-dispatch` | Canonical rules + ecosystem map |
| Any `marketing-repo` / `rocket-*` repos in `~/Github/` | Pick up on glob |

Run a `ls ~/Github/ | grep -Ei '^(0n|rocket|onork)'` to discover anything
not in the table above.

## Steps

### 1. Discover repos
- `ls ~/Github/` and pull the matching directory names.
- For each, confirm it's a git repo (`.git` exists) and capture the
  current branch.

### 2. Per-repo snapshot (run in parallel where possible)

For each repo:
- `git -C <repo> log --oneline -10`
- `git -C <repo> status --short`
- `git -C <repo> rev-parse --abbrev-ref HEAD`
- Read its `CLAUDE.md` if present (one-pass).
- Read its `README.md` first 40 lines if present.
- List top-level `docs/` if present.

### 3. Vercel deployments
- If `vercel` CLI is authenticated: `vercel ls --json 2>/dev/null` to
  enumerate projects under team `team_VtbfSzhDgB6OwglLfuPDFcd2`.
- Otherwise list the known mapping from memory:
  - `onork-app` → `prj_OJ0gi5HItdtUmQYclXirYk1BSJnt` → www.0ncore.com
  - `0nmcp-website` → `prj_Ccq53WXdb5CQd4iIBRR0qr4QToge` → 0nmcp.com
  - `0n-marketplace` → `prj_fWdT7RGwoK01RqhxNN6M7USSCIZj` → marketplace.rocketclients.com
- For each, attempt a HEAD request to the production URL and note
  HTTP status (best-effort — skip silently if curl unavailable).

### 4. Aggregate docs sweep
- Walk every repo's `docs/` and list every spec file with its repo prefix.
- Flag specs that look "fresh" (modified in last 14 days) vs "stale"
  (older than 90 days).

### 5. Cross-repo signal collection
- Grep for `TODO|FIXME|@todo` across all repos found, grouped by repo.
  Cap at top 20 per repo to keep the report readable.
- For each repo, note the last commit date — anything > 30 days idle is
  flagged.

## Report format

Produce four sections. Be specific — repo names, commit SHAs, URLs.

### 📦 Product status
For each repo: name → branch → last commit date + SHA + subject → "live URL"
if applicable → 1-line health note.

### 📣 Marketing status
- State of `0nmcp-website`, any `marketing-repo`, the 0n-extension Chrome
  Web Store listing (if findable in docs), and any campaign specs in
  `docs/` across repos.

### 💰 Sales / revenue surfaces
- `0n-marketplace` build status, Stripe wiring (per CLAUDE.md account
  `acct_1PUJi5HThmAuKVQM`), and any `crm_installations`-related work
  in flight.

### 🛠 Infrastructure
- Supabase projects in use (refs from CLAUDE.md): `pwujhhmlrtxjmjzyttwn`,
  `yaehbwimocvvnnlojkxe`, `rtwtaisjtvdajrdyivkn`, `segyiautmuytlzvbzpes`,
  `txfvhoakvwndfibjvixr`, `zyijmxmuzztcuxdtxrgv`, `wsuifaedzwyorhjqzlot`.
- Vercel project IDs and deploy status from step 3.
- Any pending Supabase migrations (uncommitted or unpushed) per repo.

End with a single line:
`Top 3 actions across the business: 1) … 2) … 3) …`

## Constraints

- **Read-only.** Do not modify files in any repo.
- Do not run `git fetch` or `git pull` — work with local state only.
- If a repo is missing, list it under "Not on this machine — clone needed".
- Cap total runtime to a few minutes; parallelize where you can with
  multiple Bash calls in one message.
- Honor the canonical rules from `onork-app/CLAUDE.md` — never mention
  "GHL"; always say "CRM" or "ROCKET".
