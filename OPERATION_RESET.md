# OPERATION RESET — The Master Plan

> **Authored:** 2026-04-30
> **Owner:** Mike @ RocketOpp LLC
> **Tracker:** This file. Updated after every phase. If a phase lands on `main`, this file is updated in the same PR.

The 0n ecosystem is structurally messy: split databases, contradictory specs, redundant Vercel projects, abandoned repos, dead tables, and conflicting AI provider rules across docs. Operation Reset fixes that in a defined, ordered, auditable way — and stops it from happening again.

This is the **single source of truth** for "what are we doing next, and why." `STACK_AUDIT.md` is the inventory. This file is the plan.

---

## TL;DR — what Operation Reset achieves

1. **One database for everything 0n-branded.** `pwujhhmlrtxjmjzyttwn`. Period.
2. **One AI provider.** Groq (`llama-3.3-70b-versatile`). Anthropic stays out of production code.
3. **One token system.** `api_tokens` via `lib/0n-token.ts`. The legacy `user_tokens` is dead.
4. **One brain pattern.** `app_briefs` + `brain_files` + `brain_outcomes`. Every "AI" claim verified by `truth-lint` at build time.
5. **One welcome surface.** `/welcome` with 6 cards. Free vs paid clearly gated.
6. **One audit doc, one plan doc.** `STACK_AUDIT.md` + `OPERATION_RESET.md`. Live in the repo. Updated on every PR that touches infra.

---

## CONFLICT RESOLUTION (legacy specs vs current rules)

Specs that pre-date the consolidation rules — what stays, what dies, what gets adapted:

### 0nExec spec (`0nEXEC-COMPLETE-SPEC.md`)
| Spec says | Reality | Action |
|-----------|---------|--------|
| AI learner uses Anthropic SDK | Groq-only is the rule | **REWRITE** `lib/exec/ai-learner.ts` to use Groq before any further deploy |
| Shared auth in `rtwtaisjtvdajrdyivkn` | Canonical is `pwujhhmlrtxjmjzyttwn` | **MIGRATE** `0ntask_provisioned_accounts`, `0ntask_executive_metrics`, `0ntask_ai_recommendations`, `0n_users` into canonical |
| Exec tables in `pwujhhmlrtxjmjzyttwn` | Already there | **KEEP** — confirmed `exec_formulas`, `exec_orbits`, `exec_contacts`, `exec_score_history`, `exec_ai_patterns`, `exec_variables` exist |
| Lives in `0ntask` repo | `0ntask` Vercel project points at the wrong DB | **REPOINT** then merge exec into canonical or keep `0ntask` as a thin front pointing at canonical APIs |
| CRM webhook → re-score loop | Not built | **KEEP** as Phase 5.A target — good idea |
| 10 MCP tools | Not built | **KEEP** as Phase 5.B target — good idea |
| Pricing tiers $79/$199/$499 | Aligned with `lib/pricing.ts` | **KEEP** |

### BotCoaches spec (`/Users/rocketopp/Downloads/CLAUDE.md`)
| Spec says | Reality | Action |
|-----------|---------|--------|
| Separate domain `botcoaches.com` for portable brain training | Brain pattern already implemented in canonical via `app_briefs`+`brain_files` | **DEFER** — not on the reset critical path. Maybe a future spinout once the canonical brain pipeline is proven. |
| Uses both Anthropic + OpenAI for training runs | Groq-only | **OUT OF SCOPE** until/unless this becomes a real product |
| `bc_brains` table seeded for it | 0 rows in canonical | **DROP** in Phase 2 |

### Rocket-mods spec (`/Users/rocketopp/Desktop/CLAUDE.md`)
| Spec says | Reality | Action |
|-----------|---------|--------|
| Rocket+ uses `rtwtaisjtvdajrdyivkn` | Confirmed | **NOT 0n-BRANDED — leave alone**. Rocket+ family is a separate ecosystem. |

---

## REVIEW FEEDBACK INTEGRATED (v2)

Two reviews consolidated:

### From the local setup's review:
- ✅ **Phase 0 added** — local dev verification BEFORE any production action
- ✅ **Phase 2 made surgical** — `RENAME TO _deprecated_*` → 48-hour soak → `DROP`. No instant nukes.
- ✅ **Phase 3 gated by global grep** — every consolidation requires a clean grep across both `onork-app` and `0nmcp-website` first
- ✅ **Phase 7 includes naming standards** — underscores for actions, `bot_settings` (not `bot_config`), `is_active` (not `active`)

