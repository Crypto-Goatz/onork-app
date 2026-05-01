# Unified Install Hub — Specification

> **Status:** Draft v1.0
> **Owner:** Mike @ RocketOpp LLC
> **Last updated:** 2026-05-01
> **Replaces:** `/downloads`, `/dashboard/downloads`, `/platform`, `0nmcp.com/install`
> **Lives at:** `/install` (public) · `/dashboard/installs` (authenticated)

---

## 1. Purpose

The Unified Install Hub is **the** adoption page for the entire 0n ecosystem.
It is the single surface where any user — anonymous visitor or signed-in
customer — discovers every integration we ship, registers if needed,
walks through a guided install for each platform, and tracks progress
across sessions.

**One page. One source of truth. Replaces every other install surface.**

### Goals

- **Single entry point.** No more confusion between `/downloads`,
  `/platform`, `/dashboard/downloads`, and `0nmcp.com/install`. One URL,
  every integration.
- **App-store feel for business tools.** Clean grid, category filters,
  search, status badges. Familiar, scannable, frictionless.
- **Zero abandonment.** Multi-step installs save progress per-user in
  Supabase. Users can leave mid-flow, come back tomorrow, and resume
  exactly where they left off.
- **Coming-soon capture.** Every "not yet" integration captures an email
  for launch notification — turns the page into a lead-gen surface for
  the roadmap.
- **Dual route, single component.** `/install` is the public marketing
  funnel; `/dashboard/installs` is the authenticated control panel. Same
  React component renders both — auth state and route determine behavior.

### Non-goals

- This is **not** a marketplace listing page. Pricing, plan comparisons,
  and feature matrices live elsewhere.
- This is **not** a docs site. The walkthrough is task-oriented (do these
  N steps); deep documentation lives in `/learn` and the integration's
  own docs surface.
- This is **not** the place to manage existing connections post-install
  (that lives in `/dashboard/connections`). Once a user finishes an
  install, the hub shows "Installed — manage" and links out.

---

## 2. Routes & component contract

### Public route — `/install`

- **Auth requirement:** none.
- **Behavior:** renders the full grid of integrations. Search, filter,
  and "Notify me" on coming-soon cards work without login. Clicking
  **Install** on any card triggers the registration gate (see §6).
- **SEO:** server-rendered. Each integration card emits structured data
  (`SoftwareApplication` JSON-LD). Page emits `CollectionPage` +
  `BreadcrumbList`. CRO9 embed and Living DOM marker present per
  Critical Rule #7.
- **Indexable:** yes. This is the adoption funnel — we want every
  integration query to land here.

### Authenticated route — `/dashboard/installs`

