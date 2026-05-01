# 0n Chrome Extension — Redesign Spec

> For Claude Code. Rebuild the sidebar UI to match this exact design. 5 tabs, clean dark theme, 0n logo, mini flow builder, Jaxx input always visible.

**Repo:** 0nork/0n-extension (or wherever the canonical extension lives)
**Target:** Rebuild `src/sidebar/sidebar.html` + `src/sidebar/sidebar.css` + `src/sidebar/sidebar.js`

---

## DESIGN TOKENS

```css
:root {
  --bg: #0B0F19;
  --bg-card: #161b22;
  --bg-input: #161b22;
  --border: #1E2538;
  --green: #6EE05A;
  --green-bg: rgba(110, 224, 90, 0.15);
  --green-border: rgba(110, 224, 90, 0.3);
  --blue: #7dd3fc;
  --blue-bg: rgba(125, 211, 252, 0.15);
  --blue-border: rgba(125, 211, 252, 0.3);
  --amber: #fbbf24;
  --amber-bg: rgba(251, 191, 36, 0.15);
  --amber-border: rgba(251, 191, 36, 0.3);
  --purple: #c084fc;
  --purple-bg: rgba(192, 132, 252, 0.15);
  --purple-border: rgba(192, 132, 252, 0.3);
  --red: #f87171;
  --text: #E6F1FF;
  --text-dim: #484f58;
  --text-muted: #30363d;
  --radius: 10px;
  --radius-sm: 6px;
}
```

---

## LAYOUT STRUCTURE

```
┌──────────────────────────────────────┐
│ HEADER (56px fixed)                   │
│ [Logo] [0n] [PRO badge]    [● Connected] │
├──────────────────────────────────────┤
│ TAB BAR (44px fixed)                  │
│ [Home] [LinkedIn] [Compose] [Flows] [Settings] │
├──────────────────────────────────────┤
│                                      │
│ TAB CONTENT (scrollable)             │
│                                      │
│                                      │
│                                      │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ JAXX INPUT (56px fixed)              │
│ [💬 Ask Jaxx anything...]      [→]  │
├──────────────────────────────────────┤
│ FOOTER (24px fixed)                   │
│ 0n v2.0 · 0ncore.com · 96 services  │
└──────────────────────────────────────┘
```

Total sidebar width: 380px (Chrome side panel default)
Header, tab bar, Jaxx input, and footer are FIXED — content area scrolls.

---

## HEADER

```html
<div class="header">
  <div class="header-left">
    <svg class="logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" stroke="#6EE05A" stroke-width="2"/>
      <path d="M9 14C9 11.2 11.2 9 14 9C16.8 9 19 11.2 19 14C19 16.8 16.8 19 14 19" stroke="#6EE05A" stroke-width="2" stroke-linecap="round"/>
      <circle cx="14" cy="14" r="2" fill="#6EE05A"/>
    </svg>
    <span class="header-name">0n</span>
    <span class="header-badge" id="planBadge">PRO</span>
  </div>
  <div class="header-right">
    <div class="status-dot" id="statusDot"></div>
    <span class="status-text" id="statusText">Connected</span>
  </div>
</div>
```

```css
.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px; border-bottom: 1px solid var(--border);
  background: var(--bg); position: sticky; top: 0; z-index: 10;
}
.header-left { display: flex; align-items: center; gap: 8px; }
.header-name { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.3px; }
.header-badge {
  font-size: 10px; color: var(--text-dim); background: var(--bg-card);
  padding: 2px 8px; border-radius: 10px; font-weight: 600;
}
.header-right { display: flex; align-items: center; gap: 6px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); }
.status-dot.offline { background: var(--red); }
.status-text { font-size: 10px; color: var(--green); font-weight: 600; }
.status-text.offline { color: var(--red); }
```

The logo is the 0nCore mark: a circle with an open spiral path and a dot in the center. Pull the actual SVG from 0ncore.com if a better version exists — this is a close approximation.

---

## TAB BAR

