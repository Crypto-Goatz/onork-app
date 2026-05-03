# RocketOpp Admin — Chrome Extension

Internal admin tool for RocketOpp. Sits on top of the CRM dashboard
(app.rocketclients.com / any white-label) and gives Mike direct API access
to any sub-location he manages.

This is **not** a consumer product — it ships PIT tokens locally in
`chrome.storage` and is meant to be loaded unpacked.

## What it does

- Detects when you're on a CRM dashboard URL and reads the location ID
  from the path automatically.
- Lets you save a list of sub-locations (name + location ID + PIT token)
  and switch between them in one click.
- Provides direct API actions for the active location:
  - **Dashboard** — live tag/workflow counts + reachability ping
  - **Actions** — contact search, tag manager, custom field manager,
    trigger link manager, workflow list
  - **Campaigns** — runnable campaign templates (the Spa Ligonier Mother's
    Day campaign is shipped as the first one)
  - **Builder** — full template library (6 starter templates), live
    customizer with iframe preview, deploy to any funnel via the CRM
    Funnels API, and "Apply 0n Theme" to push the dark design tokens
    into the location's custom CSS. Templates can be exported / imported
    as JSON.
  - **Settings** — add / remove / test PIT tokens per location

Every API call uses the PIT token saved for that specific location.
Tokens never leave `chrome.storage.local`.

## Install (load unpacked)

```bash
cd rocket-extension
npm install
npm run build
```

Then in Chrome:

1. Open `chrome://extensions`
2. Toggle **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `rocket-extension/build/` folder

The extension icon will appear in the toolbar. Click it to open the popup.

## Develop

```bash
npm run dev      # Vite watch — rebuilds on save
npm run build    # one-shot production build
npm run typecheck
```

After `npm run dev` is running, just hit the reload button on the
extension card in `chrome://extensions` after each change to pick up the
new bundle.

## First-time setup

1. Open the extension popup.
2. Go to **Settings** (gear icon tab).
3. Add at least one location:
   - **Display name** — anything (e.g. "The Spa In Ligonier")
   - **Location ID** — auto-fills if you're on a CRM dashboard tab
   - **PIT token** — your `pit-…` token, **type:plain** (never encrypted)
4. Save. The first location you add becomes the active one.

To switch locations, use the dropdown in the top-right of the popup.

## URL detection

The content script runs on:

- `*.rocketclients.com`
- `*.leadconnectorhq.com`
- `*.gohighlevel.com`
- `app.180crm.com`

It looks for the location ID in three patterns and reports the first
match to the background service worker:

- `/v2/location/{LOCATION_ID}/...`
- `/location/{LOCATION_ID}/...`
- `?locationId={LOCATION_ID}` query param

