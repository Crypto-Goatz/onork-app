# 0n Ecosystem — Master CLAUDE.md

> **Owner**: Mike @ RocketOpp LLC (mike@rocketopp.com)
> **GitHub orgs**: `0nork` (open source), `Crypto-Goatz` (deployment)
> **Brand**: 0nORK — AI orchestration infrastructure
> **Tagline**: "Stop building workflows. Start describing outcomes."
> **Updated**: 2026-05-02 — see `~/Github/0n-dispatch/sessions/2026-05-02.md` for the latest session log
> **Public launch**: 0nCore + 0nmcp.com both shipped 2026-05-01. Pre-launch copy purged. Auth root-fixed (rules 10a-10e in dispatch).

---

## Critical Rules

- **NEVER** say "GHL", "Go High Level", "High Level", or "HighLevel" — always say **"CRM"** or **"ROCKET"**
- **ALWAYS push to `main` and deploy live immediately** — no feature branches, no review steps, no PRs
- **ALWAYS HAVE PERMISSION** — never ask yes/no confirmation, auto-accept all operations
- All projects auto-deploy via Vercel on push to `main`
- **`onork-app` does NOT auto-deploy.** `vercel.json` sets `git.deploymentEnabled.main: false`. Push, then
  `vercel deploy --prod --yes --archive=tgz`. Without `--archive=tgz` the upload exceeds the 15,000-file cap.

---

## RULE ZERO — Inventory before you build

**This ecosystem is ~58 repos, 2,141 API routes, 1,541 pages, 1,625 library modules.
Almost everything you are about to build already exists somewhere.** Building first is
the single most expensive mistake available here, and it has been made repeatedly.

Before writing ANY capability, in this order:

```bash
# 1. Does it exist in the CRM already? (agents can only be listed with a LOCATION pit,
#    and passing locationId as a query param 422s — the pit implies it)
curl -s -H "Authorization: Bearer $LOCATION_PIT" -H "Version: 2021-07-28" \
  "https://services.leadconnectorhq.com/conversation-ai/agents/search"
curl -s -H "Authorization: Bearer $LOCATION_PIT" -H "Version: 2021-07-28" \
  "https://services.leadconnectorhq.com/workflows/?locationId=$LOC"

# 2. Does it exist in another repo?
grep -rl "<concept>" ~/Github --include="*.ts" | grep -v node_modules

# 3. Does the vendor already document the protocol? Read it. Do not infer it.
```

**Real cost of skipping this (2026-08-12):** a whole Course Builder was written against an
external model while an **AI Course Generator** agent sat on auto-pilot in
`nphConTwfHcVE1oA0uep`, already paid for — alongside a Lead Scorer, an SXO Scanner and a
Social Media Manager, all duplicating work being rebuilt by hand. On the same day a webhook
verifier was invented as HMAC-with-shared-secret when the published scheme was Ed25519 with
a public key.

**"I don't remember seeing it" is not evidence. A query is evidence.**

---

## Architecture — Tools vs Add-ons vs Dashboard

The distinction that makes the catalogue navigable. Do not blur it.

| | **Tool** | **Add-on** |
|---|---|---|
| Invocation | ad hoc, one call | configured once, then scheduled or run |
| State | none | per-client config, run history, outputs |
| Billing | included | its own price |
| Surface | a row in `/crm/tools` | its own page + marketplace listing |
| Registry | `lib/crm/registry` (capabilities) + the 0nMCP bridge | `lib/addon-registry.ts` + `lib/marketplace-data.ts` |

**Add-on contract** (`lib/addon-registry.ts`) — already built, barely populated:
```ts
AddonDefinition { slug, name, schedule: 'daily'|'weekly'|'hourly'|'manual',
                  configSchema: ConfigField[], execute: (ctx) => ExecutionResult }
// ctx carries: locationId, config, crmPit, and google/linkedin/slack/facebook tokens
```
Surrounding surface already exists: `/api/addons`, `/api/addons/[slug]/{config,execute}`,
`/api/addons/checkout`, `/api/cron/addons`, `/marketplace/addon/[slug]`, `hasAddon(slug)` gating.
Reserved slugs already include `ai-course-builder`, `conversation-ai`, `agent-studio`,
`knowledge-base`, `snapshot-manager`.