5 tabs. Active tab has green underline + green icon + green text. Inactive has dim gray.

```html
<div class="tab-bar">
  <button class="tab active" data-tab="home">
    <svg><!-- Grid/Dashboard icon --></svg>
    <span>Home</span>
  </button>
  <button class="tab" data-tab="linkedin">
    <svg><!-- LinkedIn icon --></svg>
    <span>LinkedIn</span>
  </button>
  <button class="tab" data-tab="compose">
    <svg><!-- Pen/Edit icon --></svg>
    <span>Compose</span>
  </button>
  <button class="tab" data-tab="flows">
    <svg><!-- Activity/Workflow icon --></svg>
    <span>Flows</span>
  </button>
  <button class="tab" data-tab="settings">
    <svg><!-- Gear icon --></svg>
    <span>Settings</span>
  </button>
</div>
```

```css
.tab-bar {
  display: flex; border-bottom: 1px solid var(--border);
  background: #0D1220; position: sticky; top: 56px; z-index: 10;
}
.tab {
  flex: 1; padding: 10px 0; text-align: center;
  background: none; border: none; border-bottom: 2px solid transparent;
  cursor: pointer; transition: all 0.15s;
}
.tab svg { display: block; margin: 0 auto 3px; width: 18px; height: 18px; stroke: var(--text-dim); stroke-width: 2; fill: none; }
.tab span { font-size: 9px; font-weight: 600; color: var(--text-dim); }
.tab.active { border-bottom-color: var(--green); }
.tab.active svg { stroke: var(--green); }
.tab.active span { color: var(--green); }
.tab:hover:not(.active) svg { stroke: var(--text); }
.tab:hover:not(.active) span { color: var(--text); }
```

### Tab icons (Lucide-style SVG paths):

**Home (Grid):**
```svg
<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
```

**LinkedIn:**
```svg
<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/>
```

**Compose (Pen):**
```svg
<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>
```

**Flows (Activity):**
```svg
<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
```

**Settings (Gear):**
```svg
<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
```

---

## TAB 1: HOME

### Stats row (3 cards)

```html
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-num" style="color: var(--green);" id="statVPIS">87</div>
    <div class="stat-label">VPIS Avg</div>
  </div>
  <div class="stat-card">
    <div class="stat-num" style="color: var(--blue);" id="statPosts">12</div>
    <div class="stat-label">Posts</div>
  </div>
  <div class="stat-card">
    <div class="stat-num" style="color: var(--amber);" id="statLeads">34</div>
    <div class="stat-label">Leads</div>
  </div>
</div>
```

```css
.stats-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.stat-card { background: var(--bg-card); border-radius: var(--radius); padding: 10px; text-align: center; }
.stat-num { font-size: 20px; font-weight: 800; font-family: 'SF Mono', monospace; }
.stat-label { font-size: 9px; color: var(--text-dim); margin-top: 2px; }
```

### Quick actions (2x2 grid)

4 action cards:

| Card | Icon Color | Title | Subtitle | Action |
|------|-----------|-------|----------|--------|
| New post | green | New post | AI compose + VPIS | Opens Compose tab |
| Scrape profile | blue | Scrape profile | Extract + save lead | Triggers content script scraper |
| Score text | amber | Score text | VPIS 8-factor check | Opens inline VPIS scorer |
| Run flow | purple | Run flow | Mini workflow builder | Opens Flows tab |

```css
.actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
.action-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 12px; cursor: pointer;
  transition: border-color 0.15s;
}
.action-card:active { transform: scale(0.97); }
.action-card:hover { border-color: var(--green); }
.action-card svg { margin-bottom: 6px; }
.action-card .title { font-size: 12px; font-weight: 600; color: var(--text); }
.action-card .subtitle { font-size: 10px; color: var(--text-dim); }
```

### Active flow preview

Shows the most recently built/active mini workflow as inline pills with arrows:

```html
<div class="section-label">Active flow</div>
<div class="flow-preview">
  <div class="flow-pills">
    <span class="flow-pill green">Contacts</span>
    <svg class="flow-arrow"><!-- right arrow --></svg>
    <span class="flow-pill blue">Filter: VIP</span>
    <svg class="flow-arrow"><!-- right arrow --></svg>
    <span class="flow-pill amber">Email</span>
  </div>
  <div class="flow-meta">
    <span class="flow-count">23 contacts matched</span>
    <button class="flow-execute-btn">Execute</button>
  </div>
</div>
```

```css
.section-label {
  font-size: 10px; color: var(--text-dim); font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;
}
.flow-preview {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 12px;
}
.flow-pills { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
.flow-pill {
  padding: 4px 8px; border-radius: var(--radius-sm);
  font-size: 10px; font-weight: 600;
}
.flow-pill.green { background: var(--green-bg); border: 1px solid var(--green-border); color: var(--green); }
.flow-pill.blue { background: var(--blue-bg); border: 1px solid var(--blue-border); color: var(--blue); }
.flow-pill.amber { background: var(--amber-bg); border: 1px solid var(--amber-border); color: var(--amber); }
.flow-pill.purple { background: var(--purple-bg); border: 1px solid var(--purple-border); color: var(--purple); }
.flow-arrow { width: 14px; height: 14px; stroke: var(--text-muted); stroke-width: 2; fill: none; }
.flow-meta { display: flex; justify-content: space-between; align-items: center; }
.flow-count { font-size: 10px; color: var(--text-dim); }
.flow-execute-btn {
  background: var(--green); color: var(--bg); padding: 4px 12px;
  border-radius: var(--radius-sm); font-size: 10px; font-weight: 700;
  border: none; cursor: pointer;
}
.flow-execute-btn:active { transform: scale(0.95); }
```

---

## TAB 2: LINKEDIN

```
┌──────────────────────────────────────┐
│ [Scrape Profile] button (full width) │
├──────────────────────────────────────┤
│ Profile card (if scraped):           │
│ Name · Headline · Skills · Location  │
│ [Save Lead] [Compose For] [CRM Push] │
├──────────────────────────────────────┤
│ Section: Content Types (8 pills)     │
│ Post · Comment · DM · Connection     │
│ Reply · Article · Carousel · Poll    │
├──────────────────────────────────────┤
│ Section: My Leads (count)            │
│ Lead list (scrollable, compact)      │
│ [Export CSV] [Sync CRM]              │
├──────────────────────────────────────┤
│ Section: Feed Scanner                │
│ [Scan Feed] button                   │
│ Post cards with author + score       │
└──────────────────────────────────────┘
```

Keep existing LinkedIn functionality from the v4.0.1 extension but with the new visual style. Profile card, lead management, content type grid, feed scanner — all restyled with the new design tokens.

---

## TAB 3: COMPOSE

```
┌──────────────────────────────────────┐
│ Tone pills row:                      │
│ [Pro] [Casual] [Gap] [Elevate]       │
│ [Data] [Flip]                        │
├──────────────────────────────────────┤
│ Hook style row:                      │
│ [Declaration] [Bait&Flip]            │
│ [Specificity] [Authority]            │
├──────────────────────────────────────┤
│ Content type dropdown                │
│ [LinkedIn Post ▼]                    │
├──────────────────────────────────────┤
│ Prompt textarea                      │
│ "What do you want to write about..."│
├──────────────────────────────────────┤
│ [Generate — targets 85+ VPIS]        │
├──────────────────────────────────────┤
│ Output card (after generation):      │
│ Post text (editable)                │
│ VPIS: 87 ████████░░                  │
│ Patterns: P024, P011, P055...        │
│ [Insert] [Copy] [Regenerate] [Queue] │
└──────────────────────────────────────┘
```

Tone pills and hook style pills use the same `.flow-pill` styling but with a `.active` state that fills the background solid.

```css
.pill { /* same as flow-pill */ }
.pill.active { background: var(--green); color: var(--bg); border-color: var(--green); }
```

