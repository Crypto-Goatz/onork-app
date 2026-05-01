# 0nCore (onork-app) — Master Context

> **Project identity:** 0nCore customer portal — part of the 0nmcp / RocketOpp LLC ecosystem.
> **Owner:** Mike @ RocketOpp LLC · mike@rocketopp.com
> **Domain:** 0ncore.com (canonical) · www.0ncore.com (deployed)
> **Vercel project:** `prj_OJ0gi5HItdtUmQYclXirYk1BSJnt`
> **Canonical DB (Supabase ref):** `pwujhhmlrtxjmjzyttwn`

This file is the master context every Claude Code instance reads on startup.
It mirrors the canonical rules served live at `/api/dispatch/*`. When in doubt,
trust the live API — the rules below are the offline cache.

---

## Critical Rules — non-negotiable

1. **Never hardcode business logic.** Everything user-configurable. Pricing,
   thresholds, weights, copy, prompts, schedules — all read from
   `bot_settings` or a `*_settings`-style table. If a literal would change
   for a different customer, it does not belong in code.
2. **Underscores for actions.** Database functions, RPC names, event keys,
   API action params: `snake_case` always. Never camelCase or kebab-case
   for action identifiers.
3. **Settings table is `bot_settings`.** Singular, prefixed. Never
   `settings`, never `app_settings`, never `config`.
4. **0n_ token system for auth.** All issued tokens (sessions, API keys,
   PITs, signed payloads) prefix with `0n_`. Lets us grep, audit, and
   revoke anything we issued.
5. **Design system is fixed.** Read [`docs/0n-design-system.md`](./docs/0n-design-system.md)
   before building **any** UI. It is the authoritative directive — color tokens,
   typography scale, card/button/input specs, shadcn variable map, motion rules,
   and the hard NO list.
   - Background: `#0d1117`
   - Primary accent: `#6EE05A`
   - Icons: **Lucide React only** — no emoji as icons, ever.
   - No inline `style={{}}` — Tailwind utility classes only.
   - No CSS layering on top of shadcn — set CSS vars at `:root`.
6. **Groq for ALL production AI calls.** Never Anthropic SDK, never OpenAI
   SDK in a prod path. Model selection lives in `bot_settings`. The brain
   registry at `lib/brain/registry.ts` is how surfaces declare their AI
   usage; `scripts/truth-lint.mjs` enforces it in CI.
7. **CRO9 analytics on every surface.** Every page, every API route, every
   user-visible action emits to CRO9. No exceptions for "internal" pages.
8. **SXO writing standard for all copy.** User-facing strings, error
   messages, marketing pages, emails — all go through SXO. Plain language,
   benefit-first, scannable.
9. **Push to `main`.** No branches, no PRs. Vercel auto-deploys on push.
10. **PIT tokens MUST be `type:plain` on Vercel.** Encrypted = double-wrapped
    = breaks CRM auth. (Vercel encrypts at rest already.)
11. **NEVER say "GHL" / "Go High Level" / "HighLevel".** Always "CRM" or
    "ROCKET". Customer-facing and internal.
12. **Server pages: `getSession`, not `getUser`.** `getUser` is a network
    call that races middleware's cookie refresh and creates auth redirect
    loops. Trust middleware. (Burned twice — commits `2c39f2b`, `c213498`.)
13. **Always read `docs/` before building.** This repo carries living specs
    for every major surface. Build from the spec; do not freelance.
14. **Never commit `.env.local`** or any file with secrets. `.gitignore`
    covers the standard cases — verify before `git add -A`.

For the live, authoritative rule set, fetch `/api/dispatch/rules` or read
`0n-dispatch/memory/rules.md` in the canonical repo.

---

## Architecture Overview

```
onork-app/
├── app/                  Next.js 16 App Router — pages + API routes
│   ├── api/              REST/RPC endpoints (dispatch, brain, exec, vpis, crm…)
│   ├── api/dispatch/     Layer 3 dispatch API (rules, ecosystem, products, .0n)
│   ├── welcome/          Post-auth 6-card control panel (no single "main" page)
│   ├── exec/             0nExec — fully configurable ops dashboard
│   ├── canvas/           React Flow visual workflow editor (Phase 2)
│   └── apps/<slug>/      Spawned App Factory apps with inline capability runs
├── 0n-extension/         Chrome extension (Manifest V3) — separate package
├── components/           Shared React components (shadcn-derived)
├── lib/
│   ├── brain/            AI brain registry — every AI surface registers here
│   ├── dispatch.ts       Dispatch API client + signed .0n export logic
│   ├── crm/              CRM API wrapper, OAuth, webhook signers
│   └── …
├── supabase/migrations/  App-specific schema only; canonical migrations live
│                         in 0n-dispatch/migrations/
├── docs/                 Living specs — read before building (see list below)
├── scripts/              truth-lint, sync-from-dispatch, dev tooling
└── public/.well-known/   dispatch.pub — public verify key for signed .0n
```

