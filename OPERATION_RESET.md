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

## THE 7 PHASES

Each phase is independently shippable. Phases 1-3 are mandatory before any new feature work. Phases 4-6 are scoped to the next 30 days. Phase 7 is governance, ongoing.

### PHASE 1 — Repoint the wrong Vercel projects (1-2 hours)
**Goal:** No 0n-branded app uses a non-canonical Supabase URL.

**Steps:**
- [ ] Repoint `0nai` Vercel envs → `pwujhhmlrtxjmjzyttwn`
- [ ] Repoint `0ntask` Vercel envs → `pwujhhmlrtxjmjzyttwn`
- [ ] Repoint `social0n` Vercel envs → `pwujhhmlrtxjmjzyttwn`
- [ ] Repoint `0n-saas-template` Vercel envs → `pwujhhmlrtxjmjzyttwn`
- [ ] Trigger redeploy on all four
- [ ] Verify each: hit `/api/health` (or equivalent) and confirm new DB
- [ ] Update `STACK_AUDIT.md` Section 2 to reflect new mappings

**Tradeoff:** these apps lose access to data in the OLD project. Acceptable since:
- 0nai had 7 users + 12 sessions — purely community/persona content, low loss
- 0ntask had 4 users + 0 active sessions — probably nobody actively using it
- social0n is pre-launch
- 0n-saas-template is a template

**Rollback:** revert env vars, redeploy. Trivial.

### PHASE 2 — Drop dead tables in canonical (1-2 hours)
**Goal:** Canonical `pwujhhmlrtxjmjzyttwn` has no empty unused tables.

**Steps:**
- [ ] Generate `DROP TABLE IF EXISTS` migration for ~120 tables that are 0 rows + 0 code references in `onork-app` and `0nmcp-website`
- [ ] Spot-check 10 of them manually
- [ ] Apply migration
- [ ] Run `truth-lint` to confirm no AI-claim regressions
- [ ] Update `STACK_AUDIT.md` Section 4

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

### PHASE 3 — Consolidate duplicates (2-3 hours)
**Goal:** One canonical table per concept.

**Steps:**
- [ ] **Tokens:** drop `user_tokens` (4 rows — migrate to `api_tokens` with `channel='legacy_userTokens'`)
- [ ] **Listings:** keep `marketplace_apps` (10 rows), migrate `store_listings` (21 rows) into it, drop `add0n_listings` (5), `listings` (2). Keep `ucp_products` (12) as the SaaS-product side.
- [ ] **Executions:** keep `tool_executions` (newest, brain-pattern aligned). Migrate `console_executions` (9 rows) and `crm_workflow_runs` (100 rows) — actually keep `crm_workflow_runs` separately since it's CRM-specific. Drop `executions`, `marketplace_executions`, `workflow_executions`, `command_executions`, `switch_executions`.
- [ ] **Brain tables:** keep `app_briefs`/`brain_files`/`brain_outcomes`. Migrate `oncall_brain` (3 rows) into `brain_files`. Drop `bc_brains`, `oncall_brain`.
- [ ] Update all code references in one sweep, run truth-lint, deploy.

**Tradeoff:** code touches across many files. Mitigation: one PR per consolidation, each independently reversible.

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

1. **No new Supabase project gets created without an entry in `STACK_AUDIT.md` Section 1 explaining why pwujhhmlrtxjmjzyttwn isn't enough.**
2. **No new Vercel project beyond a single test deploy without an entry in Section 2.**
3. **No new repo without a one-line description + an honest "active / spike / sandbox" tag.**
4. **Every PR that adds a database migration must update Section 4 of `STACK_AUDIT.md`.**
5. **Every PR that adds an AI surface must update `lib/brain/registry.ts` and pass `TRUTH_LINT_STRICT=1`.**
6. **Anthropic SDK is forbidden in production code.** truth-lint already enforces this for AI surfaces. Add a global lint rule: `import.*@anthropic-ai/sdk` is a build error in `app/`, `components/`, `lib/`. Test files exempt.
7. **Stale-cookie sweep is permanent.** The middleware already auto-cleans wrong-project cookies — keep it forever.
8. **`/debug/auth` is a permanent diagnostic surface.** Don't gate it behind admin. Don't remove it. It saved us today.

---

## THE OFFLINE / LOCAL-FIRST QUESTION

Mike pointed at "offline setup" alongside this reset. Two interpretations:

### Interpretation A — local-first MCP execution
Already exists. `0nmcp serve --port 3000` runs the full MCP stack on the user's desktop. The Chrome extension auto-detects it on common ports. Free AI execution via the user's local Claude/GPT/Groq keys. **No reset action needed.**

### Interpretation B — local Supabase / offline dev
Could matter for development without leaking session data into prod auth tables. We can stand up a local Postgres + Supabase CLI instance for dev so we stop polluting `pwujhhmlrtxjmjzyttwn` with test sessions. **Recommended as a parallel Phase 8 but not required for the reset itself.**

If Mike means something else by "offline," he'll need to clarify.

---

## ORDER OF OPERATIONS

```
DAY 1 (today/tomorrow):
  PHASE 1 — repoint 4 Vercel projects                        [1-2h]
  PHASE 2 — drop ~120 dead tables                            [1-2h]

DAY 2:
  PHASE 3 — consolidate duplicates                           [2-3h]
  PHASE 4 — fix 0nExec violations + bring into canonical     [4h]

DAY 3-7:
  PHASE 5 — build 0nExec ↔ CRM and ↔ MCP connections         [3-5d]

ANYTIME (fast):
  PHASE 6 — archive 60+ dead repos                           [30m]

PERMANENT:
  PHASE 7 — governance rules in CLAUDE.md + truth-lint       [ongoing]
```

Total focused engineering time: roughly **5-7 days** to fully reset.

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

## DECISION POINT — what do you want first?

You tell me: **start at Phase 1**, or pause and review this plan first.

Phase 1 has the clearest cost/benefit (the cookie chaos goes away forever) and the fastest reversibility. It's the right place to begin.