### From the Vercel cleanup recommendation (`/Users/rocketopp/Desktop/vercel-cleanup-recommendation.md`):
- ✅ **54 zero-value projects already deleted** — Tier 4 (no source code, no live domain) cleared in 3 sweeps
- ✅ **8 obvious duplicates ready to nuke** in Tier 3A (~$80-100/mo savings)
- ✅ **29 dormant v0-* projects** in Tier 3B (~$300-400/mo savings) — recommend delete after eyeball
- ✅ **Total estimated savings if cleanup completes: $1,500-2,000/mo**
- ⚠️ **Important correction to my Phase 1**: `0nai` lives at `command.0nmcp.com`, `0ntask` at `www.0ntask.com`, `social0n` at `www.social0n.com`, plus `0ndata` at `crm.web0n.com` — these are **LIVE PRODUCTS WITH USERS**, not dormant prototypes. Phase 1 now requires `pg_dump` of the existing data before repointing.

The Vercel cleanup runs as **Track B in parallel** with the Supabase reset. They don't depend on each other.

---

## TWO PARALLEL TRACKS

| Track | Owner | Phases |
|-------|-------|--------|
| **Track A — Supabase + code consolidation** | Engineering | Phase 0 → 7 below |
| **Track B — Vercel cleanup** | Already in flight | 8 obvious dupes + 29 dormant v0-* + addon disabling |

**Track A and B are independent.** Run B's deletions any time — they're zero-risk to A.

---

## THE 8 PHASES (Track A)

Each phase is independently shippable. Phase 0 first (local-first verification). Phases 1-3 are mandatory before any new feature work. Phases 4-6 are scoped to the next 30 days. Phase 7 is governance, ongoing.

### PHASE 0 — Local-first verification rig (5 hours, was 4 — bumped for full prod restore)
**Goal:** Every subsequent phase runs on a local replica of canonical first, verified, THEN promoted to production. Stops us from debugging in prod.

**Updated approach from v3 review — restore PRODUCTION data, not just schema:**

**Steps:**
- [ ] Set up Supabase CLI on Mike's dev machine: `supabase init` in `onork-app`
- [ ] `supabase start` → boots a local Postgres mirror at `localhost:54322`
- [ ] **`pg_dump` from production → restore locally** (this is the critical addition):
  ```bash
  pg_dump "$PRODUCTION_SUPABASE_URL" > /tmp/production_snapshot_$(date +%s).sql
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" < /tmp/production_snapshot_*.sql
  ```
  Why: phase 2 (renames) and phase 3 (consolidation) need to be tested against REAL data — all 240+ tables, all seed data, all the weird edge cases. Empty tables always pass; production data exposes the bugs.
- [ ] Add `.env.local.dev` with the local Supabase URL/key (gitignored)
- [ ] Add `npm run dev:local` script that loads `.env.local.dev` instead of production envs
- [ ] Document the workflow in a new `LOCAL_DEV.md`: "always run risky migrations against the local restore first; `supabase db reset --local` to start over from the production snapshot"
- [ ] Smoke test: rename a known-dead table locally, confirm the app boots, then `supabase db reset` to restore

**Why this matters:** Phase 2 (table drops) and Phase 3 (consolidation) become non-destructive on local before they touch the canonical DB. If something explodes, only the local replica feels it — and the production snapshot can be re-restored in one command.

**Output:** `LOCAL_DEV.md` committed at repo root + `/tmp/production_snapshot_*.sql` retained for the duration of the reset.

### PHASE 0.5 — Pre-reset baseline snapshot (15 min)
**Goal:** A timestamped record of what the ecosystem looked like before any destructive change.

**Steps:**
- [ ] Push current `STACK_AUDIT.md`, `OPERATION_RESET.md`, and `vercel-cleanup-recommendation.md` to `0n-dispatch` repo with commit message `baseline: pre-reset snapshot 2026-04-30`
- [ ] Tag that commit `pre-reset-baseline`
- [ ] If anything in the reset goes sideways, this commit is the receipt for "what was working before"

**Mike's offer in v3 review:** he can push this to `0n-dispatch` directly. ✓ accept.

### PHASE 1 — Repoint the wrong Vercel projects (2-3 hours, was 1-2 — bumped up due to data migration)
**Goal:** No 0n-branded app uses a non-canonical Supabase URL.