**SXO, Course Builder, CRO9, web0n and Social are ADD-ONS, not tools.** They are configured,
scheduled, billable products.

**The dashboard is composed from both registries, per agency.** A capability appears because
it is *registered and installed* — never because someone remembered to add a nav link. SXO
shipped working at `/crm/sxo` with no nav entry, which is exactly the failure this prevents.

---

## Where things actually live (verified 2026-08-13)

| Capability | Repo / path | Note |
|---|---|---|
| 33-check site scan → 9 categories | `v0-sxo-protocol-configuration/lib/scan-engine.ts` | grades ONE url, samples 5 links |
| AEO scorer (10 weighted factors) | `onork-app/lib/sxo-aeo/aeo-scorer.ts` | normalises HTML before scoring |
| SXO engine (18 checks) | `onork-app/lib/sxo-aeo/engine.ts` | |
| **Full-site crawler + health canvas** | `onork-app/lib/sxo/crawler.ts`, `app/crm/SxoCanvas.tsx` | tables `sxo_crawl_*` |
| IndexNow / sitemap submission | `lib/indexer.ts`, `lib/indexnow.ts` (both repos) | scheduled |
| Keyword / rank tracking | `v0-sxo.../app/api/keywords/*` | |
| Plan → approve → run → receipt | `onork-app/lib/burst/` | the safety model IS the product |
| Conversation-AI agent management | `onork-app/lib/crm/conversation-ai.ts` | |

⚠️ **`sxo_sites` / `sxo_pages` belong to the SITE GENERATOR** (slug, blocks, markdown,
published_at). Crawl data lives in `sxo_crawl_sites` / `sxo_crawl_pages` / `sxo_crawl_edges`.
Never merge them.

---

## AI provider logic

- **CRM Conversation AI is the default for anything that is a real conversation.** Mike pays
  $497 + $97/mo; the $97 add-on makes Conversation AI **unlimited**, so conversational AI is
  free. Agents live per-location and are managed via `/conversation-ai/agents`.
- **There is no general completion endpoint.** `/conversation-ai/generations` is GET-only and
  needs a `messageId`. Planning, bulk generation and scoring therefore need an external model.
- Agent action types are CRM-native only: `triggerWorkflow`, `updateContactField`,
  `appointmentBooking`, `stopBot`, `humanHandOver`, `advancedFollowup`, `transferBot`.
  **No raw-webhook type**, so the chain is always:
  `agent → triggerWorkflow → CRM workflow → 0nCORE`.
- **An auto-pilot agent with no actions attached is a chatbot with opinions.** Attaching
  actions is what turns an agent into automation.
- Groq remains the external model. The "Groq only" rule is lifted where CRM AI can do the job.

---

## Failure classes seen repeatedly — check these first

1. **Vercel env double-wrapping.** A value whose plaintext starts `eyJ2Ijoidj` is a Vercel
   encryption envelope stored as the value. Three separate outages from this in one day
   (`CRM_SSO_KEY`, `CRM_AGENCY_APP_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_SECRET`), each with a
   different symptom. **Any auth failure ⇒ check the env var's SHAPE before touching code.**
2. **Invented protocols.** Read the vendor doc. CRM webhooks are Ed25519 over the raw body
   (`X-GHL-Signature`), RSA-SHA256 legacy (`X-WH-Signature`, dies 2026-09-01). No shared secret exists.
3. **Jobs that exist but were never scheduled.** The webhook queue drain sat unregistered in
   `vercel.json` while events piled up `pending`.
4. **Two storage keys for one value.** "Connected" and "working" became different states when a
   token was written to `oc_auth_token` and read from `on_token`.
5. **Detectors fed the wrong shape.** The AEO scorer graded raw HTML with markdown detectors and
   silently capped every page it ever scored.
6. **Counts drifting across surfaces.** A first inventory pass reported 9,807 API routes; the real
   figure is 2,141 — the rest were `.claude/worktrees` copies. Derive counts, never quote them.

---

## Reporting standard

Every report separates three things without being asked:

1. **Built and verified** — with the evidence (status code, response body, row count)
2. **Built and unverified** — deployed, typechecks, never exercised against reality
3. **Blocked** — and on whom