- **Auth requirement:** Supabase session (`getSession()`, never
  `getUser()` per Critical Rule #12).
- **Behavior:** renders the same grid, but with each user's per-integration
  status loaded from `user_installs`. The grid sorts: in-progress first,
  needs-setup second, available third, installed fourth, coming-soon last.
- **Mid-install resume:** if any integration has `status = 'in_progress'`,
  a top banner offers "Resume <name> install — step X of Y."
- **Indexable:** no. Marked `noindex` in metadata.

### Component contract

Both routes import and render `<InstallHub mode="public" | "dashboard" />`
from `app/(install)/_components/InstallHub.tsx`. The component:

1. Fetches the integration registry (server component, see §4).
2. If `mode === 'dashboard'`, fetches `user_installs` for the current user.
3. Renders the grid + filters + search.
4. Click handlers branch on `mode`:
   - `public` → redirect to `/signup?next=/dashboard/installs?install=<id>`
   - `dashboard` → open the walkthrough drawer for `<id>`

This satisfies the "same component, different behavior" requirement
without duplicating UI code.

---

## 3. Integration inventory

The complete catalog of installable integrations, grouped by category.
Each entry has: `id`, `name`, `category`, `status`, `description`,
`icon` (Lucide name), `walkthrough_id`.

### 3.1 AI Platforms

| ID | Name | Status | Description |
|---|---|---|---|
| `ai.chatgpt` | ChatGPT | Available | Custom GPT in the GPT Store — calls 0nmcp tools through the GPT Actions schema. |
| `ai.claude` | Claude | Available | MCP server via the `0nmcp` npm package — adds 1,640+ tools to Claude Desktop and Claude Code. |
| `ai.perplexity` | Perplexity | Coming soon | Integration via Perplexity's Spaces / custom-tool surface. |
| `ai.gemini` | Gemini | Coming soon | Integration via Gemini Extensions. |
| `ai.grok` | Grok | Coming soon | Integration via xAI's tool-use API. |

### 3.2 Browser Extensions

| ID | Name | Status | Description |
|---|---|---|---|
| `browser.chrome` | Chrome Extension | Available | 0n site manager — LinkedIn workflows, Fiverr generator, stack scanner, inline flows on any page. |
| `browser.firefox` | Firefox Extension | Coming soon | Manifest V2/V3 hybrid build of the Chrome extension. |
| `browser.edge` | Edge Extension | Coming soon | Microsoft Edge Add-on store distribution. |

### 3.3 CMS / Website Plugins

| ID | Name | Status | Description |
|---|---|---|---|
| `cms.wordpress` | WordPress Plugin (0nWP) | Available | AI content engine, Jaxx chat widget, SXO transforms, auto-publishing from `bot_settings`. |
| `cms.shopify` | Shopify App | Coming soon | Embedded admin app for product/page SXO + Jaxx chat. |

### 3.4 Workspace / Team Tools

| ID | Name | Status | Description |
|---|---|---|---|
| `team.slack` | Slack Bot (0n Bot) | Available | 8 slash commands, Jaxx AI in DMs, event ingestion to `slack_events`. |
| `team.telegram` | Telegram Bot | Available | DM Jaxx + group commands. |
| `team.discord` | Discord Bot | Coming soon | Slash commands + Jaxx threads. |

### 3.5 Productivity / Project Management

| ID | Name | Status | Description |
|---|---|---|---|
| `pm.ticktick` | TickTick | Available | Two-way sync of `tasks` table with TickTick lists. |
| `pm.clickup` | ClickUp | Available | OAuth-linked sync of spaces/lists/tasks. |
| `pm.monday` | Monday.com | Available | Board sync with column mapping configured in `bot_settings`. |
| `pm.whimsical` | Whimsical | Available (best-effort) | Mind-map / flowchart embedding via the Whimsical MCP. Limited by Whimsical API surface. |

### 3.6 CRM / Sales

| ID | Name | Status | Description |
|---|---|---|---|
| `crm.rocket` | ROCKET Marketplace | Available | Marketplace + agency app — installs Course Builder, 0nExec, and Canvas inside the CRM. |
| `crm.salesforce` | Salesforce | Coming soon | Managed package on AppExchange. |
| `crm.pipedrive` | Pipedrive | Coming soon | Marketplace app with OAuth + webhook triggers. |

> **Critical Rule #11.** The CRM card is labeled "ROCKET" / "CRM
> Marketplace" in all user-facing copy. Never "GHL", "HighLevel", or
> "Go High Level" — anywhere on this page or in walkthrough text.

### 3.7 Developer Tools

| ID | Name | Status | Description |
|---|---|---|---|
| `dev.npm` | npm package (`0nmcp`) | Available | `npm install -g 0nmcp` — full CLI + MCP server. |
| `dev.apikey` | API Key | Available | Generate a `0n_` token scoped to your account for direct REST calls. |
| `dev.cli` | CLI Tool | Available | Standalone `0nmcp` CLI — same package, alternate install paths (Homebrew, direct binary). |

### Status taxonomy

| Status | Card badge | Primary action |
|---|---|---|
| `available` | Green pill "Available" | **Install** button (or **Continue** if `in_progress`) |
| `coming_soon` | Amber pill "Coming soon" | **Notify me** button (email capture) |
| `installed` | Green check + "Installed" | **Manage** (links to `/dashboard/connections/<id>`) |
| `needs_setup` | Amber dot + "Needs setup" | **Finish setup** (resumes walkthrough at last step) |
| `error` | Red dot + "Action required" | **View error** (opens walkthrough at the failing step) |

Per-user statuses (`installed`, `needs_setup`, `error`, `in_progress`)
only render in `mode="dashboard"`. Public mode shows only the catalog
status (`available` / `coming_soon`).

---

## 4. Integration registry — source of truth

The registry lives at `lib/install/registry.ts` and exports a typed
`INTEGRATIONS` array. **No business logic lives in this file beyond
the catalog itself** — copy, descriptions, and per-step walkthrough
content are generated from `bot_settings` keys where they vary
per-tenant, per Critical Rule #1.

```ts
// lib/install/registry.ts
export type IntegrationCategory =
  | 'ai'
  | 'browser'
  | 'cms'
  | 'team'
  | 'pm'
  | 'crm'
  | 'dev';

export type IntegrationStatus = 'available' | 'coming_soon';

export interface Integration {
  id: string;                       // e.g. 'ai.claude'
  name: string;                     // 'Claude'
  category: IntegrationCategory;
  status: IntegrationStatus;
  description: string;              // one-line, SXO-compliant
  icon: LucideIconName;             // Lucide React icon name only
  walkthrough_id: string;           // FK to lib/install/walkthroughs/<id>.ts
  marketing_href?: string;          // optional outbound link to product page
  manage_href?: string;             // post-install management page
  search_terms: string[];           // synonyms for search index
}

export const INTEGRATIONS: Integration[] = [ /* … */ ];
```

### Walkthrough modules

Each walkthrough lives at `lib/install/walkthroughs/<walkthrough_id>.ts`
and exports a typed `Walkthrough`:

```ts
export interface WalkthroughStep {
  id: string;                       // stable, snake_case (Critical Rule #2)
  title: string;
  body_md: string;                  // markdown — rendered with our standard renderer
  copy_blocks?: { label: string; value: string }[];   // copy-to-clipboard pills
  screenshot?: string;              // /public path, optimized webp
  external_link?: { label: string; href: string };    // e.g. "Open Slack app dir"
  verify?: {                        // optional auto-verification
    kind: 'webhook' | 'api_check' | 'manual';
    endpoint?: string;              // for api_check
    success_message?: string;
  };
}

export interface Walkthrough {
  id: string;
  integration_id: string;
  estimated_minutes: number;
  prerequisites?: string[];          // e.g. 'admin access to your Slack workspace'
  steps: WalkthroughStep[];
}
```

A walkthrough is **fully data-driven**. The renderer in
`<WalkthroughDrawer />` accepts a `Walkthrough` and produces the UI —
no per-integration JSX.

### Adding a new integration

1. Add an `Integration` row to `INTEGRATIONS` in `registry.ts`.
2. Create `lib/install/walkthroughs/<walkthrough_id>.ts`.
3. (If "available") add API verification endpoint(s) referenced by
   `verify.endpoint`.
4. Push to `main`. Vercel deploys. Page picks it up automatically.

No grid changes. No new pages. No new components.

---

## 5. UI / design

### 5.1 Design tokens (Critical Rule #5)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0d1117` | Page background |
| `--card` | `#161b22` | Card surface |
| `--card-hover` | `#1c2128` | Card hover state |
| `--border` | `#30363d` | Card + filter borders |
| `--primary` | `#6EE05A` | Primary buttons, status checks, focus ring |
| `--text` | `#e6edf3` | Body text |
| `--text-muted` | `#7d8590` | Secondary text, category labels |
| `--amber` | `#d29922` | Coming-soon, needs-setup |
| `--red` | `#f85149` | Errors |

All applied via Tailwind utilities. **No inline `style={{}}`** per
Critical Rule #5. CSS vars set at `:root` in `app/globals.css`; no
shadcn overrides.

### 5.2 Layout

```
┌────────────────────────────────────────────────────────────────┐
│  /install   |   Search ▢▢▢▢▢▢▢▢▢▢▢▢▢▢▢   ⌘K               │
│                                                                │
│  Filters: [ All | AI | Browser | CMS | Team | PM | CRM | Dev ] │
│                                                                │
│  ┌──── Resume install banner (dashboard mode, conditional) ────┐│
│  │ Continue Slack Bot install — step 3 of 5    [ Resume → ]   ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ <Lucide>│  │ <Lucide>│  │ <Lucide>│  │ <Lucide>│           │
│  │ Claude  │  │ Chrome  │  │ Slack   │  │ ROCKET  │           │
│  │ AI      │  │ Browser │  │ Team    │  │ CRM     │           │
│  │ ● Avail │  │ ● Avail │  │ ✓ Inst. │  │ ⚠ Setup │           │
│  │ One-line│  │ One-line│  │ One-line│  │ One-line│           │
│  │ [Install│  │ [Install│  │ [Manage │  │ [Finish │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  …      │  │  …      │  │  …      │  │  …      │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└────────────────────────────────────────────────────────────────┘
```

- **Grid:** 1 column < 640px, 2 cols < 1024px, 3 cols < 1440px, 4 cols
  thereafter.
- **Card:** 280px wide × auto height, 24px padding, 12px radius, 1px
  `--border` outline, lifts to `--card-hover` on hover.
- **Icon:** Lucide React, 32px, `--primary` on hover.
- **Category badge:** uppercase 11px, `--text-muted`.
- **Status pill:** 12px text, color per §3 status taxonomy.
- **Description:** 14px, 2 lines max, ellipsis.
- **Primary button:** full-width, `--primary` background, black text,
  44px tall (touch target).

### 5.3 Filters & search

- **Filter chips** above the grid. Single-select (clicking another
  switches; clicking the active one resets to "All").
- **Search bar** filters by `name`, `description`, and `search_terms`.
  Debounced 150ms, client-side (registry is small enough — < 30 items).
- **Empty state** when filters yield zero results: Lucide `SearchX`
  icon + "No integrations match. Clear filters?" + reset link.
- **`⌘K` shortcut** focuses the search input (matches the deck command
  palette UX).

### 5.4 Walkthrough drawer

Right-side slide-in drawer (440px wide, full height). Header: integration
icon + name + close button. Body: vertically scrolling steps. Footer
sticky: progress bar + "Mark step complete" button.

```
┌──────────────────────────── Drawer ───────────┐
│  <Icon>  Slack Bot                       ×    │
│  ─────────────────────────────────────────────│
│  Estimated: 6 min                              │
│  Prerequisites: Admin access to your Slack ws  │
│  ─────────────────────────────────────────────│
│  ① Create the Slack app                       │
│      Body markdown rendered here…              │
│      [Copy: manifest.json]  [Open Slack →]    │
│      [ Mark complete ]                         │
│  ─────────────────────────────────────────────│
│  ② Install to workspace                       │
│      …                                         │
│  ─────────────────────────────────────────────│
│  ③ Add credentials in 0nCore                  │
│      …                                         │
│  ─────────────────────────────────────────────│
│  Sticky footer:                                │
│  [████████░░░░░░░░] 3 of 8        [ Close ]   │
└────────────────────────────────────────────────┘
```

- Each step has its own **Mark complete** checkbox. Checking it persists
  immediately to `user_installs` (debounced 500ms in case of rapid
  clicks).
- **Copy buttons** use the Web Clipboard API; show "Copied" toast for
  1.5s on success.
- **Verify (optional)** — when a step has `verify.kind === 'api_check'`,
  the Mark-complete button is replaced with **Verify**. Clicking it hits
  the endpoint; on 200 it auto-marks complete.
- **Markdown** rendered through the same renderer used in `/learn` —
  GFM, syntax-highlighted code blocks, inline copy buttons on `<pre>`.

### 5.5 Notify-me modal (coming-soon flow)

- Triggered by **Notify me** button on coming-soon cards.
- Modal contents: integration name, "We'll email you when this is ready",
  email input (prefilled if authenticated), submit button.
- Persists to `install_notify` (see §7.2). No throttling on submit (just
  `ON CONFLICT DO NOTHING` on `(email, integration_id)`).
- Confirmation toast: "You're on the list for <integration>."

---

## 6. Registration / auth flow

### 6.1 Public → registration → resume install

```
/install
   │
   │ click [Install] on Slack Bot card
   ▼
/signup?next=/dashboard/installs?install=team.slack
   │
   │ user creates account (or clicks "Sign in")
   ▼
Supabase email/password (or magic link) — confirms
   │
   ▼
/dashboard/installs?install=team.slack
   │
   │ component sees ?install param, opens drawer for team.slack
   ▼
Walkthrough drawer open at step 1, status = in_progress
```

The `?install=<id>` query param is the signal. The dashboard component
reads it on mount, opens the drawer, and silently strips the param from
the URL via `router.replace`.

### 6.2 Already-signed-in clicks Install on `/install`

If a Supabase session exists when a user is on `/install`, clicking
**Install** **bypasses signup** and immediately client-side navigates to
`/dashboard/installs?install=<id>`. This means we don't bounce loyal
users through the signup page.

### 6.3 Notify-me works without login

Coming-soon **Notify me** does not require auth. Captures email
directly. If the user later signs up with that email, we attach the
`install_notify` rows to their account by `email` match.

---

## 7. Database schema

App-specific migrations live in `supabase/migrations/`. The two new
tables below are created in a single migration:
`supabase/migrations/<timestamp>_unified_install_hub.sql`.

### 7.1 `user_installs`

Per-user, per-integration install state. **One row per (user, integration).**

```sql
create table public.user_installs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  integration_id text not null,                -- matches Integration.id
  status        text not null default 'not_started'
                check (status in (
                  'not_started','in_progress','installed','needs_setup','error'
                )),
  current_step  int  not null default 0,
  total_steps   int  not null default 0,
  config        jsonb not null default '{}'::jsonb,   -- per-platform settings
  last_error    text,                                  -- null unless status='error'
  installed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_id, integration_id)
);

create index user_installs_user_idx on public.user_installs(user_id);
create index user_installs_status_idx on public.user_installs(user_id, status);

-- updated_at trigger
create trigger user_installs_set_updated_at
  before update on public.user_installs
  for each row execute function public.set_updated_at();
```

**RLS**

```sql
alter table public.user_installs enable row level security;

create policy "user_installs_select_own"
  on public.user_installs for select
  using (auth.uid() = user_id);

create policy "user_installs_insert_own"
  on public.user_installs for insert
  with check (auth.uid() = user_id);

create policy "user_installs_update_own"
  on public.user_installs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_installs_delete_own"
  on public.user_installs for delete
  using (auth.uid() = user_id);
```

**`config` JSONB shape (per integration)**

The `config` column is a free-form JSONB store for per-platform settings
gathered during the walkthrough. Examples:

```jsonc
// ai.claude
{ "platform_path": "/Users/me/Library/.../claude_desktop_config.json" }

// team.slack
{ "team_id": "T0123ABCD", "channel_id": "C0FOOBAR", "bot_user_id": "U…" }

// crm.rocket
{ "location_id": "AeY8M0GNOuJPNkLQ7AAC", "company_id": "…",
  "scopes": ["contacts.write","conversations.write", "..."] }

// dev.apikey
{ "key_label": "Production CLI", "key_prefix": "0n_live_", "key_id": "…" }
```

The actual secret values **never** land in `config`. API keys, OAuth
tokens, refresh tokens, and webhook signing secrets all live in the
existing tables (`crm_installations`, `slack_installations`, etc.). The
`config` field stores only non-secret pointers and display metadata.

### 7.2 `install_notify`

Email captures for coming-soon integrations.

```sql
create table public.install_notify (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  integration_id  text not null,
  source          text not null default 'install_hub',
  user_id         uuid references auth.users(id) on delete set null,
  notified_at     timestamptz,
  created_at      timestamptz not null default now(),

  unique (email, integration_id)
);

create index install_notify_integration_idx
  on public.install_notify(integration_id) where notified_at is null;
```

**RLS**

```sql
alter table public.install_notify enable row level security;

-- Anyone (anon role) can insert their own row.
create policy "install_notify_insert_anyone"
  on public.install_notify for insert
  with check (true);

-- Only the owner (when authenticated) can read their own rows.
create policy "install_notify_select_own"
  on public.install_notify for select
  using (auth.uid() = user_id);
```

When an integration ships, a server function flips matching rows'
`notified_at`, fires off the launch email via Resend, and analytics fire
to CRO9.

---

## 8. API surface

All routes live under `app/api/installs/*`. **All action params and
event keys are `snake_case`** per Critical Rule #2.

### `GET /api/installs/registry`

Returns the public integration catalog. Server-rendered into
`/install` initial HTML; also called client-side after filter changes.

```jsonc
{ "integrations": [
  { "id":"ai.claude", "name":"Claude", "category":"ai",
    "status":"available", "description":"…", "icon":"Sparkles",
    "walkthrough_id":"walkthrough_ai_claude" }
]}
```

### `GET /api/installs/me`

**Auth required.** Returns the current user's `user_installs` rows
joined against the registry.

```jsonc
{ "installs": [
  { "integration_id":"team.slack", "status":"in_progress",
    "current_step":3, "total_steps":8, "updated_at":"…" }
]}
```

### `POST /api/installs/start`

**Auth required.** Body: `{ "integration_id": "team.slack" }`.
Inserts (or upserts) a row with `status='in_progress'`, `current_step=0`,
`total_steps=<from walkthrough>`. Returns the created row.

### `POST /api/installs/step_complete`

**Auth required.** Body:
```jsonc
{ "integration_id":"team.slack", "step_id":"create_slack_app" }
```
Increments `current_step`. If the step is the last one, sets
`status='installed'` and stamps `installed_at`. Emits CRO9 event
`install_step_completed`.

### `POST /api/installs/config_patch`

**Auth required.** Body:
```jsonc
{ "integration_id":"crm.rocket", "patch": { "location_id":"…" } }
```
Deep-merges `patch` into the row's `config` JSONB. Used by walkthroughs
that gather data mid-flow (location IDs, channel IDs, etc.).

### `POST /api/installs/notify_signup`

**No auth required.** Body:
```jsonc
{ "email":"foo@bar.com", "integration_id":"ai.gemini" }
```
Inserts into `install_notify`. Emits CRO9 event `install_notify_signup`.
Returns 200 even on duplicate (idempotent UX).

### `POST /api/installs/verify`

**Auth required.** Body:
```jsonc
{ "integration_id":"team.slack", "step_id":"verify_bot_in_channel" }
```
Triggers the step's `verify` block. For `api_check` kind, fetches the
endpoint server-side and checks for 200. On success: marks the step
complete (calls `step_complete` internally) and returns
`{ "verified": true }`.

### Error envelope

All routes return `{ ok: true, … }` on success and
`{ ok: false, error: { code, message } }` on failure with appropriate
HTTP status. No partial-success states.

---

## 9. CRO9 analytics events

Per Critical Rule #7, every interaction emits a CRO9 event. Snake-case
event names, Snake-case property keys.

| Event | When | Properties |
|---|---|---|
| `install_hub_viewed` | Page load | `mode` (public/dashboard), `category_filter`, `referrer` |
| `install_card_clicked` | Click on Install button | `integration_id`, `mode`, `auth_state` |
| `install_started` | `/start` returns 200 | `integration_id`, `total_steps` |
| `install_step_completed` | `/step_complete` 200 | `integration_id`, `step_id`, `step_index`, `total_steps` |
| `install_completed` | Final step | `integration_id`, `time_to_install_seconds` |
| `install_abandoned` | User closes drawer with `current_step` < `total_steps` | `integration_id`, `current_step`, `total_steps` |
| `install_resumed` | User reopens an `in_progress` install | `integration_id`, `gap_hours` |
| `install_notify_signup` | Coming-soon email captured | `integration_id`, `email_domain`, `auth_state` |
| `install_verify_failed` | `/verify` returns non-200 | `integration_id`, `step_id`, `error_code` |
| `install_search_performed` | Search query > 2 chars, debounced | `query_length`, `result_count` |
| `install_filter_changed` | Filter chip clicked | `category_filter` |

All events emit through the standard `cro9.track()` helper. Server-side
events (e.g. `install_step_completed` from `/step_complete`) emit via
`cro9.trackServer()` with the user's session id.

---

## 10. SEO / SXO requirements

`/install` is a public marketing surface. It must satisfy every item on
the **9-point SXO+CRO9 checklist** from `docs/SXO-CRO9-Master-Playbook.md`.

| Pillar | Implementation |
|---|---|
| **BLUF** | H1 + intro: "Install 0n on every tool you already use. One page, every integration." Above the fold. |
| **Living DOM** | `<meta name="cro9:living" content="1">` in `<head>` |
| **Table trap** | Compact integration matrix (name × category × status) inside the first viewport on desktop |
| **FAQ schema** | 5–7 Q&As ("Is it free?", "Do I need an account?", "Which AI platforms work?", "What's a walkthrough?", "Can I uninstall?") emitted as `FAQPage` JSON-LD |
| **HowTo schema** | One `HowTo` JSON-LD block per **available** integration, generated from its walkthrough steps |
| **Internal links** | Cross-links to `/learn`, `/turn-it-on`, `/products/*`, and the integration's own product page (when present) |
| **CRO9 embed** | 15KB async loader in `_app` layout |
| **UCP Live Strip** | Live-signal strip pulling from `/api/ucp/live` showing recent installs across the org |
| **`/llms.txt`** | Already present at site root; no change |

Target `/api/sxo-score` rating: **≥ 95**. Below 95 blocks deploy
(GitHub action gate).

### Per-card structured data

Each card emits `SoftwareApplication` JSON-LD inline so the integration
itself is a schema-recognized entity:

```jsonc
{ "@context":"https://schema.org",
  "@type":"SoftwareApplication",
  "name":"0nmcp for Claude",
  "applicationCategory":"DeveloperApplication",
  "operatingSystem":"Cross-platform",
  "offers":{ "@type":"Offer", "price":"0", "priceCurrency":"USD" },
  "url":"https://www.0ncore.com/install#ai.claude",
  "description":"…",
  "publisher":{ "@type":"Organization", "name":"RocketOpp LLC" } }
```

---

## 11. Migration / replacement plan

Replace four existing surfaces. Each redirects to the new hub.

| Old surface | New behavior |
|---|---|
| `onork-app/app/downloads/page.tsx` | 308 redirect → `/install` |
| `onork-app/app/dashboard/downloads/page.tsx` | 308 redirect → `/dashboard/installs` |
| `onork-app/app/platform/page.tsx` | 308 redirect → `/install` |
| `0nmcp-website/install/*` | 308 redirect → `https://www.0ncore.com/install` |

Redirects are configured in `next.config.js` `redirects()`:

```js
async redirects() {
  return [
    { source: '/downloads', destination: '/install', permanent: true },
    { source: '/downloads/:slug*', destination: '/install', permanent: true },
    { source: '/dashboard/downloads', destination: '/dashboard/installs', permanent: true },
    { source: '/platform', destination: '/install', permanent: true },
  ];
}
```

The 0nmcp-website redirect lives in that repo's own `next.config.js`.

### Linking inventory

Before merging, audit and update internal links to old paths. Likely
locations:

- Header / footer nav (`components/layout/*`)
- `/welcome` 6-card control panel — one card becomes "Install integrations"
- `/learn` cross-references
- Onboarding email templates (Supabase `auth.email_templates`)
- Marketing site CTAs on `0nmcp.com`
- `README.md` / `.github/README.md`
- Slack onboarding DM copy

A `grep -r '/downloads\|/platform\|0nmcp.com/install'` pass at PR time
catches stragglers.

---

## 12. Implementation plan

Single branch (`main`), pushed in logical commits. Each commit
auto-deploys via Vercel.

| # | Commit | What lands |
|---|---|---|
| 1 | `docs: unified install hub spec` | This file |
| 2 | `feat(install): db schema for user_installs + install_notify` | Migration + RLS policies |
| 3 | `feat(install): integration registry + walkthrough types` | `lib/install/registry.ts`, `lib/install/walkthroughs/types.ts`, all walkthrough modules |
| 4 | `feat(install): API routes` | `app/api/installs/*` (6 routes) |
| 5 | `feat(install): InstallHub + WalkthroughDrawer components` | `app/(install)/_components/*` |
| 6 | `feat(install): /install + /dashboard/installs pages` | Two thin route files importing the shared component |
| 7 | `feat(install): redirects + nav updates` | `next.config.js`, header card, footer link |
| 8 | `feat(install): SXO + JSON-LD + sxo-score validation` | Page metadata, FAQ block, HowTo emission, score check |

Each commit message uses imperative mood + scope prefix per repo convention.

---

## 13. Testing

### 13.1 Unit (vitest)

- `registry.test.ts` — every `Integration.walkthrough_id` resolves to a
  module file; every walkthrough's `integration_id` matches its parent.
- `walkthroughs.test.ts` — every step has unique snake_case `id`;
  `total_steps` math agrees with array length.
- `api/installs/step_complete.test.ts` — increments `current_step`;
  flips `status` to `installed` on the last step.

### 13.2 Integration (Playwright)

- **Public flow:** anonymous user clicks Install on `ai.claude` →
  redirected to `/signup?next=…` → completes signup → lands on
  `/dashboard/installs` with the Claude drawer open at step 1.
- **Coming-soon flow:** anonymous user clicks Notify me on `ai.gemini`
  → submits email → `install_notify` row exists in DB.
- **Resume flow:** signed-in user with an `in_progress` Slack install
  loads `/dashboard/installs` → resume banner visible → clicks Resume →
  drawer opens at the saved `current_step`.
- **Verify flow:** in the Slack walkthrough, the "Verify bot in channel"
  step's Verify button hits the mocked endpoint and auto-marks complete.

### 13.3 SXO/SEO

- `sxo-score` ≥ 95 (CI gate).
- Lighthouse: Performance ≥ 95, Accessibility ≥ 95, SEO = 100.
- All JSON-LD validates against `validator.schema.org`.

---

## 14. Open questions

1. **Who can install which integration?** Current spec assumes any
   authenticated user can attempt any available install. Do paid plans
   gate certain integrations (e.g. ROCKET, Salesforce)? — *Tentatively no
   gating at the install hub level; gating happens at API call time when
   the integration tries to use a paid feature.*
2. **Multi-workspace integrations.** A user can be in two Slack workspaces.
   Does each get its own `user_installs` row, or one row per integration
   per user? — *One row per (user, integration). The `config` JSONB holds
   an array of installations when multi-tenancy applies.*
3. **Uninstall flow.** Spec doesn't currently cover removing an integration
   from `/dashboard/installs`. Likely a small "Remove" button in the
   walkthrough drawer footer when `status='installed'` that calls a
   `DELETE /api/installs/me?integration_id=…` route. — *Add in a follow-up.*
4. **Bulk install.** No "Install all my recommended integrations" path
   exists today. CRO9 / Jaxx could surface recommendations later.
5. **Localization.** All copy is English-only. i18n not in scope.
6. **0nmcp.com mirror.** Should `0nmcp.com/install` render the same hub
   server-side, or simply redirect? Spec assumes redirect for now (single
   source of truth at `0ncore.com/install`).

---

## 15. Out of scope (explicitly)

- Marketplace billing flows. The hub points users **at** integrations;
  it does not handle subscription upgrades, plan selection, or Stripe
  checkout.
- Connection-management UI (rotating tokens, revoking access). Lives at
  `/dashboard/connections`.
- Per-integration deep telemetry (request volumes, error rates). Lives
  on each integration's manage page.
- Admin tools for editing the registry. The registry is code; admins
  edit it via PR-equivalent commits to `main`.

---

## Appendix A — File map

```
app/
├── install/page.tsx                       # public route (mode="public")
├── dashboard/installs/page.tsx            # auth route  (mode="dashboard")
├── (install)/_components/
│   ├── InstallHub.tsx                     # shared grid + filters + search
│   ├── IntegrationCard.tsx                # single card
│   ├── WalkthroughDrawer.tsx              # step-by-step drawer
│   ├── NotifyMeModal.tsx                  # coming-soon email capture
│   └── ResumeBanner.tsx                   # in-progress resume CTA
└── api/installs/
    ├── registry/route.ts                  # GET
    ├── me/route.ts                        # GET
    ├── start/route.ts                     # POST
    ├── step_complete/route.ts             # POST
    ├── config_patch/route.ts              # POST
    ├── notify_signup/route.ts             # POST
    └── verify/route.ts                    # POST

lib/install/
├── registry.ts                            # INTEGRATIONS array + types
├── walkthroughs/
│   ├── types.ts
│   ├── walkthrough_ai_claude.ts
│   ├── walkthrough_ai_chatgpt.ts
│   ├── walkthrough_browser_chrome.ts
│   ├── walkthrough_cms_wordpress.ts
│   ├── walkthrough_team_slack.ts
│   ├── walkthrough_team_telegram.ts
│   ├── walkthrough_pm_ticktick.ts
│   ├── walkthrough_pm_clickup.ts
│   ├── walkthrough_pm_monday.ts
│   ├── walkthrough_pm_whimsical.ts
│   ├── walkthrough_crm_rocket.ts
│   ├── walkthrough_dev_npm.ts
│   ├── walkthrough_dev_apikey.ts
│   └── walkthrough_dev_cli.ts
└── analytics.ts                           # cro9 event helper for installs

supabase/migrations/
└── <timestamp>_unified_install_hub.sql    # user_installs + install_notify
```

## Appendix B — Walkthrough example (`team.slack`)

```ts
// lib/install/walkthroughs/walkthrough_team_slack.ts
import type { Walkthrough } from './types';

export const walkthrough: Walkthrough = {
  id: 'walkthrough_team_slack',
  integration_id: 'team.slack',
  estimated_minutes: 6,
  prerequisites: ['Admin access to your Slack workspace'],
  steps: [
    {
      id: 'create_slack_app',
      title: 'Create the Slack app',
      body_md: 'Open the Slack API console and create a new app from a manifest.',
      copy_blocks: [{ label: 'manifest.json', value: '<paste the manifest>' }],
      external_link: { label: 'Open Slack API', href: 'https://api.slack.com/apps' },
    },
    {
      id: 'install_to_workspace',
      title: 'Install the app to your workspace',
      body_md: 'Click "Install to Workspace" and approve the requested scopes.',
    },
    {
      id: 'add_bot_token',
      title: 'Add your bot token to 0nCore',
      body_md: 'Copy the **Bot User OAuth Token** (starts with `xoxb-`) and paste it below.',
      // UI renders an input bound to config.bot_token (NOT stored — pushed to the secret table)
    },
    {
      id: 'verify_bot_in_channel',
      title: 'Verify the bot can post',
      body_md: 'We\'ll send a test message to your default Slack channel.',
      verify: {
        kind: 'api_check',
        endpoint: '/api/installs/verify-slack',
        success_message: 'Bot posted successfully',
      },
    },
    {
      id: 'enable_slash_commands',
      title: 'Enable the 8 slash commands',
      body_md: 'In the Slack app settings, enable each slash command listed below.',
    },
  ],
};
```

---

**End of spec.**