**CORRECTION FROM VERCEL CLEANUP REVIEW:** these are LIVE products with custom domains, not dormant prototypes:
- `0nai` → `command.0nmcp.com`
- `0ntask` → `www.0ntask.com`
- `social0n` → `www.social0n.com`
- `0ndata` → `crm.web0n.com` (also points at non-canonical — verify and add to repoint list)
- `0n-saas-template` → no production domain, low risk

So Phase 1 is **migrate-then-repoint**, not "accept data loss":

**Steps (sequential, NEVER all at once — v3 addition):**
- [ ] Run Phase 0 first (local rig must be up)
- [ ] `pg_dump` from `yaehbwimocvvnnlojkxe` (0nCommand, powering 0nai) — full export to SQL file
- [ ] `pg_dump` from `rtwtaisjtvdajrdyivkn` (Rocket+ Master, powering 0ntask + social0n + 0n-saas-template) — full export
- [ ] Identify per-app: which tables are 0n-product data vs Rocket+ family data. We migrate ONLY the 0n-branded data into canonical.
- [ ] On the LOCAL Supabase replica (Phase 0 output): import the relevant tables, run sanity queries
- [ ] Verify: spot-check 5 records per app — do they round-trip correctly?
- [ ] Apply migrations against canonical via `supabase db push`
- [ ] **Repoint apps SEQUENTIALLY, never in parallel:**
  1. `0n-saas-template` (lowest risk, no users) → repoint → `/api/health` → 5 min watch → ✓
  2. `social0n` (pre-launch, low traffic) → repoint → `/api/health` → 10 min watch → ✓
  3. `0nai` (live at command.0nmcp.com) → repoint → `/api/health` → 30 min watch + manual smoke test → ✓
  4. `0ntask` (live at 0ntask.com) → repoint → `/api/health` → 30 min watch + manual smoke test → ✓
- [ ] If `0ndata` (crm.web0n.com) is also on a non-canonical project, add it to the queue last
- [ ] After each app: spot-check user-facing flows, watch error logs for the watch window
- [ ] If ANY app shows errors, STOP and rollback that app before moving on
- [ ] Once all are clean, update `STACK_AUDIT.md` Section 2

**Tradeoff:** longer than the original estimate but no data loss. Worth the extra time given these are live.

**Rollback:** per-app — revert env vars, redeploy. Each app is independent.

### PHASE 2 — Drop dead tables (SURGICAL — 4 hours total over 3 days)
**Goal:** Canonical `pwujhhmlrtxjmjzyttwn` has no empty unused tables. **Done with a 48-hour soak so we catch hidden references.**

**Updated approach from local setup feedback — do NOT instant-drop:**

**Day 1 (1.5 hours): rename to `_deprecated_*`**
- [ ] Generate the candidate list — 0 rows + 0 grep hits across `onork-app`, `0nmcp-website`, `0n-extension`, `rocket-mods`
- [ ] Spot-check 10 manually
- [ ] Single migration: `ALTER TABLE <name> RENAME TO _deprecated_<name>` for ~120 tables
- [ ] Apply to LOCAL replica first, run app smoke tests for 30 min
- [ ] If clean, apply to canonical
- [ ] Watch Vercel function logs + Sentry (or equivalent) for any "table not found" errors

**Day 1-3 (passive — 48-hour soak window)**
- [ ] No code changes during the soak
- [ ] **Slack alert wired** — any Supabase log line matching `relation "_deprecated_` triggers a webhook to Slack channel #all-0n. Catches problems in minutes, not at the end of 48 hours. (v3 addition)
- [ ] Monitor logs daily for missing-table errors
- [ ] If any error fires, `ALTER TABLE _deprecated_<name> RENAME TO <name>` (instant restore)

**Day 3 (1.5 hours): the actual drop**
- [ ] If 48 hours passed clean: single migration `DROP TABLE _deprecated_<name>` for all
- [ ] Run `truth-lint` to confirm no AI-claim regressions
- [ ] Update `STACK_AUDIT.md` Section 4
- [ ] Commit as `feat(db): phase-2 dead table sweep — N tables removed after 48hr soak`