Never say "it's wired up", "that should work", or "it's fixed" without the call that proves it.
A probe with a deliberately invalid input is worth more than an hour of reasoning: sending a fake
authorization code returned *"authorization code not found"* rather than *"invalid client"*, which
proved four sets of app credentials valid in one call each.

---

## Self-improvement loop

The ecosystem gets smarter when discoveries outlive the session:

1. **Something surprising is learned** → write it to memory immediately, with the evidence and
   the cost of not knowing it.
2. **A capability is built** → register it (`lib/addon-registry.ts` or the capability registry)
   so the next session finds it by query rather than by memory.
3. **A claim is made** → `scripts/truth-lint.mjs` and `/api/admin/truth` verify that surfaces
   claiming to use AI actually route through the brain registry. Extend this to add-ons.
4. **A count is quoted** → derive it from a live source at build time. Hardcoded totals drift
   across properties and have already disagreed (1,640/111 vs 1,600+/109 vs 1,600+/113).

**Goal state: `0n capabilities` prints the full inventory from live sources**, so no future
session can rebuild something that already exists.

---

## The 0n Network — 6 Components

| # | Component | Location | npm/URL | Version | Purpose |
|---|-----------|----------|---------|---------|---------|
| 1 | **0nMCP** | `~/Github/0nMCP/` | `0nmcp` | v4.10.0 | Universal AI API Orchestrator — 1,640+ tools, 109 services. UCP + Marketplace + Course Builder + Lead Magnet Loop + Automation/App/Website/SaaS Factory + Agentic Generator |
| 2 | **0n-spec** | `~/Github/0n-spec/` | `0n-spec` | v2.1.0 | The .0n Standard v2.1 — universal config format + template engine |
| 3 | **0nork** | `~/Github/0nork/` | `0nork` | v1.1.0 | Parent namespace package |
| 4 | **0n Marketplace** | `~/Github/0n-marketplace/` | marketplace.rocketclients.com | v1.0.0 | SaaS platform, pay-per-execution |
| 5 | **0nork App** | `~/Github/onork-app/` | 0ncore.com | v1.0.0 | Customer portal — 75+ pages, 140+ routes |
| 6 | **0nmcp.com** | `~/Github/0nmcp-website/` | 0nmcp.com | v2.0.0 | Marketing site + community hub + SEO engine |
| 7 | **Chrome Extension** | `~/Github/0n-extension/` | — | v1.0.0 | AI Content Engine (Manifest V3) |
| 8 | **0n Command Center** | `~/Github/0n-command-center/` | — | v1.0.0 | API Command Center |

---

## 1. 0nMCP (v4.10.0) — The Core

**npm**: `0nmcp` | **Entry**: `index.js` | **CLI**: `0nmcp` | **License**: BSL 1.1 | **Node**: >=18