VPIS score display:
```css
.vpis-bar {
  height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; margin: 4px 0;
}
.vpis-fill {
  height: 100%; border-radius: 3px; transition: width 0.3s;
}
.vpis-fill.high { background: var(--green); }    /* 80+ */
.vpis-fill.mid { background: var(--amber); }     /* 60-79 */
.vpis-fill.low { background: var(--red); }        /* below 60 */
```

---

## TAB 4: FLOWS (Mini Workflow Builder)

This is the extension's version of the Canvas — simplified for the sidebar.

```
┌──────────────────────────────────────┐
│ Section: Build a flow                │
│                                      │
│ Available blocks (horizontal scroll):│
│ [Contacts] [Filter] [Email] [SMS]    │
│ [LinkedIn] [AI] [Delay] [Webhook]    │
│                                      │
│ Tap a block to add to flow ↓        │
├──────────────────────────────────────┤
│ Current flow:                        │
│                                      │
│ ┌─────────┐                         │
│ │Contacts │ ← tap to configure      │
│ │ 247     │                         │
│ └────┬────┘                         │
│      │                              │
│ ┌────▼────┐                         │
│ │Filter   │                         │
│ │ VIP     │                         │
│ └────┬────┘                         │
│      │                              │
│ ┌────▼────┐                         │
│ │Email    │                         │
│ │Template │                         │
│ └─────────┘                         │
│                                      │
│ [Execute Flow] [Clear] [Save]        │
├──────────────────────────────────────┤
│ Section: Saved flows                 │
│ Flow 1: "Email VIPs" (3 blocks)     │
│ Flow 2: "Score & Post" (2 blocks)   │
└──────────────────────────────────────┘
```

The flow builder is VERTICAL (top to bottom) because the sidebar is narrow. Blocks stack vertically with connector lines between them.

```css
.flow-builder { padding: 12px; }
.block-strip {
  display: flex; gap: 6px; overflow-x: auto; margin-bottom: 12px;
  padding-bottom: 4px;
}
.block-strip::-webkit-scrollbar { display: none; }
.block-chip {
  flex-shrink: 0; padding: 6px 12px; border-radius: var(--radius-sm);
  font-size: 11px; font-weight: 600; cursor: pointer;
  background: var(--bg-card); border: 1px solid var(--border); color: var(--text);
}
.block-chip:active { border-color: var(--green); }

.flow-stack { display: flex; flex-direction: column; align-items: center; gap: 0; }
.flow-block {
  width: 200px; background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 12px; cursor: pointer;
  transition: border-color 0.15s;
}
.flow-block:hover { border-color: var(--green); }
.flow-block.selected { border-color: var(--green); box-shadow: 0 0 0 1px var(--green); }
.flow-block .block-type { font-size: 10px; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.5px; }
.flow-block .block-value { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 2px; }
.flow-connector {
  width: 2px; height: 20px; background: var(--border); margin: 0 auto;
}
.flow-connector.active { background: var(--green); }
```

When a block is tapped, a config sheet slides up from the bottom (or replaces the block strip area) showing the configuration options for that block type — same concept as the Canvas block toolbar but adapted for mobile-width sidebar.

### Flow execution in the extension:

When "Execute Flow" is clicked:
1. Extension sends the flow definition to the background service worker
2. Service worker calls `POST https://0ncore.com/api/canvas/execute` with the flow
3. Each block updates its status (green check / red X / spinner)
4. Results display inline on each block
5. Connector lines animate green from top to bottom as data flows through

---

## TAB 5: SETTINGS

