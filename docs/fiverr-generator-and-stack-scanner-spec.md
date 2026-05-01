# Fiverr Gig Generator + CRM Stack Scanner — Chrome Extension Spec

> **Status:** Draft
> **Owner:** Mike @ RocketOpp
> **Target surface:** `0n-extension` (Chrome MV3) + `onork-app` API routes
> **Depends on:** Brain registry (`lib/brain/registry.ts`), Groq client, Supabase canonical DB (`pwujhhmlrtxjmjzyttwn`)
> **Updated:** 2026-05-01

---

## 1. Overview

Two new Chrome extension capabilities, tightly coupled:

1. **Fiverr Gig Generator** — extends the existing **Compose** tab with a mode
   switcher. The generator produces a complete, paste-ready Fiverr gig as 10
   discrete sections, each with its own copy button so the user can drop each
   field into the corresponding Fiverr form input without re-formatting.

2. **CRM Stack Scanner** — content-script analysis of any visited website.
   Detects 40+ tools across 7 categories, computes a stack-gap score, and
   recommends services from the 0nMCP catalog. Scan output can feed the
   Fiverr generator with one click ("Generate Gig from this site") or
   become a CRM lead ("Save as Lead").

Both features speak to the same backend (`onork-app`), share the brain
registry, and reuse VPIS scoring conventions already in use across the
extension.

---

## 2. Fiverr Gig Generator

### 2.1 UI placement

The Compose tab grows a top-of-panel **mode switcher**:

```
[ LinkedIn ] [ Fiverr ] [ Email ] [ Custom ]
```

- LinkedIn = current behavior (post + comment outputs).
- Fiverr = this spec.
- Email = existing Gmail-friendly output.
- Custom = freeform brain prompt.

Mode is persisted per user in `chrome.storage.sync` under `compose.mode`.

### 2.2 Input form (Fiverr mode)

Single textarea + four selects:

- **Service description** (textarea, 200–2000 chars).
- **Category** (select, sourced from a small Fiverr taxonomy JSON shipped with the extension).
- **Subcategory** (select, dependent on category).
- **Delivery tier** (Basic / Standard / Premium pricing intent).
- **Tone** (Authoritative / Friendly / Technical / Bold).

A "Scan source" badge appears when the form was pre-filled by the Stack Scanner
(see §3.6). The badge links back to the scan record.

### 2.3 Output: 10 sections, each with its own Copy button

Each section renders as a card with:

- Section label
- Character count (`current / max`) with a red border if over limit
- Copy button (clipboard icon, copies just that section)
- Regenerate button (re-runs the brain on that section only)

| # | Section | Fiverr field | Char limit | Notes |
|---|---|---|---|---|
| 1 | **Title** | "I will…" gig title | 80 | Must start with "I will". Brain enforces. |
| 2 | **Category** | Category + Subcategory | — | Outputs `Category > Subcategory` strings exactly as Fiverr expects. |
| 3 | **Search tags** | Up to 5 tags | 20 chars/tag, lowercase, no punctuation | Output as 5 individual chips, each with its own micro-copy button. |
| 4 | **Description** | Long description | 1200 | Markdown stripped on copy; preserves line breaks. |
| 5 | **Basic package** | Name + description + delivery + revisions + price | Name 35, desc 100 | Structured object; copy button copies the full block in Fiverr's paste-friendly order. |
| 6 | **Standard package** | Same as Basic | Name 35, desc 100 | — |
| 7 | **Premium package** | Same as Basic | Name 35, desc 100 | — |
| 8 | **Buyer requirements** | 3–5 questions | 400 each | Output as numbered list with per-item copy buttons. |
| 9 | **FAQ** | 3–5 Q/A pairs | Q 100 / A 300 | Per-item copy buttons. |
| 10 | **Image prompt** | (for gig hero image) | — | Prompt suitable for Sora / Midjourney / DALL·E 3, plus a "Generate" button that calls `0nmcp:image:generate` (gated behind credits). |

### 2.4 Character-limit validation

Validation runs both client-side (live) and server-side (during generation):

- Client renders the count next to each section. Over-limit fields get a red
  border and disable the section's Copy button until the user trims/regens.
- Server (`/api/fiverr/generate`) re-validates and returns a `warnings[]`
  array if the model overshot. The client retries up to 2× with a tightened
  system prompt before surfacing the warning to the user.