---

## Key Systems

### VPIS — Velocity / Profile / Intent / Stage scoring
- **8 factors, 58 patterns** evaluated against any contact, lead, or thread.
- Weights live in `vpis_formula_weights` (DB) — never hardcoded.
- Surfaces: lead routing, exec dashboard ranking, Slack notifications.

### 0nExec — fully configurable ops dashboard
- Every widget, threshold, KPI target, and column choice is user-editable.
- Backed by the `exec_*` table family (configs, snapshots, alerts, runs).
- The page is a renderer of config — there is no "default exec dashboard"
  written in code.

### Chrome Extension (`0n-extension/`)
- Manifest V3, 5 tabs: Inbox, Scanner, Fiverr Generator, CRM Quick-Add, Brain.
- **Stack Scanner** detects CRM/marketing/analytics tools on any site —
  results land in `stack_scans`.
- **Fiverr Generator** uses templates from `fiverr_templates` to compose
  gig copy via Groq.

### Canvas (`app/canvas/`)
- React Flow surface for visual workflow editing (Phase 2 spec).
- Read `docs/canvas-phase-2-spec.md` before touching nodes/edges/persistence.

### Slack integration
- **8 slash commands** wired through one signed-request handler.
- Spec: `.claude/commands/slack-build-spec.md` and
  `docs/slack-0nmcp-connection-spec.md`.

### CRM integration
- **Two-app OAuth model:** marketplace app + agency app, separate client IDs.
- Tokens stored in `crm_installations`. PITs are `type:plain` on Vercel.
- **Known issue:** OAuth callback does NOT persist `refresh_token`. Refresh
  flow is therefore broken — fixing this is a TODO. See
  `app/api/crm/oauth/callback/route.ts`.

### Auth
- Supabase email/password + magic link.
- **0n_ token system** for any token we mint outside of Supabase
  (PITs, webhook signers, dispatch export tokens).
- Server components use `getSession()`, never `getUser()`.

---

## Database — key tables

| Table | Purpose |
|---|---|
| `profiles` | User profile mirror (created via `handle_new_user()` trigger) |
| `bot_settings` | All user-configurable knobs — pricing, weights, prompts |
| `vpis_formula_weights` | Per-tenant VPIS factor weights |
| `crm_installations` | CRM OAuth tokens, location/company IDs, scopes |
| `exec_configs` | 0nExec dashboard layouts + widget configs |
| `exec_snapshots` | Periodic dashboard state snapshots |
| `exec_alerts` | Threshold alerts wired to Slack/email |
| `exec_runs` | Audit log of dashboard actions |
| `fiverr_templates` | Gig templates for the extension generator |
| `stack_scans` | Extension scanner results, indexed by domain |

App-specific migrations live in `supabase/migrations/`. Canonical
ecosystem migrations live in `0n-dispatch/migrations/`.

---

## Commands

```bash
npm run dev              # Local dev server (Next.js 16 turbo)
npm run build            # Production build
npx tsc --noEmit         # Strict typecheck (run before committing)
./dev.sh                 # Optional combined dev launcher

supabase start           # Local Postgres + auth + storage
supabase status          # Show connection strings
supabase db push         # Push migrations to linked project

bash scripts/sync-from-dispatch.sh   # Refresh .dispatch-cache/*.json
node scripts/truth-lint.mjs          # Verify brain registry honesty
```

---

## Git conventions

- **Single branch: `main`.** No feature branches. No PRs.
- Push triggers Vercel deploy automatically.
- **Never commit `.env.local`, `.env.*.local`, or `.dispatch-cache/`** —
  all gitignored, but double-check before `git add -A`.
- Commit messages: imperative mood, scope prefix when useful
  (`fix(crm):`, `feat(exec):`).
- Co-author trailer is added by the harness; do not add it manually.

---

## Where the rules live (canonical sources)

| Source | URL |
|---|---|
| Canonical markdown | `github.com/Crypto-Goatz/0n-dispatch` (private) |
| Live API — rules | `https://www.0ncore.com/api/dispatch/rules` |
| Live API — ecosystem | `https://www.0ncore.com/api/dispatch/ecosystem` |
| Live API — products | `https://www.0ncore.com/api/dispatch/products/onork-app` |
| Live API — version | `https://www.0ncore.com/api/dispatch/version` |
| Signed `.0n` exports | `https://www.0ncore.com/api/dispatch/.0n/<section>` |
| Public verify key | `https://www.0ncore.com/.well-known/dispatch.pub` |

This repo *implements* those endpoints. Code is in `app/api/dispatch/*` and
`lib/dispatch.ts`.

---

## /0nAI — full project sync

When the user runs `/0nAI`, do these things in order and report a status
summary at the end:

1. **Read this `CLAUDE.md`** to refresh rules + architecture.
2. **Scan `docs/`** — list every spec file with a one-line description.
3. **Check git** — `git log --oneline -20`, `git status`, current branch.
4. **Find TODOs** — grep for `TODO|FIXME|XXX|@todo` across `app/`, `lib/`,
   `0n-extension/`. Group by file.