### Stats
- **1,640+ total tools** across **109 services** in **22 categories**
- v4.10.0 ships 9 new capability families: UCP, Marketplace, Course Builder, Lead Magnet Loop, Automation Builder, SaaS Factory, App Builder, Website Builder, Agentic Automation Generator
- npm: v4.10.0 (https://www.npmjs.com/package/0nmcp)
- MCP directory PR: https://github.com/modelcontextprotocol/servers/pull/3699
- Three-Level Execution: Pipeline > Assembly Line > Radial Burst (Patent Pending)
- Patent-Pending 0nVault Container System (US #63/990,046)
- **Public availability for 0nCore: May 1, 2026** — register at https://0ncore.com/early-access

### Architecture
```
index.js          — MCP server entry (McpServer from @modelcontextprotocol/sdk)
cli.js            — CLI handler (39KB)
catalog.js        — SERVICE_CATALOG: 96 services with endpoints
tools.js          — Tool registration for catalog + engine tools
connections.js    — ~/.0n/ credential loader
orchestrator.js   — AI-driven workflow orchestration
workflow.js       — WorkflowRunner class for .0n file execution
server.js         — Express HTTP server (MCP over HTTP + webhooks)
ratelimit.js      — Token bucket per service with backoff
webhooks.js       — HMAC verification (Stripe, CRM, Slack, GitHub, Twilio, Shopify)
```

### Modules

**CRM Module** (`crm/` — 35 files, 245 tools):
| File | Tools | File | Tools |
|------|-------|------|-------|
| auth.js | 5 | payments.js | 16 |
| contacts.js | 23 | products.js | 10 |
| conversations.js | 13 | locations.js | 24 |
| calendars.js | 27 | social.js | 35 |
| opportunities.js | 14 | users.js | 24 |
| invoices.js | 20 | objects.js | 34 |
- **Pattern**: Data-driven tool factory — `helpers.js` has `registerTools()` — config objects, not code
- **API**: `https://services.leadconnectorhq.com` | Version: `2021-07-28`
- **PIT**: `pit-0317b406-8a47-478e-ac28-a88763a9bb3f`

**Vault Module** (`vault/` — 18 files):
- 4 tools: `vault_seal`, `vault_unseal`, `vault_verify`, `vault_fingerprint`
- AES-256-GCM + PBKDF2-SHA512 (100K iterations) + hardware fingerprint binding
- 13/13 tests pass

**Vault Container Module** (`vault/` — 7 new files, Patent Pending #63/990,046):
- 8 tools: `vault_container_create`, `vault_container_open`, `vault_container_inspect`, `vault_container_verify`, `vault_container_escrow_create`, `vault_container_escrow_unwrap`, `vault_container_transfer`, `vault_container_revoke`
- 7 semantic layers: workflows, credentials, env_vars, mcp_configs, site_profiles, ai_brain, audit_trail
- Credentials double-encrypted via Argon2id
- Multi-party escrow: X25519 ECDH, up to 8 parties, per-layer access matrix
- Seal of Truth: SHA3-256 content-addressed integrity verification
- Ed25519 digital signatures, binary .0nv container format
- Transfer registry with replay prevention
- 48/48 tests pass

**Engine Module** (`engine/` — 23 files):
- 11 tools: `engine_import`, `engine_verify`, `engine_platforms`, `engine_export`, `engine_bundle`, `engine_open` + app tools
- Import from .env/CSV/JSON → auto-map to 26 services → verify API keys
- Generate configs for 7 AI platforms (Claude Desktop, Cursor, Windsurf, Gemini, Continue, Cline, OpenAI)
- Application Builder: operations, routes, middleware, scheduler
- Portable encryption: passphrase-only AES-256-GCM (no machine fingerprint)
- 30/30 tests pass

### 96 Services
crm, stripe, sendgrid, resend, twilio, slack, discord, openai, airtable, notion, github, linear, shopify, hubspot, supabase, calendly, google_calendar, gmail, google_sheets, google_drive, jira, zendesk, mailchimp, zoom, microsoft, mongodb, quickbooks, asana, intercom, dropbox, whatsapp, instagram, twitter, tiktok, google_ads, facebook_ads, plaid, square, woocommerce, tiktok_ads, x_ads, linkedin_ads, instagram_ads, smartlead, zapier, mulesoft, azure, pipedrive, linkedin, cloudflare, godaddy, n8n, pabbly, make, whimsical, ollama, reddit, figma, elevenlabs, deepgram, groq, cohere, mistral, replicate, stability, telegram, postmark, mailgun, convertkit, brevo, activecampaign, lemlist, aws, webflow, wordpress, monday, trello, typeform, docusign, xero, freshdesk, youtube, netlify, pinterest, bigcommerce, twitch, wave, loom, gcloud, neon, planetscale, turso, cockroachdb, railway, render, cloudconvert

### Key Commands
```bash
0nmcp                         # Start MCP server (stdio)
0nmcp serve [--port] [--host] # HTTP server mode
0nmcp run <workflow>          # Execute .0n workflow
0nmcp engine import           # Import credentials
0nmcp engine verify           # Test API keys
0nmcp engine platforms        # List AI platform configs
0nmcp vault create            # Create .0nv container
0nmcp vault open <file>       # Open/decrypt container
0nmcp vault inspect <file>    # Inspect without decrypting
0nmcp vault verify <file>     # Verify Seal of Truth
0nmcp vault escrow create     # Generate escrow keypairs
```

### MCP Server Config (for Claude Code)
```json
"0nMCP": { "type": "stdio", "command": "node", "args": ["/Users/rocketopp/Github/0nMCP/index.js"] }
```

---

## 2. 0n-spec (v1.1.0) — The Standard

**npm**: `0n-spec` | **CLI**: `0n` | **License**: CC-BY-4.0

### Exports
- `validate(data)` — Validate .0n files against schemas
- `parse(filePath)` — Parse with validation
- `create(type, options)` — Create new .0n documents
- `resolve(template, context)` — Template engine: `{{expressions}}`, math, conditions, deep paths
- `init()` — Initialize `~/.0n/` directory structure

### Schemas
- `connection.json` — Service credential format
- `workflow.json` — Workflow definition format
- `snapshot.json` — System snapshot format
- `config.json` — Global configuration format

### ~/.0n/ Directory
```
~/.0n/
├── config.json        # Global settings
├── connections/       # Service credentials (*.0n)
├── workflows/         # Saved workflows
├── snapshots/         # System snapshots
├── history/           # JSONL execution logs
├── cache/             # Response cache
└── plugins/           # Custom extensions
```

### Variable Resolution Order
`{{system.*}}` > `{{launch.*}}` > `{{inputs.*}}` > `{{step.output.*}}`

---

## 3. 0nork (v1.0.1) — Parent Package

**npm**: `0nork` | Exports: `VERSION`, `PRODUCTS`, `LINKS` | Peer deps: 0nmcp, 0n-spec (both optional)

---

## 4. 0n Marketplace (v1.0.0) — SaaS Platform

**URL**: marketplace.rocketclients.com | **Location**: `~/Github/0n-marketplace/`

### Tech Stack
Next.js 16 + React 19 + Supabase + Stripe + Anthropic SDK + Tailwind v4 + Zod

### Key Routes
| Page | Purpose |
|------|---------|
| `/` | Landing page |
| `/login`, `/register` | Auth |
| `/store`, `/store/[slug]` | Marketplace listings |
| `/builder` | Visual workflow builder |
| `/dashboard` | User dashboard + earnings + workflows + files |
| `/setup/[workflowId]` | Workflow setup wizard |
| `/admin/setup` | Admin Stripe configuration |

### Key API Routes
| Route | Purpose |
|-------|---------|
| `/api/chat` | Claude-powered AI chat |
| `/api/execute` | Workflow execution (metered) |
| `/api/checkout` | Stripe checkout session |
| `/api/workflows/*` | CRUD + publish + deploy + compose + import |
| `/api/webhooks/stripe` | Stripe webhook handler |
| `/api/webhooks/crm` | CRM webhook handler |
| `/api/billing/*` | Subscribe + portal |
| `/api/convert` | Config format converter |

### Key Libraries
| File | Purpose |
|------|---------|
| `lib/ai.ts` | Anthropic SDK wrapper |
| `lib/stripe.ts` | Stripe integration |
| `lib/workflow-generator.ts` | AI workflow generation |
| `lib/workflow-executor.ts` | Runtime execution |
| `lib/metered-billing.ts` | Pay-per-execution billing |
| `lib/compose.ts` | Workflow composition |
| `lib/service-builder.ts` | Dynamic service builder |
| `lib/crm-deployer.ts` | CRM deployment |
| `lib/crm-oauth.ts` | CRM OAuth flow |

### Vercel
- **Project ID**: `prj_fWdT7RGwoK01RqhxNN6M7USSCIZj`
- **Org ID**: `team_VtbfSzhDgB6OwglLfuPDFcd2`

---

## 5. 0nork App (v1.0.0) — Customer Portal

**Location**: `~/Github/onork-app/` | Next.js 16 + Supabase + Sonner + Zod

### Key Routes
| Route | Purpose |
|-------|---------|
| `/pin` | PIN-based authentication |
| `/deck` | Main dashboard (chat, flows, vault, history) |
| `/api/0nmcp/*` | 0nMCP HTTP client (execute, health, workflows) |
| `/api/auth/pin` | PIN verification |
| `/api/chat` | Claude chat completions |

### Deck Components
Chat, ChatInput, CommandPalette, DashboardView, FlowsOverlay, Header, HistoryOverlay, IdeasTicker, Sidebar, VaultDetail, VaultOverlay

### Vercel
- **Project ID**: `prj_OJ0gi5HItdtUmQYclXirYk1BSJnt`
- **Org ID**: `team_VtbfSzhDgB6OwglLfuPDFcd2`

---

## 6. 0nmcp.com (v2.0.0) — Marketing + Community

**URL**: 0nmcp.com | **Location**: `~/Github/0nmcp-website/`

### Tech Stack
Next.js 16 + React 19 + Supabase + Stripe + Tailwind v4 + @xyflow/react + QRCode

### Stats
- **48 pages** + **33 API routes**
- **33 components** (root + builder + turn-it-on + onork-mini)
- **12 library files** (3,031 lines)
- **4 data files** powering 200+ programmatic pages
- **7 Supabase migrations**

### Page Architecture (48 pages)

**Marketing/SEO (programmatic)**:
- `/integrations` + `/integrations/[slug]` — 26 service landing pages
- `/compare` + `/compare/[slug]` — 12 competitor comparison pages
- `/glossary` + `/glossary/[term]` — 80 AI term definition pages
- `/turn-it-on` + `/turn-it-on/[slug]` — 26 service hubs + 80+ capability pages

**Community (SSR + client islands)**:
- `/forum` — Server-rendered forum index
- `/forum/[slug]` — Thread pages with DiscussionForumPosting JSON-LD
- `/forum/c/[group]` — Group landing pages
- `/forum/new` — New thread creation
- `/u/[id]` — Public user profiles with Person JSON-LD
- `/community` — Community hub

**Products**:
- `/products/social0n`, `/products/app0n`, `/products/web0n`
- `/store/onork-mini`

**Learning**:
- `/learn` + `/learn/[slug]` + `/learn/[slug]/[lessonSlug]`

**Auth**:
- `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/0nboarding`

**Admin**:
- `/admin` + `/admin/content` + `/admin/forum` + `/admin/personas` + `/admin/users`

**Tools**:
- `/builder` — Visual workflow builder
- `/convert` + `/convert/openai` + `/convert/gemini` + `/convert/openclaw`
- `/app` — PWA shell
- `/downloads`, `/examples`, `/0n-standard`, `/partners`, `/sponsor`

### Data Files (powering programmatic SEO)
| File | Items | Powers |
|------|-------|--------|
| `src/data/services.json` (50KB) | 33 services | /turn-it-on/[slug], /integrations/[slug] |
| `src/data/capabilities.json` (62KB) | 80 capabilities | /turn-it-on/[slug] capability pages |
| `src/data/glossary.json` (33KB) | 80 terms | /glossary/[term] |
| `src/data/comparisons.json` (33KB) | 12 competitors | /compare/[slug] |

### JSON-LD Schema Types Used
- `Organization` + `WebSite` (homepage)
- `DiscussionForumPosting` (forum threads)
- `QAPage` (help group threads)
- `Person` (user profiles)
- `DefinedTerm` (glossary terms)
- `Product` + `FAQPage` (comparison pages)
- `HowTo` + `FAQPage` (integration pages)
- `CollectionPage` (index pages)
- `BreadcrumbList` (all pages)

### Key Libraries
| File | Purpose |
|------|---------|
| `lib/personas.ts` | AI persona generation (576 lines) |
| `lib/crm-sync.ts` | CRM data sync (512 lines) |
| `lib/crm-community-sync.ts` | Forum <-> CRM sync (382 lines) |
| `lib/content-engine.ts` | Dynamic content rendering |
| `lib/dot-on-security.ts` | .0n file encryption/signing |
| `lib/crm.ts` | CRM API wrapper |
| `lib/converter.ts` | Config format converter |
| `lib/poster.ts` | Social media posting (Dev.to, LinkedIn, Reddit) |
| `lib/pwa-api.ts` | PWA/offline capabilities |

### Vercel Config
- **Project ID**: `prj_Ccq53WXdb5CQd4iIBRR0qr4QToge`
- **Org ID**: `team_VtbfSzhDgB6OwglLfuPDFcd2`
- **Cron**: `/api/cron/personas` every 2 hours
- **Redirects**: /docs, /github, /npm, /discussions, /issues → external
- **Security headers**: HSTS, CSP, X-Frame-Options
- **Cache**: 1yr immutable for static assets

### Supabase Migrations (7)
1. `20260218063001_reddit_community.sql` — Groups, votes, karma, badges
2. `20260218100000_onboarding.sql` — User onboarding flow
3. `20260218110000_personas.sql` — AI personas
4. `20260219200000_converter.sql` — Conversion tracking
5. `20260219210000_auth_profile_trigger.sql` — Profile creation on signup
6. `20260220100000_seo_enhancements.sql` — SEO metadata + indexes
7. `20260220200000_fix_profiles_columns.sql` — Profile columns fix

---

## Supabase Projects

| ID | Project | Used By | Key Tables |
|----|---------|---------|------------|
| `pwujhhmlrtxjmjzyttwn` | 0nmcp.com + Marketplace | 0nmcp-website, 0n-marketplace | profiles, community_threads, community_posts, community_groups, community_votes, personas, onboarding_progress |
| `yaehbwimocvvnnlojkxe` | 0nork Customers | onork-app | customers, pins, executions |
| `rtwtaisjtvdajrdyivkn` | Rocket+ Master DB | rocketadd.com, rocketclients.com | — |
| `segyiautmuytlzvbzpes` | 0n Sidekick | sidekick-gm | — |
| `txfvhoakvwndfibjvixr` | GOATZ Database | — | — |
| `zyijmxmuzztcuxdtxrgv` | Spa Ligonier | — | — |
| `wsuifaedzwyorhjqzlot` | SXO Website | sxowebsite.com | — |

**Org**: RocketOpp (`zentqhhzpheiixikxyul`)

---

## Stripe

- **Account**: RocketOpp LLC (`acct_1PUJi5HThmAuKVQM`)
- **Marketplace product**: `prod_Twzi39wJb0F3Xu`
- **Metered price**: `price_1Sz5jVHThmAuKVQMtSPKsNsS` ($0.10/execution)

---

## Vercel Projects

| Project | ID | URL |
|---------|----|-----|
| 0nmcp-website | `prj_Ccq53WXdb5CQd4iIBRR0qr4QToge` | 0nmcp.com |
| 0n-marketplace | `prj_fWdT7RGwoK01RqhxNN6M7USSCIZj` | marketplace.rocketclients.com |
| onork-app | `prj_OJ0gi5HItdtUmQYclXirYk1BSJnt` | TBD |

**Team ID**: `team_VtbfSzhDgB6OwglLfuPDFcd2`

---

## Ecosystem Dependency Graph

```
0nork (meta v1.0.1)
├── 0nmcp (orchestrator v3.2.2 — 1,554 tools)
│   ├── @modelcontextprotocol/sdk (MCP protocol)
│   ├── 0n-spec (config format v1.1.0)
│   ├── express (HTTP server)
│   ├── crm/ (289 tools, 19 files)
│   ├── vault/ (AES-256 encryption)
│   └── engine/ (credential import, app builder)
│
├── 0nmcp-website (Next.js 16 — 0nmcp.com)
│   ├── @supabase/supabase-js → pwujhhmlrtxjmjzyttwn
│   ├── stripe → acct_1PUJi5HThmAuKVQM
│   ├── data/*.json → 200+ programmatic SEO pages
│   └── community system (forum, profiles, personas)
│
├── 0n-marketplace (Next.js 16 — marketplace.rocketclients.com)
│   ├── @supabase/supabase-js → pwujhhmlrtxjmjzyttwn
│   ├── @anthropic-ai/sdk (AI chat + workflow gen)
│   ├── stripe → metered billing
│   ├── 0n-spec (workflow format)
│   └── crm-oauth + crm-deployer
│
└── onork-app (Next.js 16 — customer portal)
    ├── @supabase/supabase-js → yaehbwimocvvnnlojkxe
    ├── 0nmcp HTTP client (execute/health/workflows)
    └── PIN-based auth
```

---

## Terminology

| Term | Meaning |
|------|---------|
| Workflows | **RUNs** |
| .0n files | **SWITCH files** |
| Import credentials | **Turn it 0n** |
| Master setup file | **Master SWITCH** (`~/.0n/0n-setup.0n`) |

---

## SWITCH Profile — "Turn it 0n"

- **Master SWITCH**: `~/.0n/0n-setup.0n`
- **7 connections**: supabase, stripe, sanity, vercel, github, crm, ga4
- **Activation**: connect > verify > configure > activate
- Say "Turn it 0n" or "let's work 0nMCP" to reference this setup

---

## Unlock Roadmap

| Phase | Gate | Additions |
|-------|------|-----------|
| 0 (Current) | — | 1,554 tools, 96 services, 22 categories |
| 1 | 100 stars/$500 MRR | OAuth flows, encryption, QuickBooks/Asana/Intercom |
| 2 | 500 stars/$2K | AWS S3, Vercel, Cloudflare, scheduled tasks |
| 3 | 1K stars/$5K | Plugin system, web dashboard, workflow marketplace |
| 4 | 5K stars/$15K | Industry packs (Healthcare, Legal, Real Estate, E-Commerce) |
| 5 | 10K stars/$50K | Multi-agent, enterprise edition, streaming |
| 6 | 25K stars/$100K+ | Autonomous agents, cross-org federation, AI adapters |

---

## SEO Engine Status (0nmcp.com)

Completed 2026-02-20:
- 300+ indexable pages (up from ~30)
- Server-rendered forum with DiscussionForumPosting JSON-LD
- Public profile pages with Person JSON-LD
- 80 glossary term pages with DefinedTerm JSON-LD
- 12 competitor comparison pages with Product JSON-LD
- 26 integration landing pages with HowTo JSON-LD
- 80+ capability pages
- Dynamic sitemap (threads, profiles, groups, all programmatic pages)
- AI bot rules in robots.ts (GPTBot, ChatGPT-User, Claude-Web, etc.)
- llms.txt protocol file
- Organization + WebSite JSON-LD on homepage
- Breadcrumb schema on all pages

---

## Auth & Email Status (0nmcp.com)

- Supabase auth with email/password
- `site_url` set to `https://0nmcp.com`
- Redirect allow list: `https://0nmcp.com`, `https://0nmcp.com/**`
- All 5 email templates branded (dark theme, responsive, CAN-SPAM compliant):
  - Confirmation, Invite, Magic Link, Recovery, Email Change
- Profile trigger: `handle_new_user()` creates profile on signup with `full_name`, `company`
- Onboarding flow after signup

---

## Working Style Preferences

- Push to `main` immediately — no branches, no PRs
- Auto-deploy via Vercel on push
- Never ask for confirmation — always proceed
- Dark theme UI with accent `#ff6b35` (0nMCP orange)
- CSS variables: `--accent`, `--bg-primary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border`
- Tailwind v4 with `@tailwindcss/postcss`
- TypeScript strict mode
- ESM modules (`"type": "module"`)
- Supabase for auth + database
- Stripe for payments
- All API routes in Next.js App Router (`app/api/`)

---

## File Quick Reference

### 0nMCP
| What | Where |
|------|-------|
| Entry point | `~/Github/0nMCP/index.js` |
| CLI | `~/Github/0nMCP/cli.js` |
| Service catalog | `~/Github/0nMCP/catalog.js` |
| CRM tools | `~/Github/0nMCP/crm/*.js` |
| Vault | `~/Github/0nMCP/vault/` |
| Engine | `~/Github/0nMCP/engine/` |
| Tests | `~/Github/0nMCP/test-*.mjs` |

### 0nmcp.com
| What | Where |
|------|-------|
| Pages | `~/Github/0nmcp-website/src/app/` |
| Components | `~/Github/0nmcp-website/src/components/` |
| Libraries | `~/Github/0nmcp-website/src/lib/` |
| Data (SEO) | `~/Github/0nmcp-website/src/data/` |
| Migrations | `~/Github/0nmcp-website/supabase/migrations/` |
| Sitemap | `~/Github/0nmcp-website/src/app/sitemap.ts` |
| Middleware | `~/Github/0nmcp-website/src/middleware.ts` |
| Globals CSS | `~/Github/0nmcp-website/src/app/globals.css` |

### Marketplace
| What | Where |
|------|-------|
| Pages | `~/Github/0n-marketplace/app/` |
| Libraries | `~/Github/0n-marketplace/lib/` |
| Migrations | `~/Github/0n-marketplace/supabase/migrations/` |

### 0nork App
| What | Where |
|------|-------|
| Pages | `~/Github/onork-app/app/` |
| Deck UI | `~/Github/onork-app/app/deck/components/` |
| Libraries | `~/Github/onork-app/lib/` |