Limits live in a single source of truth: `lib/fiverr/limits.ts`. Fiverr changes
these occasionally; the constant gets bumped when their UI does.

### 2.5 VPIS scoring integration

Each generated gig is scored on the existing **VPIS** rubric (Value, Pain,
Identity, Specificity). The scorer is the same surface registered in
`lib/brain/registry.ts` as `vpis_score`.

- Scores 0–100, displayed as four mini-bars under the title section.
- A composite score below 60 triggers an inline "Sharpen" button that
  re-prompts the brain with explicit VPIS guidance.
- Score is persisted with the saved template (§5.1) for analytics.

### 2.6 Save / load templates

A "Save as template" button next to the mode switcher stores the *input form
state plus output sections* into `fiverr_templates` (§5.1). Templates list
opens in a side drawer; clicking one rehydrates the entire compose surface.

---

## 3. CRM Stack Scanner

### 3.1 Surface

New extension tab labeled **Scan**. When the user clicks it on any tab, the
content script runs the detector against the active page and a sibling
network sniffer aggregates request hostnames captured during the last
30 seconds (via `chrome.webRequest`). Results stream into the panel as they
arrive — no full-page reload needed.

### 3.2 Detection — 40+ tools across 7 categories

Each detector is a tuple `{ id, name, category, signals[] }`. Signals are
ORed; a single hit registers the tool.

**a. Platform / CMS (8)**
- WordPress (`<meta name="generator" content="WordPress">`, `/wp-content/`, `wp-json` API)
- Wix (`X-Wix-*` headers, `static.wixstatic.com`, `_wixCIDX` cookie)
- Squarespace (`Squarespace.SQUARESPACE_CONTEXT`, `static1.squarespace.com`)
- Shopify (`Shopify.shop`, `cdn.shopify.com`, `x-shopify-stage`)
- Webflow (`data-wf-site`, `assets.website-files.com`)
- Framer (`__framer-badge`, `framerusercontent.com`)
- Next.js (`__NEXT_DATA__`, `_next/static/`)
- Custom / unknown (fallback)

**b. CRM (6)**
- **CRM (GHL)** — never display "GHL"; always render as **"CRM (Rocket)"**. Signals: `app.gohighlevel.com` iframes, `msgsndr.com`, `leadconnectorhq.com` requests, `<script src*="leadconnector">`, `lc_session` cookie.
- HubSpot (`js.hs-scripts.com`, `__hs_*` cookies, `_hsq` global)
- Salesforce Pardot / MCAE (`pi.pardot.com`, `pi_opt_in` cookie)
- ActiveCampaign (`trackcmp.net`, `vgo()` global)
- Zoho (`zohocdn.com`, `zsregistertracker`)
- Pipedrive (`pipedrive.com/leadbooster`)

**c. Analytics (7)**
- GA4 (`gtag('config','G-...')`, `googletagmanager.com/gtag/js?id=G-`)
- GTM (`googletagmanager.com/gtm.js`, `<noscript>` GTM iframe)
- Plausible (`plausible.io/js/script.js`)
- Fathom (`cdn.usefathom.com`)
- Mixpanel (`cdn.mxpnl.com`, `mixpanel` global)
- Amplitude (`cdn.amplitude.com`, `amplitude` global)
- PostHog (`app.posthog.com`, `posthog` global)

**d. Chat widgets (6)**
- Intercom (`widget.intercom.io`, `intercomSettings`)
- Drift (`js.driftt.com`)
- Tawk (`embed.tawk.to`)
- LiveChat (`cdn.livechatinc.com`)
- Crisp (`client.crisp.chat`)
- HubSpot Chat (already counted above; cross-link only)

**e. Email / marketing (6)**
- Mailchimp embed (`chimpstatic.com`, `list-manage.com`)
- Klaviyo (`static.klaviyo.com`, `_learnq`)
- ConvertKit (`f.convertkit.com`)
- Customer.io (`assets.customer.io`)
- Brevo / Sendinblue (`sibautomation.com`)
- Beehiiv embed (`beehiiv.com/embed`)

**f. Payments (5)**
- Stripe (`js.stripe.com`, `Stripe()` global)
- PayPal (`paypal.com/sdk/js`, `paypalobjects.com`)
- Square (`squareup.com`, `web.squarecdn.com`)
- Shopify Payments (inferred when Shopify + checkout subdomain)
- Apple Pay JS (`apple-pay-sdk`)