5. **List API routes** — enumerate `app/api/**/route.ts` and group by area.
6. **Check migrations** — list `supabase/migrations/*` and note any
   uncommitted/unpushed.
7. **Report** in three buckets:
   - **Built & live** — features with code, routes, and recent commits.
   - **Pending** — specs in `docs/` with no matching implementation.
   - **Broken / known issues** — TODOs, the OAuth refresh-token gap,
     anything truth-lint flags.

The full instructions are duplicated in `.claude/commands/0nAI.md`; this
section is the human-readable summary.

---

## /RocketAI — business-wide sync

`/RocketAI` is the multi-repo version of `/0nAI`. It scans every known
RocketOpp repo, checks Vercel deployments, and produces a product /
marketing / sales / infrastructure status report. Full instructions live
in `.claude/commands/RocketAI.md`.

---

## Repo-specific notes

- **Brain registry** (`lib/brain/registry.ts`) — every AI surface registers
  here. CI lint (`scripts/truth-lint.mjs`) verifies AI claims actually use
  the brain pattern. 9/9 surfaces honest as of commit `c213498`.
- **Dispatch API** (`app/api/dispatch/*`) — Layer 3 of the 4-layer
  architecture. See `0n-dispatch/specs/dispatch-blueprint.md`.
- **`/welcome` is the post-auth landing** — 6-card control panel. No single
  product is the "main" surface.
- **Apps Factory renderer** (`app/apps/<slug>/`) — spawned apps run
  capabilities inline + Jaxx orchestration. See recent commits `38fe3c0`,
  `ee54d8e`.

---

## In-repo playbooks (read before touching marketing surfaces)

Critical Rules #7 ("CRO9 analytics on every surface") and #8 ("SXO writing
standard for all copy") are operationalized by the two playbooks below.
Read them before any work that ships customer-facing copy, lead capture,
schema markup, or analytics.

| Doc | When to read |
|---|---|
| [`docs/0n-design-system.md`](./docs/0n-design-system.md) | **Authoritative.** Every color token, typography scale, card/button/input spec, shadcn variable map, motion rule, and the hard NO list. Read before building any UI. |
| [`docs/SXO-CRO9-Master-Playbook.md`](./docs/SXO-CRO9-Master-Playbook.md) | **Authoritative.** The 6 SXO Pillars + 8 Content Patterns + Living DOM + CRO9 engine + family-wide pricing + universal env-var standard. Source of truth for any public page. |
| [`docs/Audit-VerifiedSXO-JaxxAI-CryptoGoatz.md`](./docs/Audit-VerifiedSXO-JaxxAI-CryptoGoatz.md) | Worked example of the audit + retrofit playbook against three live family sites. Use as the template when auditing any new domain. |

### What "ships with SXO+CRO9" means (page checklist)

Every public page in the family ships with all 9:

1. **BLUF** — Bottom Line Up Front, 1–2 sentences answering the search intent
2. **Living DOM marker** — `<meta name="cro9:living" content="1">` so the
   mutation engine + rank tracker know the page is variant-eligible
3. **Table trap** — comparison table within first viewport
4. **FAQ schema** — 5–7 voice-search Q&A pairs as `FAQPage` JSON-LD
5. **HowTo schema** — when the page describes a process
6. **Internal-link cluster** — 3–5 contextual cross-family links
7. **CRO9 embed** — 15KB async, 147 behavioral metrics
8. **UCP Live Strip** — live signal of org activity from `/api/ucp/live`
9. **`/llms.txt`** — AI-bot citation rules at site root

Measured by `/api/sxo-score` (0–100). **Family pages must score ≥ 95.**

### CRO9 analytics on every site

Every site environment in the family runs the CRO9 embed (Ignite tier $29/mo
minimum). One Supabase project (`pwujhhmlrtxjmjzyttwn`), one MAB allocator,
one variant pool registry, one event sink. Sites identify themselves via
`NEXT_PUBLIC_CRO9_SITE_ID`.

### Universal env vars (CRO9 standard, identical on every site)

```
GROQ_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_CRO9_SITE_ID
NEXT_PUBLIC_GA4_ID
NEXT_PUBLIC_GTM_ID
SERPAPI_KEY
CRM_LOCATION_ID         # AeY8M0GNOuJPNkLQ7AAC for family sites
CRM_PIT_TOKEN           # type:plain on Vercel — never encrypted
JAXX_AGENT_ID
NEXT_PUBLIC_CONSENT_MODE
```

Same names, same shape, every site. If a site needs a new variable, propose
it for the standard rather than diverging.

The hard rules in **Critical Rules** above (Groq only, Lucide only, no inline
styles, push to `main`, PIT `type:plain`, never say GHL, `getSession` not
`getUser`) apply to every page on every family site — not just this repo.