**Categories to drop:**
- All empty `vault_*` tables (5)
- All empty `chatgpt_*` tables (4) — unless the ChatGPT OAuth integration is shipping in the next 30 days
- All empty `onmail_*` tables (5)
- All empty `jaxx_*` tables (3)
- All empty `affiliate_*`, `hipaa_affiliate_*` (7) — unless affiliate program ships in 30 days
- All empty `training_*` (most of 9)
- Empty `linkedin_*` tables (3)
- Empty execution duplicates (`marketplace_executions`, `tool_executions` (just shipped — keep), `console_executions`, `workflow_executions`, `command_executions`, `switch_executions`, `crm_oauth_sessions`, `crm_install_events`, `crm_tokens`)
- Empty `mcp_registry_servers` (superseded by `mcp_registry_cache`)
- Empty `bc_brains`
- Empty `oncall_brain` (3 rows — review, then probably drop, superseded by `app_briefs`+`brain_files`)
- Empty community/store/marketplace duplicates (we'll pick one in Phase 3)

**Safe baseline:** anything dropped here can be rebuilt from a migration file if needed.

### PHASE 3 — Consolidate duplicates (4-6 hours, was 2-3 — bumped due to grep-first gate)
**Goal:** One canonical table per concept.

**GATE:** every consolidation runs the global grep first across ALL 8 repos. If a duplicate has even ONE code reference we missed, the migration plan changes:

```bash
# Before any DROP/MERGE, run (v3 — 8 repos, not 6):
for repo in onork-app 0nmcp-website 0n-extension rocket-mods 0n-marketplace 0nMCP 0ncore-wordpress 0n-core-skill; do
  if [ -d ~/Github/$repo ]; then
    echo "=== $repo ==="
    grep -rn "<table_name>" ~/Github/$repo --include="*.ts" --include="*.tsx" --include="*.js" --include="*.php" --include="*.sql" 2>/dev/null | head
  fi
done
```

The two added in v3:
- `0ncore-wordpress` — the WP MCP plugin references Supabase tables and CRM endpoints
- `0n-core-skill` — references API endpoints that might change when tables consolidate

**Decisions per duplicate group (each is its own PR):**

- [ ] **Tokens** (gate: grep `user_tokens`)
  - Keep: `api_tokens`
  - Migrate: `user_tokens` (4 rows) → `api_tokens` with `channel='legacy_userTokens'`
  - Drop: `user_tokens`, `crm_tokens` (0 rows)

- [ ] **Listings** (gate: grep `store_listings`, `add0n_listings`, `listings`)
  - Keep: `marketplace_apps` (10 rows, has UI)
  - Migrate: `store_listings` (21 rows) → `marketplace_apps`
  - Drop: `add0n_listings` (5), `listings` (2)
  - Keep separately: `ucp_products` (12) — semantically different (SaaS products, not add-ons)

- [ ] **Executions** (gate: 6 different tables to grep!)
  - Keep: `tool_executions` (newest, brain-pattern aligned)
  - Keep separately: `crm_workflow_runs` (100 rows, CRM-specific)
  - Migrate: `console_executions` (9 rows) → `tool_executions`
  - Drop: `executions`, `marketplace_executions`, `workflow_executions`, `command_executions`, `switch_executions`

- [ ] **Brain pattern** (gate: grep `oncall_brain`, `bc_brains`)
  - Keep: `app_briefs` + `brain_files` + `brain_outcomes`
  - Migrate: `oncall_brain` (3 rows) → `brain_files` with `app_slug='oncall'`
  - Drop: `bc_brains` (0 rows), `oncall_brain`

**Each consolidation = one PR.** Each PR independently reversible.

### PHASE 4 — Fix the 0nExec violations + bring it into canonical (1 day)
**Goal:** 0nExec follows the same rules as every other add-on.

**Steps:**
- [ ] Rewrite `lib/exec/ai-learner.ts` to use `lib/service-packager/groq.ts` (drop `@anthropic-ai/sdk` import)
- [ ] Migrate `0ntask_provisioned_accounts`, `0ntask_executive_metrics`, `0ntask_ai_recommendations`, `0n_users` from `rtwtaisjtvdajrdyivkn` → `pwujhhmlrtxjmjzyttwn`
- [ ] Wrap `/api/exec/think` (already shipped) so all 0nExec actions go through `handleThink()` and `record()` — already done in our brain consolidation
- [ ] Update `lib/brain/registry.ts` entry for `0nexec` to confirm it's GREEN in truth-lint after the Anthropic strip
- [ ] Verify truth-lint passes strict
- [ ] If `0ntask` Vercel project is going to live alongside `onork-app`, repoint it as a *thin client* of canonical APIs (no DB access of its own)

### PHASE 5 — Build the 0nExec connections (3-5 days)
**Only after Phases 1-4 land.**

**5.A — CRM ↔ 0nExec re-score loop**
- [ ] `app/api/webhooks/crm/route.ts` — receives ContactUpdate / OpportunityStageUpdate / TaskComplete / NoteCreate
- [ ] `lib/exec/crm-variable-mapper.ts` — CRM custom field → exec variable mapping
- [ ] `lib/exec/orbit-crm-sync.ts` — bidirectional pipeline-to-orbit sync
- [ ] `app/api/cron/exec-score/route.ts` — daily refresh + AI learner trigger
- [ ] vercel.json: add cron `0 5 * * *`

**5.B — 10 MCP tools**
- [ ] `lib/exec/mcp-tools.ts` — define `exec.score_contact`, `exec.score_orbit`, `exec.create_formula`, etc.
- [ ] Register on the `0nMCP` server (not `rocket-plus-mcp` — that's the other ecosystem)
- [ ] Test via Claude Code: call `exec.score_contact` → verify exec_contact row updates

### PHASE 6 — Archive dead Crypto-Goatz repos (30 min)
**Goal:** GitHub UI only shows what's alive.

**Steps:**
- [ ] List all repos under Crypto-Goatz with no push in 60+ days
- [ ] For each: confirm with the audit doc that there's no production deployment behind it
- [ ] `gh repo edit Crypto-Goatz/<name> --archived` (reversible — does NOT delete)
- [ ] Update `STACK_AUDIT.md` Section 3 to mark archived

Estimate: ~60 repos archived. The active list shrinks from 99 to ~30.

### PHASE 7 — Governance (ongoing, no time cost per change)
**Goal:** This mess never re-accumulates.

Rules going into `CLAUDE.md` (root) so every future session sees them:

**Infrastructure rules:**
1. **No new Supabase project gets created without an entry in `STACK_AUDIT.md` Section 1 explaining why pwujhhmlrtxjmjzyttwn isn't enough.**
2. **No new Vercel project beyond a single test deploy without an entry in Section 2.**
3. **No new repo without a one-line description + an honest "active / spike / sandbox" tag.**
4. **Every PR that adds a database migration must update Section 4 of `STACK_AUDIT.md`.**
5. **Every PR that adds an AI surface must update `lib/brain/registry.ts` and pass `TRUTH_LINT_STRICT=1`.**
6. **Anthropic SDK is forbidden in production code.** truth-lint already enforces this for AI surfaces. Add a global lint rule: `import.*@anthropic-ai/sdk` is a build error in `app/`, `components/`, `lib/`. Test files exempt.
7. **Stale-cookie sweep is permanent.** The middleware already auto-cleans wrong-project cookies — keep it forever.
8. **`/debug/auth` is a permanent diagnostic surface.** Don't gate it behind admin. Don't remove it. It saved us today.

**Naming standards (locked in from the local setup's v2 + v3 input):**
9. **API actions use underscores, not dashes.** `score_post`, `generate_post`, `log_engagement`. Anything that ships with a dash gets blocked at lint time.
10. **Settings tables are named `bot_settings`** (NEVER `bot_config`). The 0nLinkedin merge spec made this canonical.
11. **VPIS active-flag column is `is_active`** (NEVER `active`). Live database confirms.
12. **No new v0.dev project survives more than 7 days as `v0-*`.** Promote to a real name + GitHub repo + delete the v0-* shell, OR kill it.
13. **Database columns: `snake_case` only.** Never `camelCase`. (v3)
14. **API endpoint paths use `kebab-case` for route segments, `underscore` for action params.** Example: `/api/canvas/ai-build` (kebab route) with body `{ "action": "package_from_url" }` (underscore). (v3)
15. **Supabase table names: `snake_case`, singular nouns where possible.** (v3 — though plural is OK for genuine collections like `notes`, `tasks`)
16. **Environment variables: `SCREAMING_SNAKE_CASE`, type `plain` on Vercel.** Never `encrypted` for PIT tokens — Vercel's encryption double-wraps them and breaks Bearer auth. This is Mike's #1 historical pain point. (v3)
17. **One table, one purpose.** Before creating a new table, prove that no existing table can be extended. Adds a column to an existing table > spawning a new one. (v3)

**Vercel hygiene (from the cleanup recommendation):**
13. **Speed Insights / Web Analytics are OFF by default.** Only enable on projects with a real custom domain serving real traffic.
14. **Quarterly stale-deploy sweep:** any Vercel project with no deploy in 90+ days gets an automatic delete proposal.
15. **Skill-deploy throwaways auto-delete** their Vercel project after the test run completes.

---

## THE OFFLINE / LOCAL-FIRST QUESTION

Mike pointed at "offline setup" alongside this reset. Two interpretations:

### Interpretation A — local-first MCP execution
Already exists. `0nmcp serve --port 3000` runs the full MCP stack on the user's desktop. The Chrome extension auto-detects it on common ports. Free AI execution via the user's local Claude/GPT/Groq keys. **No reset action needed.**

### Interpretation B — local Supabase / offline dev
Could matter for development without leaking session data into prod auth tables. We can stand up a local Postgres + Supabase CLI instance for dev so we stop polluting `pwujhhmlrtxjmjzyttwn` with test sessions. **Recommended as a parallel Phase 8 but not required for the reset itself.**

If Mike means something else by "offline," he'll need to clarify.

---

## ORDER OF OPERATIONS (v2 — with Phase 0)

```
DAY 0 (foundation):
  PHASE 0 — local-first verification rig                     [4h]

DAY 1:
  PHASE 1 — migrate + repoint 4 Vercel projects              [2-3h]
  PHASE 2A — rename ~120 tables to _deprecated_*             [1.5h]
  → 48-hour SOAK BEGINS

DAY 2:
  PHASE 3 — consolidate duplicates (4 PRs)                   [4-6h]
  PHASE 4 — fix 0nExec violations + bring into canonical     [4h]

DAY 3:
  PHASE 2B — actually DROP the renamed tables                [1.5h]
  PHASE 5 starts — 0nExec ↔ CRM webhook                      (5 days)

DAY 4-8:
  PHASE 5 — build out CRM webhook + 10 MCP tools             [3-5d]

PARALLEL TRACK B (anytime, no dependencies):
  Vercel cleanup — 8 dupes + 29 v0-* dormants + addon disable [2h total]
  Estimated savings: $1,500-2,000/mo

ANYTIME (fast):
  PHASE 6 — archive 60+ dead repos                           [30m]

PERMANENT:
  PHASE 7 — governance rules in CLAUDE.md + truth-lint       [ongoing]
```

Total focused engineering time: roughly **5-7 days** to fully reset (Track A) + 2 hours (Track B).

---

## RISK / ROLLBACK MATRIX

| Phase | Risk if it goes wrong | Rollback |
|-------|----------------------|----------|
| 1 | App lands in fresh empty DB; users see no data | Revert env vars to old project, redeploy. <5 min. |
| 2 | Drop a table that turns out to be referenced | Restore from `pg_dump` taken before Phase 2. |
| 3 | Consolidation breaks queries somewhere | Per-consolidation PR is independent; revert one. |
| 4 | Truth lint breaks build | Strict mode is opt-in; can soft-fail temporarily. |
| 5 | CRM webhook spam / scoring storm | Cron pause + rate-limit on `/api/exec/score`. |
| 6 | Archive the wrong repo | `gh repo edit --no-archived` to unarchive. |
| 7 | Governance rule too strict | Lift the lint rule, document why. |

---

## STATUS — v3 APPROVED, RESET BEGINS

Both reviews said ship it. Plan is locked at v3.

**Now executing in parallel:**
- **Track A: Phase 0 + 0.5** — set up local Supabase rig + push baseline snapshot to `0n-dispatch`
- **Track B: 8 Vercel duplicate deletions** — zero-risk, ~$80-100/mo savings, can run alongside

**Then sequentially:**
- Day 1 → Phase 1 (sequential repoint, app by app)
- Day 1 → Phase 2A (rename to `_deprecated_*` + Slack alert)
- Day 2 → Phase 3 (4 PRs, each grep-gated across 8 repos)
- Day 2 → Phase 4 (strip Anthropic from 0nExec, migrate auth tables)
- Day 3 → Phase 2B (drop the renamed tables after the 48hr soak)
- Day 4-8 → Phase 5 (0nExec ↔ CRM webhook + 10 MCP tools)
- Anytime → Phase 6 (archive 60+ stale repos)
- Permanent → Phase 7 (governance rules in CLAUDE.md + truth-lint)

**Mike pushes the baseline to `0n-dispatch`. I start Phase 0 here.**