**g. Security / compliance (5)**
- Cloudflare (`cf-ray` response header, `cdnjs.cloudflare.com`)
- reCAPTCHA (`google.com/recaptcha`, `grecaptcha`)
- hCaptcha (`hcaptcha.com/1/api.js`)
- Cookiebot (`consent.cookiebot.com`)
- OneTrust (`cdn.cookielaw.org`, `optanon`)

Detector definitions live in `lib/scanner/detectors.ts`. Adding a tool = one
new entry; no detector code changes.

### 3.3 Output panel

Three stacked sections in the Scan tab:

1. **Detected** — list of every signal hit, grouped by category, with the
   matching evidence (signal type + matched string) on hover.
2. **Gaps** — categories where 0 tools were detected, plus categories where
   the detected tool is "weak" relative to the recommended service for that
   site type (rules in `lib/scanner/gap-rules.ts`).
3. **Recommendations** — a ranked list of 0nMCP services that would close the
   gap, each with a one-line "why" and a `Connect` button that deeplinks into
   `https://www.0ncore.com/turn-it-on/<service>` with the scan id as a query
   param.

### 3.4 Stack-gap score

A single 0–100 number summarizing the site's tool coverage:

```
score = 100 - (gaps * 8) - (weak_matches * 4) + (bonus_for_modern_stack * 2)
```

Capped at 0/100. Surfaced next to the URL header in the Scan tab. Used as a
sort key when listing leads in the dashboard.

### 3.5 "Save as Lead"

Button at the top of the Scan panel. On click:

- POSTs to `/api/scanner/save-lead` with the scan payload + the active CRM
  location id (read from the user's `0n-config`).
- Server creates a CRM contact via the existing CRM module
  (`crm/contacts.js → upsert_contact`), uses the site's contact email if found
  (regex sweep over the page text + `mailto:` hrefs), or falls back to a
  derived email like `lead+<domain>@onork.io` flagged `email_unverified=true`.
- Tags applied: `stack-scan`, plus one tag per detected gap
  (`gap:analytics`, `gap:crm`, etc.). Stack-gap score stored in custom field
  `stack_gap_score`.
- Returns `{ contactId, scanId }` and the panel collapses into a "Saved →
  open in CRM" success card.

### 3.6 "Generate Gig" — flow into Fiverr generator

Button next to "Save as Lead". On click:

- The extension switches to the Compose tab, mode = Fiverr.
- The form is pre-filled:
  - **Service description** = templated string built from gaps + top
    recommendation (e.g., "Set up GA4 + GTM + Klaviyo automation for a
    Shopify store currently running no analytics").
  - **Category** / **Subcategory** = inferred from the dominant gap
    (analytics → "Digital Marketing > Analytics & Tracking", etc.).
  - **Tone** = Authoritative.
- The "Scan source" badge points back to the scan record id.

This is the loop: scan → see gaps → spin up a Fiverr gig that sells the fix.

---

## 4. Brain registry surfaces

Both features must register in `lib/brain/registry.ts` and pass `truth-lint`:

- `fiverr_generate` — Groq-backed (per Hard Rule #1). Inputs: form state. Output: 10 sections + warnings.
- `fiverr_section_regenerate` — single-section mode for the per-card Regenerate button.
- `vpis_score` — already registered; reused.
- `scanner_recommend` — Groq-backed; turns detected stack + gaps into a
  ranked recommendation list with one-line rationales.

No Anthropic SDK, no OpenAI SDK in any prod path.

---

## 5. Database

Two new tables in the canonical 0nCore DB (`pwujhhmlrtxjmjzyttwn`). Migrations
live in `0n-dispatch/migrations/`, not in this repo (per CLAUDE.md).

### 5.1 `fiverr_templates`

```sql
create table fiverr_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  input_state jsonb not null,        -- form values
  sections jsonb not null,           -- 10 generated sections
  vpis_score jsonb,                  -- { v, p, i, s, composite }
  source_scan_id uuid references stack_scans(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on fiverr_templates(user_id, updated_at desc);
```

RLS: user can read/write only their own rows.

### 5.2 `stack_scans`

```sql
create table stack_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  hostname text not null,
  detected jsonb not null,           -- { platform: [...], crm: [...], ... }
  gaps text[] not null,
  recommendations jsonb not null,    -- [{ service_id, why, score }]
  stack_gap_score smallint not null,
  saved_lead_contact_id text,        -- CRM contact id, when saved
  created_at timestamptz default now()
);

create index on stack_scans(user_id, created_at desc);
create index on stack_scans(hostname);
```

RLS: user can read/write only their own rows.

---

## 6. API endpoints

All in `onork-app`, App Router, server-side Supabase client, brain registry
enforced.

### 6.1 `POST /api/fiverr/generate`

Request:
```ts
{
  description: string,
  category: string,
  subcategory: string,
  tier_intent: 'basic' | 'standard' | 'premium',
  tone: 'authoritative' | 'friendly' | 'technical' | 'bold',
  source_scan_id?: string
}
```

Response:
```ts
{
  sections: {
    title, category, tags, description,
    basic, standard, premium,
    requirements, faq, image_prompt
  },
  vpis: { v, p, i, s, composite },
  warnings: string[]
}
```

Behavior:
- Calls `fiverr_generate` brain surface (Groq).
- Validates char limits server-side; retries up to 2× if any section
  overshoots.
- Persists into `fiverr_templates` only when the client follows up with a
  "Save as template" call (separate `POST /api/fiverr/templates`).

### 6.2 `POST /api/scanner/analyze`

Request:
```ts
{
  url: string,
  hostname: string,
  detected: Record<string, DetectorHit[]>,  // already filled by content script
  network_hosts: string[]                    // captured by webRequest
}
```

Response:
```ts
{
  scanId: string,
  gaps: string[],
  recommendations: Array<{ service_id: string, why: string, score: number }>,
  stack_gap_score: number
}
```

Behavior:
- Server augments detection with host-based signals from `network_hosts`
  (catches tools whose JS loaded after the content script ran).
- Calls `scanner_recommend` brain surface for the rationales.
- Persists into `stack_scans`.

### 6.3 `POST /api/scanner/save-lead`

Request:
```ts
{ scanId: string, location_id?: string }
```

Response:
```ts
{ contactId: string, scanId: string, tags: string[] }
```

Behavior:
- Loads the scan, looks up the user's default CRM location if not provided.
- Calls `crm/contacts.js → upsert_contact` with derived fields, applies
  `stack-scan` + per-gap tags, sets `stack_gap_score` custom field.
- Patches `stack_scans.saved_lead_contact_id`.

---

## 7. Build order

### Phase 1 — Compose mode switcher + Fiverr scaffold (week 1)
- Add mode switcher to Compose tab, persist to `chrome.storage.sync`.
- Build the 10-section card layout with copy + regenerate buttons (mocked output).
- Ship `lib/fiverr/limits.ts` and live char-count validation.
- No backend yet; copy buttons work against canned content.

### Phase 2 — Fiverr generator backend (week 2)
- Register `fiverr_generate` and `fiverr_section_regenerate` in the brain registry.
- Ship `POST /api/fiverr/generate` with Groq-backed generation + char-limit retries.
- Wire VPIS scoring (reuse `vpis_score` surface).
- Add `fiverr_templates` table via dispatch migration; ship save/load drawer.
- Truth-lint passes on all new surfaces.

### Phase 3 — Stack Scanner core (week 3)
- New Scan tab in the extension.
- Ship `lib/scanner/detectors.ts` with all 40+ detectors.
- Content-script + `chrome.webRequest` aggregator with 30s window.
- Ship `POST /api/scanner/analyze`, `stack_scans` table, scoring formula.
- Register `scanner_recommend` brain surface.

### Phase 4 — Loop closure (week 4)
- "Save as Lead" → `POST /api/scanner/save-lead`, CRM upsert, tags, success card.
- "Generate Gig" handoff → Compose tab pre-fill + Scan source badge.
- Dashboard list of recent scans sorted by stack-gap score, with one-click
  re-open into the gig generator.
- Cleanup pass: analytics events, error toasts, telemetry on copy-button
  usage to learn which Fiverr fields users edit most after pasting.

---

## 8. Open questions

- Fiverr taxonomy refresh cadence — ship the JSON or fetch from a small
  `0nmcp.com` endpoint? Lean fetch with 24h cache.
- Image generation credits — reuse the marketplace metered price, or carve
  out a separate SKU for gig images? Default: reuse, gate behind a feature flag.
- Does the Stack Scanner respect `robots.txt`? It's all client-side on pages
  the user actively visits — no crawl, no concern. Documented for clarity.