```
┌──────────────────────────────────────┐
│ Section: Account                     │
│ Mike Mento · mike@0ncore.com         │
│ Plan: Enterprise · Tier 5            │
│ Token: 0n_10baa...                   │
├──────────────────────────────────────┤
│ Section: AI Provider                 │
│ Groq (llama-3.3-70b) [Default]      │
├──────────────────────────────────────┤
│ Section: LinkedIn                    │
│ Posting days: Tue Wed Thu            │
│ Window: 8-10am EST                   │
│ Auto-post: [OFF toggle]             │
│ Brand voice: [Vibe ▼]               │
├──────────────────────────────────────┤
│ Section: Connected services          │
│ ✓ CRM  ✓ Stripe  ✓ Slack            │
│ ✗ WordPress  ✗ GitHub                │
│ [Connect more at 0ncore.com]         │
├──────────────────────────────────────┤
│ Section: Voice profile               │
│ Approved posts: 8                    │
│ Corrections: 3                       │
│ [View/Edit]                          │
├──────────────────────────────────────┤
│ [Sign Out]                           │
└──────────────────────────────────────┘
```

---

## JAXX INPUT (Fixed Bottom)

Always visible, every tab. The user can type anything from anywhere.

```html
<div class="jaxx-input">
  <svg class="jaxx-icon"><!-- Chat bubble icon --></svg>
  <input type="text" id="jaxxInput" placeholder="Ask Jaxx anything..." />
  <button class="jaxx-send" id="jaxxSend">
    <svg><!-- Send arrow --></svg>
  </button>
</div>
```

```css
.jaxx-input {
  position: sticky; bottom: 24px; /* above footer */
  margin: 16px; background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 10px 12px;
  display: flex; align-items: center; gap: 8px;
}
.jaxx-icon { width: 16px; height: 16px; stroke: var(--text-dim); stroke-width: 2; fill: none; flex-shrink: 0; }
.jaxx-input input {
  flex: 1; background: none; border: none; color: var(--text);
  font-size: 12px; outline: none; font-family: inherit;
}
.jaxx-input input::placeholder { color: var(--text-dim); }
.jaxx-send {
  width: 24px; height: 24px; border-radius: 50%; background: var(--green);
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.jaxx-send:active { transform: scale(0.9); }
.jaxx-send svg { width: 12px; height: 12px; fill: var(--bg); }
```

When the user types and hits Enter/send:
1. Message goes to background service worker
2. Service worker calls `POST https://0ncore.com/api/canvas/command`
3. Response shows as a toast notification or inline result
4. If the response includes an action (navigate, open tab, add flow block), execute it

---

## FOOTER

```html
<div class="footer">0n v2.0 · 0ncore.com · 96 services</div>
```

```css
.footer {
  padding: 8px 16px; border-top: 1px solid var(--border);
  text-align: center; font-size: 9px; color: var(--text-muted);
  position: sticky; bottom: 0; background: var(--bg);
}
```

---

## LOGIN SCREEN

Before auth, show a clean login with the 0n logo:

```
┌──────────────────────────────────────┐
│                                      │
│          [0n Logo - large]           │
│                                      │
│          0n                          │
│     AI Command Center                │
│                                      │
│   ┌────────────────────────────┐     │
│   │ 0n_ token                  │     │
│   └────────────────────────────┘     │
│                                      │
│   [Connect]                          │
│                                      │
│   Don't have an account?             │
│   Sign up at 0ncore.com/signup       │
│                                      │
└──────────────────────────────────────┘
```

Token-based auth. Paste `0n_` token → verify via `/api/auth/verify-token` → show the app.

Alternatively offer email/password login that calls `/api/auth/extension-login`.

---

## WHAT TO KEEP FROM EXISTING EXTENSION

The existing v4.0.1 extension (0nork/0n-extension) has working:
- Background service worker with 35+ message handlers
- Content script (LinkedIn scraper, FAB toolbar, text injection)
- 4 lib files (api.js, storage.js, council.js, tasks.js)
- Storage migration system (oc_* keys)

**KEEP all of those.** Only rebuild the sidebar UI (sidebar.html + sidebar.css + sidebar.js). The background and content scripts stay as-is. The sidebar.js gets rewritten to use the new 5-tab structure but still calls the same `send(action, payload)` function to communicate with the service worker.

---

## COMMIT

```bash
git add -A && git commit -m "Extension redesign: 5-tab sidebar, 0n logo, mini flow builder, Jaxx input, clean dark theme" && git push origin main
```
