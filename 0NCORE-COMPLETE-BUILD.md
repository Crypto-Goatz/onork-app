# 0nCore — Complete Build Documentation

> **Version:** 4.5.0 (Final Beta)
> **Owner:** Mike @ RocketOpp LLC (mike@rocketopp.com)
> **Domain:** 0ncore.com
> **Repo:** Crypto-Goatz/onork-app
> **Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + Supabase + Stripe
> **Supabase:** pwujhhmlrtxjmjzyttwn
> **Vercel:** prj_OJ0gi5HItdtUmQYclXirYk1BSJnt (team_VtbfSzhDgB6OwglLfuPDFcd2)
> **License:** BSL 1.1 (5 patents pending)
> **Launch:** May 1, 2026

---

## What 0nCore IS

0nCore is an AI Business Operating System. It connects to a user's CRM sub-location and provides an AI layer (the 0nAI Engine) that can execute across 14,500+ tools, 867 services, and 96 categories. Users interact with it through the dashboard, the floating AI chat, the Action Dock, API tokens, or the CRM marketplace embed.

The core value: "Add it one place. Have it everywhere." Every piece of data syncs across all connected services in real time.

---

## Architecture

```
User
  |
  +--> 0ncore.com (Next.js 16, Vercel)
  |      |
  |      +--> Supabase (pwujhhmlrtxjmjzyttwn)
  |      |      Auth, profiles, conversations, tokens, executions
  |      |
  |      +--> CRM API (services.leadconnectorhq.com)
  |      |      34 modules, 335 tools, OAuth + PIT auth
  |      |
  |      +--> Groq AI (llama-3.3-70b-versatile)
  |      |      All AI generation (NEVER Anthropic from app code)
  |      |
  |      +--> Google APIs (SA + OAuth)
  |      |      GA4, Search Console, Workspace (16 actions)
  |      |
  |      +--> Stripe (acct_1PUJi5HThmAuKVQM)
  |      |      Payments, subscriptions, metered billing
  |      |
  |      +--> 0nMCP (npm: 0nmcp v4.5.0)
  |             14,500+ tools, 96 categories, BSL licensed
  |
  +--> CRM Marketplace (embedded iframe)
  |      Custom Page: /dashboard?locationId={{location.id}}&embed=true
  |
  +--> External Software (API token)
  |      POST /api/engine/external
  |
  +--> PWA (Add to Home Screen)
```

---

## CRM Integration (34/34 modules — 100%)