The detected ID is stored as `detectedLocationId` in `chrome.storage`.
The popup uses this both to auto-switch the active location (if the
detected ID matches one of your saved locations) and to pre-fill the
"Add location" form (if it doesn't match anything saved yet).

## Architecture

```
manifest.json                 — MV3 manifest
src/
├── popup/                    — React popup (400x600 dark UI)
│   ├── App.tsx              — top-level shell + tab routing
│   ├── index.tsx            — React entry
│   ├── index.html           — popup shell
│   └── index.css            — Tailwind + 0n design tokens
├── components/              — feature components per section
│   ├── LocationSwitcher.tsx
│   ├── QuickActions.tsx
│   ├── ContactSearch.tsx
│   ├── TagManager.tsx
│   ├── CustomFieldManager.tsx
│   ├── TriggerLinkManager.tsx
│   ├── WorkflowList.tsx
│   ├── CampaignBuilder.tsx
│   ├── Settings.tsx
│   └── Toast.tsx
├── builder/                 — Builder tab: template library + deploy
│   ├── Builder.tsx          — grid + filters + import/export
│   ├── TemplateCard.tsx     — preview thumbnail card
│   ├── TemplateCustomizer.tsx — full-screen variable editor + iframe preview
│   └── ApplyThemeCard.tsx   — push 0n theme as customCss into the location
├── templates/               — template data
│   ├── library.ts           — 6 built-in templates as full HTML strings
│   ├── thumbnails.ts        — inline SVG thumbnails for each template
│   ├── store.ts             — chrome.storage wrapper for user templates
│   └── types.ts             — Template, TemplateVariable, renderTemplate()
├── styles/
│   └── design-tokens.ts     — single source of truth for colors/fonts/spacing
├── lib/
│   ├── crm-api.ts           — CRM API client (PIT-token bearer auth)
│   ├── storage.ts           — chrome.storage wrapper
│   ├── url-detector.ts      — location ID extraction
│   └── templates.ts         — built-in campaign templates (Campaigns tab)
├── background/
│   └── service-worker.ts    — listens to tab updates, syncs detected ID
└── content/
    └── detector.ts          — runs in CRM tabs, reports location ID
```

## Builder tab

The Builder tab ships **6 starter templates**, all styled with the 0n
design system (bg `#0d1117`, accent `#6EE05A`, Inter / JetBrains Mono):

| Template | Category | Use for |
|---|---|---|
| Mother's Day Gift Card | Campaign Pages | The Spa Ligonier seasonal push |
| Holiday Promotion | Campaign Pages | Generic 3-tier seasonal promo with countdown |
| Service Menu | Landing Pages | Clean service listing with prices + book CTAs |
| Lead Capture | Funnels | Two-column opt-in (copy + form) |
| Thank You / Confirmation | Thank You Pages | Post-purchase confirmation + upsell |
| Coming Soon | Landing Pages | Single-screen teaser with email capture |

### Deploy flow

1. Pick a template → click **Deploy**
2. Customize variables. Variables marked **AUTO** auto-fill from the
   active location's CRM record (business name, phone, address, email,
   website) on mount — you can still override.
3. Toggle **Edit / Preview** at the top to switch between the variable
   editor and a live iframe preview of the rendered HTML.
4. Pick a target funnel (loaded from `/funnels/funnel/list`) and a page
   name, then **Deploy to [Location]**. The page is created via
   `POST /funnels/page` with the rendered HTML.

### Apply 0n theme

The **Apply 0n Theme** card (top of the Builder tab) writes the full 0n
design-tokens stylesheet into the location's `customCss` field — every
CRM-built page in that location then inherits the dark theme.

### Import / Export

Each template card has an **Export** button (downloads
`{templateId}.template.json`). The header has an **Import** button that
accepts the same format. Imported templates override built-ins of the
same id and are stored under `userTemplates` in `chrome.storage.local`.
This is the foundation for the eventual `.0n` template format.

## Design system

The popup follows the **0n design system**
(`docs/0n-design-system.md` in the parent repo):

- Background `#0d1117`, cards `#161b22`, accent `#6EE05A`
- Lucide React icons only — no emoji as state/action icons
- Inter for UI, JetBrains Mono for IDs and tokens
- Tailwind utilities only — no inline `style={{}}`

## API

Uses `https://services.leadconnectorhq.com` with header
`Version: 2021-07-28`. Endpoints touched:

| Method | Path | Purpose |
|---|---|---|
| GET | `/locations/{id}` | Reachability + name/timezone |
| GET | `/contacts/?locationId={id}&query={q}` | Contact search |
| POST | `/contacts/` | Create contact |
| GET | `/locations/{id}/tags` | List tags |
| POST | `/locations/{id}/tags` | Create tag |
| DELETE | `/locations/{id}/tags/{tagId}` | Delete tag |
| GET | `/locations/{id}/customFields` | List custom fields |
| POST | `/locations/{id}/customFields` | Create custom field |
| GET | `/links/?locationId={id}` | List trigger links |
| POST | `/links/` | Create trigger link |
| GET | `/workflows/?locationId={id}` | List workflows |
| GET | `/funnels/funnel/list?locationId={id}` | List funnels (Builder) |
| POST | `/funnels/page` | Create funnel page from template (Builder) |
| PUT | `/locations/{id}` | Apply 0n theme via `customCss` field (Builder) |

## Notes

- This extension is **not** signed for the Chrome Web Store. It is
  load-unpacked-only by design — distributing PIT tokens through a public
  store would be a security disaster.
- All tokens stay in `chrome.storage.local` and never leave the browser
  except as `Authorization: Bearer …` to the CRM API.
- If you uninstall the extension, all saved locations and tokens are
  wiped along with `chrome.storage.local`.