| Module | API Route | Tools |
|--------|-----------|-------|
| auth | /api/oauth/* | 5 |
| contacts | /api/crm/contacts | 23 |
| conversations | /api/crm/conversations | 13 |
| calendars | /api/crm/calendar | 27 |
| opportunities | /api/crm/pipeline | 14 |
| invoices | /api/crm/invoices | 20 |
| payments | /api/billing/* | 16 |
| products | /api/crm/products | 10 |
| locations | /api/crm/locations | 24 |
| social | /api/social/* | 35 |
| users | /api/crm/users | 24 |
| objects | /api/crm/objects | 34 |
| media | /api/media | 6 |
| phone-system | /api/crm/phone | 6 |
| email-campaigns | /api/email/* | 6 |
| funnels | /api/crm/funnels | varies |
| surveys-forms | /api/crm/forms | 3 |
| billing | /api/crm/billing | varies |
| marketplace-billing | /api/marketplace/* | 7 |
| knowledge-base | /api/kb | varies |
| agent-builder | /api/agent-bridge | 3 |
| agent-studio | /api/crm/agent | varies |
| course-generator | /api/courses/* | varies |
| saas-management | /api/agency | 3 |
| oauth-store | /api/oauth/* | varies |
| addons | /api/marketplace/* | varies |
| voice-ai | /api/crm/voice-ai | varies |
| brand-board | /api/crm/brand-board | 2 |
| documents | /api/crm/documents | 4 |
| recurring-tasks | /api/crm/recurring-tasks | 4 |
| associations | /api/crm/associations | 4 |
| sdk | lib/crm.ts | internal |
| helpers | lib/crm.ts | internal |
| user-context | /api/user/* | internal |

---

## All API Routes (140+)

### Core
```
GET/POST /api/engine                    — 0nAI Engine (main conversational endpoint)
POST     /api/engine/external           — External token access
GET/PUT  /api/engine/settings           — Security level + persona prefs
POST     /api/agent-bridge              — Natural language automation factory
POST     /api/workflows/blog-to-social  — 6-step content workflow
GET      /api/workflows/blog-to-social/status — Workflow status
```

### Security
```
POST     /api/security/score            — Evaluate trust score
GET/POST /api/security/challenge        — Serve/resolve challenges
GET/POST /api/security/queue            — Task queue management
POST     /api/security/interrupt        — STOP/OFF handler
GET      /api/security/timeline         — Audit events
```

### CRM
```
GET/POST /api/crm/contacts             — Contact CRUD
GET/POST /api/crm/conversations        — Conversations
GET/POST /api/crm/calendar             — Calendar events
GET/POST /api/crm/pipeline             — Pipeline/opportunities
GET/POST /api/crm/invoices             — Invoices
GET/POST /api/crm/products             — Products
GET/POST /api/crm/users                — CRM users
GET/POST /api/crm/objects              — Custom objects
GET/POST /api/crm/phone                — Phone numbers
POST     /api/crm/phone/call           — Initiate call
GET/POST /api/crm/forms                — Forms + submissions
GET/POST /api/crm/funnels              — Funnels
GET/POST /api/crm/redirects            — URL redirects
GET/POST /api/crm/campaigns            — Campaigns
GET/POST /api/crm/blog                 — Blog posts
GET      /api/crm/locations            — Sub-locations
GET/POST /api/crm/voice-ai             — Voice AI agents
GET/POST /api/crm/brand-board          — Brand kit sync
GET/POST /api/crm/documents            — Documents/contracts
GET/POST /api/crm/recurring-tasks      — Recurring tasks
GET/POST /api/crm/associations         — Object associations
GET      /api/crm/connect              — Generate CRM install URL
GET/POST /api/crm/workflows            — Workflow management
```

### Social
```
POST     /api/social/post              — Post to CRM + direct platforms
POST     /api/social/bulk              — AI bulk generation
GET/POST /api/social/csv               — CSV import/export/template
GET      /api/social/posts             — List CRM posts
DELETE   /api/social/posts             — Delete CRM post
GET      /api/social/accounts          — Connected accounts
POST     /api/social/connect           — OAuth connect platform
POST     /api/social/disconnect        — Disconnect platform
POST     /api/social/generate          — AI content generation
GET/POST /api/social/categories        — Post categories
```

### Email
```
GET/POST /api/email/templates          — CRM email templates
POST     /api/email/generate           — AI email generation (Groq)
POST     /api/email/design             — Design tool proxy
GET/POST /api/email/campaigns          — Campaign management
POST     /api/email/warmup             — IP warmup
```

### Google
```
GET      /api/google/analytics         — GA4 reports (6 types)
GET      /api/google/search-console    — Search Console (7 types)
POST     /api/google/workspace         — Unified Google API (16 actions)
GET      /api/auth/google-connect      — Start Google OAuth
GET      /api/auth/google-connect/callback — Google OAuth callback
```

### Auth & OAuth
```
GET      /api/oauth/authorize          — CRM External Auth (inbound)
POST     /api/oauth/token              — Token exchange
GET      /api/oauth/userinfo           — User info endpoint
GET      /api/oauth/callback           — CRM marketplace install callback
POST     /api/auth/sso                 — CRM SSO decryption
GET      /api/auth/demo                — Demo credentials
```

### Payments
```
POST     /api/billing/checkout         — Stripe checkout
POST     /api/billing/portal           — Billing portal
POST     /api/marketplace/addon-checkout — Add-on purchase
POST     /api/stripe                   — Stripe operations
POST     /api/webhooks/stripe          — Stripe webhook handler
```

### Analytics
```
POST     /api/cro                      — CRO9 analysis engine
POST     /api/ads                      — Paid ads data
```

### HIPAA
```
POST     /api/hipaa/scan               — Run HIPAA assessment (public + admin)
GET      /api/hipaa/report             — Retrieve assessment results
POST     /api/hipaa/voice-trigger      — Voice AI follow-up trigger
```

### Tokens & Profile
```
GET/POST/DELETE /api/tokens            — API token management
POST     /api/profile/smart-capture    — Save detected data to profile
GET/PUT  /api/settings/google-key      — Google SA key upload
```

### Snapshots
```
POST     /api/snapshots/deploy         — Deploy master snapshot to location
```

### Integrations
```
POST     /api/integrations/quora       — Quora conversion events
GET/POST /api/locations                — List sub-locations
```

### Webhooks
```
POST     /api/webhooks/stripe          — Stripe events
POST     /api/webhooks/slack           — Slack events
POST     /api/webhooks/discord         — Discord events
POST     /api/webhooks/telegram        — Telegram events
POST     /api/webhooks/whatsapp        — WhatsApp events
POST     /api/webhooks/wordpress       — WordPress events
```

### Tasks
```
POST     /api/tasks/ai                 — Task AI assistant
```

---

## All Dashboard Pages (75+)

### Core
```
/dashboard                    — Main dashboard
/dashboard/analytics          — GA4 + CRO9 (4 tabs)
/dashboard/marketplace        — Add-on marketplace (internal)
/dashboard/config             — Configuration (5 tabs: Email/Phone/Social/Integrations/Security)
/dashboard/security           — 0nAI Security trust engine
```

### 0nAI
```
/dashboard/brand              — Brand Builder + CRM sync
/dashboard/automations        — Automation builder
/dashboard/courses            — AI Course Builder
/dashboard/voice              — Voice AI agent management
/dashboard/ai                 — AI Assistant (admin)
```

### 0nTask
```
/dashboard/training           — K-Layer Knowledge Base (15 slots)
/dashboard/tasks              — Task Manager (kanban + AI + 11 components)
```

### Manage
```
/dashboard/contacts           — Contact Manager
/dashboard/contacts/[id]      — Contact detail
/dashboard/contacts/import    — Bulk import
/dashboard/contacts/segments  — Segmentation
/dashboard/pipeline           — Pipeline kanban
/dashboard/pipeline/list      — Pipeline list view
/dashboard/web-tools          — Web tools
/dashboard/ads                — Paid Ads dashboard
/dashboard/domains            — Domain management
/dashboard/users              — CRM user management
```

### Apps
```
/dashboard/chat               — Conversations
/dashboard/email              — Email inbox
/dashboard/email/builder      — Drag-and-drop email builder (Unlayer)
/dashboard/email/campaigns    — Email campaigns
/dashboard/email/templates    — Email templates
/dashboard/social             — Social Planner (5 tabs: Compose/Bulk/Scheduled/Analytics/Accounts)
/dashboard/workflows          — Workflow management
/dashboard/workflows/blog-social — Blog-to-Social workflow
/dashboard/workflows/bridge   — Agent Bridge dashboard
/dashboard/notes              — ReactFlow whiteboard
/dashboard/files              — Media/file management
/dashboard/calendar           — Calendar
/dashboard/integrations       — Service connections
/dashboard/phone              — Phone system
/dashboard/blog               — Blog engine
/dashboard/forms              — Form builder
/dashboard/funnels            — Funnel builder + redirects
/dashboard/documents          — Documents/contracts
/dashboard/store              — E-commerce store
/dashboard/campaigns          — Campaign manager
/dashboard/objects            — Custom objects
/dashboard/wordpress          — WordPress manager
/dashboard/links              — Link triggers
/dashboard/products           — Product catalog
/dashboard/snapshots          — Snapshot deployment
/dashboard/invoices           — Invoice management
/dashboard/billing            — Payment/billing
```

### Account
```
/dashboard/affiliates         — Affiliate program
/dashboard/downloads          — Downloads (WP plugin, MCP configs)
/dashboard/learn              — 0nBoarding 101 (8 modules, 39 lessons)
/dashboard/community          — Community forum (iframe embed)
/dashboard/docs               — Internal documentation (7 sections)
/dashboard/settings           — Account settings
/dashboard/settings/analytics — Google SA key upload
/dashboard/settings/white-label — White label config
/dashboard/onboarding         — Setup wizard
```

### Admin (admin-only)
```
/dashboard/agency             — Agency command center
/dashboard/admin              — Admin dashboard
/dashboard/admin/connections  — Connection management
/dashboard/admin/crm          — CRM admin
/dashboard/admin/marketing    — Marketing tools
/dashboard/admin/workflows    — Workflow admin
/dashboard/hipaa              — HIPAA 2026 Scanner (PRIVATE)
```

---

## Public Pages

```
/                             — Homepage (hero, features, integrations, community)
/platform                     — "Add it one place. Have it everywhere."
/connections                  — 30+ services by category
/pricing                      — 31 add-ons with pricing
/request                      — Request access form (CRM webhook)
/launch-party                 — May 1st RSVP (CRM webhook)
/login                        — Login page
/signup                       — Signup page
/intro                        — Toggle animation (original landing)
/hipaa                        — HIPAA 2026 free scan (lead magnet)
/hipaa/scan                   — HIPAA scan results
/marketplace                  — Public marketplace index
/marketplace/[category]       — Category listing (8 categories + all)
/marketplace/addon/[slug]     — Add-on detail (32 pages)
/marketplace/cart             — Shopping cart
```

---

## Key Libraries

```
lib/engine/context.ts         — K-layer context builder
lib/engine/prompt.ts          — Dynamic system prompt per persona
lib/engine/conversation.ts    — Multi-turn persistence
lib/engine/groq.ts            — Groq AI client
lib/engine/intent.ts          — Bridge intent detection
lib/agent-bridge.ts           — Automation factory (13 actions)
lib/workflows/blog-to-social.ts — Content workflow engine
lib/workflows/templates.ts    — 7 pre-built workflow templates
lib/security/score.ts         — Trust scoring engine
lib/security/ladder.ts        — Decision ladder
lib/security/queue.ts         — Task queue
lib/security/interrupt.ts     — STOP/OFF handler
lib/security/challenges.ts    — Challenge system
lib/hipaa/scanner.ts          — 51-check HIPAA scanner
lib/snapshot.ts               — Master snapshot + deployment
lib/google/auth.ts            — Google SA + OAuth auth
lib/google/workspace.ts       — 16 Google Workspace actions
lib/crm.ts                    — CRM API helpers + token resolution
lib/location-context.tsx      — Location provider + switcher
lib/smart-capture.ts          — Data detection (API keys, phones, emails)
lib/use-toast.ts              — Toast notification helpers
lib/use-role.ts               — Role context + admin detection
lib/marketplace-data.ts       — 32 add-ons, 8 categories
```

---

## Key Components

```
components/ai-assistant.tsx   — Floating 0nAI Engine chat (sparkle button)
components/action-dock.tsx    — Right-side icon strip + sliding panel (7 tabs)
components/token-modal.tsx    — API token generator modal
components/loading-screen.tsx — Animated loading GIF
components/providers.tsx      — Toaster + loading screen wrapper
components/strike-settings-dialog.tsx — Settings dialog (shadcn)
components/ui/*               — shadcn/ui components (25+)
```

---

## Floating UI Stack (bottom-right)

```
RIGHT EDGE (vertically centered):
  [Zap]     Quick Actions (context-aware)
  [List]    Tasks (localStorage)
  [Book]    Notes (localStorage)
  [Phone]   Dialer (numpad + CRM call)
  [Clock]   Focus Timer (15/25/45/60m)
  [Search]  Search everything
  [Gear]    Settings links

BOTTOM-RIGHT CORNER:
  [Sparkle] 0nAI Engine chat (380x520 panel)
```

---

## 0nAI Engine

The core AI. Accessed via:
1. Dashboard chat (sparkle button)
2. Bearer token: POST /api/engine/external
3. CRM Agent Studio webhook
4. Any software with a 0ncore_ token

**Personas:** Engine (default), Writer, Sales, Social, Support, Custom
**Security Levels:** Low, Default, Strict
**K-Layer Context:** K1 Platform + K2 Brand + K3 Company + K4 Security
**Multi-turn:** Conversations persist across sessions

---

## Agent Bridge (13 Actions)

Natural language → CRM API calls. User says "build me a website" → bridge builds it.

```
create-workflow         — Automation sequences
create-voice-agent      — Voice AI agents
configure-chat          — Chat bots
create-form             — Forms
create-funnel           — Landing pages
create-email-sequence   — Email drips
blog-to-social          — Content creation + distribution
setup-tracking          — Analytics/pixels
build-website           — CRM-hosted website (funnel pages)
build-wordpress         — WordPress site (WP REST API)
full-setup              — Complete business setup (multi-action)
create-contact          — CRM contact
send-message            — SMS/email to contact
```

**7 Templates:** lead-followup, appointment-reminder, review-request, winback, onboarding, missed-call, invoice-followup

---

## K-Layer Architecture (15 slots)

```
K1:  Platform (system knowledge — locked)
K2:  Brand & Design (auto-populated from Brand Board)
K3:  Company (FREE — user's business knowledge)
K4:  0nAI Security (trust engine — locked)
K5-K14: Purchasable ($9/mo each or industry packs)
K15: Reserved (empty)
```

---

## 0nAI Security

```
Trust Score: 0-100 (starts at 100)
States: GREEN (85+) | YELLOW (70-84) | ORANGE (50-69) | RED (<50)

9 Signals:
  new_geography: -15    verification_passed: +20
  new_device: -10       verification_failed: -30
  new_browser: -5
  writing_deviation: -20
  tone_shift: -10
  off_pattern_workflow: -15
  off_pattern_timing: -10

16 Capability Tiers:
  T1 (reads): always proceed
  T2 (actions): challenge if < 85
  T3 (sensitive): challenge if < 90 (1.5x multiplier)
  T4 (critical): challenge if < 95, block if red
```

---

## CRM Marketplace App

```
App ID:          69c762225a31e1cd2f28dd4c
Main Client:     69c762225a31e1cd2f28dd4c-mnu5pazi
External Auth:   69c762225a31e1cd2f28dd4c-mn9wyk9o
Install Client:  69c762225a31e1cd2f28dd4c-mnsa16jo
Status:          SUBMITTED FOR REVIEW
Pricing:         Free (billing through own Stripe)
Custom Page:     https://0ncore.com/dashboard?locationId={{location.id}}&embed=true
OAuth:           /api/oauth/authorize, /token, /userinfo, /callback
```

---

## Supabase Tables (pwujhhmlrtxjmjzyttwn)

### Core
- profiles
- user_tokens
- crm_installations
- marketplace_installations

### Engine
- engine_conversations
- engine_messages
- engine_settings

### Security
- onai_security.user_profile
- onai_security.sessions
- onai_security.challenge_pool
- onai_security.capability_tiers
- onai_security.queue
- onai_security.audit

### Workflows
- workflow_executions
- bridge_executions
- bridge_workflows

### HIPAA
- hipaa_assessments

### Social
- social_posts

---

## External Services Connected

| Service | Auth Method | API Route |
|---------|-------------|-----------|
| CRM | PIT + OAuth | /api/crm/* |
| Stripe | Secret Key | /api/stripe, /api/webhooks/stripe |
| Google GA4 | Service Account | /api/google/analytics |
| Google Search Console | Service Account | /api/google/search-console |
| Google Workspace | OAuth | /api/google/workspace |
| Groq AI | API Key | lib/engine/groq.ts |
| Slack | Bot Token | /api/webhooks/slack |
| Discord | Webhook | /api/webhooks/discord |
| Telegram | Bot Token | /api/webhooks/telegram |
| WhatsApp | API | /api/webhooks/whatsapp |
| Quora | Conversion API | /api/integrations/quora |
| WordPress | REST API + Token | /api/webhooks/wordpress |

---

## Vercel Environment Variables (key ones)

```
NEXT_PUBLIC_SUPABASE_URL          — https://pwujhhmlrtxjmjzyttwn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     — (set)
SUPABASE_SERVICE_ROLE_KEY         — (set)
CRM_PIT                           — pit-0317b406-...
CRM_PIT_RAW                       — (set)
CRM_AGENCY_PIT                    — (set)
CRM_MARKETPLACE_CLIENT_ID         — 69c762225a31e1cd2f28dd4c-mnu5pazi
CRM_MARKETPLACE_CLIENT_SECRET     — 92cb8fc3-...
CRM_EXTERNAL_AUTH_CLIENT_ID       — 69c762225a31e1cd2f28dd4c-mn9wyk9o
CRM_EXTERNAL_AUTH_CLIENT_SECRET   — 8a29aa46-...
GOOGLE_SA_KEY                     — (service account JSON)
GOOGLE_CLIENT_ID                  — 553204394949-...
GOOGLE_CLIENT_SECRET              — GOCSPX-...
GA4_PROPERTY_ID                   — 444978038
GROQ_API_KEY                      — gsk_...
STRIPE_SECRET_KEY                 — rk_live_...
STRIPE_WEBHOOK_SECRET             — whsec_...
```

---

## SEO / SXO

- robots.ts — allows all crawlers + AI bots (GPTBot, Claude-Web, etc.)
- sitemap.ts — 8+ public pages with priority weighting
- JSON-LD schemas: SoftwareApplication, FAQPage, Product, BreadcrumbList, ItemList, WebPage
- Quora conversion pixel on all pages
- GA4 tracking (G-BE81T6STW6) on all pages
- 32 statically generated marketplace add-on pages
- HIPAA lead magnet with 10-question FAQ schema

---

## Snapshot System

Master Snapshot v1.0.0 deploys to any sub-location:
- 7-stage pipeline (New Lead through Won/Lost)
- 5 custom fields (0nCore User ID, Tier, Trust Score, K-Layers Active, Last AI Interaction)
- 6 tags (0ncore-managed, ai-enabled, vip, active, trial, churned)
- 2 webhook workflows (Lead Follow-up, Content Engine)
- 4 K-layer knowledge bases (K1-K4)

Deploy: POST /api/snapshots/deploy { locationId }

---

## PWA

- manifest.json at /manifest.json
- Standalone display mode
- Theme color: #7ed957
- Start URL: /dashboard
- Apple mobile web app capable
- Add to Home Screen on iOS + Android

---

## HIPAA Scanner (PRIVATE — RocketOpp only)

- 51 checks (23 public + 21 dashboard + 7 universal)
- Dual scoring: Current HIPAA Rule (2013) + 2026 NPRM
- Voice AI follow-up with CRM contact creation
- Public lead magnet at /hipaa
- Admin dashboard at /dashboard/hipaa
- Location locked: 6MSqx0trfxgLxeHBJE1k

---

## Known Issues

1. GA4 property 444978038 — SA needs Account-level access in analytics.google.com
2. Social OAuth — cannot initiate from 0ncore.com; workaround: CRM dashboard popup
3. Email builder — position:fixed may need tweaks in compact layout mode

---

## Roadmap to v5.0 (May 1, 2026 Launch)

1. Auth gate on CLI (`0nmcp auth <token>`)
2. Spark metering (50 free, then $0.01/run)
3. Card-on-file before sparks deplete
4. Idea Harvester (GHL Ideas board scraper)
5. Voice AI provisioning via Agent Bridge
6. Snapshot factory (auto-deploy on signup)
7. React Native mobile app wrapper
8. Dashboard UI polish pass
9. Full end-to-end user account testing
