# 0nCore Slack App — Complete Build Specification

> **Goal**: Make the 0nCore Slack app do EVERYTHING the 0nCore dashboard can do — CRM, analytics, automations, AI chat, workflows, billing, and more — all from inside Slack.
> **Workspace**: 0n (App ID: A0AQHLXC3FD)
> **Bot**: @0ncore
> **Slash Command**: /0n
> **Repo**: ~/Github/onork-app/

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    SLACK WORKSPACE                       │
│                                                         │
│  @0ncore bot        /0n command       App Home tab      │
│  (DMs + mentions)   (any channel)     (per-user dashboard) │
│       │                  │                  │            │
│       │     Slack Canvas (mini dashboard)   │            │
│       │     Interactive modals + buttons    │            │
│       └──────────────┬──────────────────────┘            │
└──────────────────────┼──────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                   0nCORE API LAYER                        │
│                                                          │
│  /api/webhooks/slack      — Events API (messages, mentions, app_home_opened) │
│  /api/slack/commands      — /0n slash command handler    │
│  /api/slack/interactive   — Button clicks, modal submits │
│  /api/slack/events        — CRM/Stripe event → Slack notifications │
│  /api/bridge/message      — AI orchestrator (1,554 tools)│
│                                                          │
│  lib/slack-blocks.ts      — Block Kit builder helpers    │
│  lib/slack-canvas.ts      — Canvas CRUD operations       │
│  lib/slack-home.ts        — App Home tab renderer        │
│  lib/channel-adapter.ts   — Slack ↔ 0nCore user linking  │
└──────────────────────────────────────────────────────────┘
```

---

## 1. Slack App Configuration (api.slack.com/apps/A0AQHLXC3FD)

### OAuth Scopes Required

**Bot Token Scopes:**
```
channels:read          — List channels
channels:history       — Read channel messages
chat:write             — Send messages
chat:write.public      — Post to channels bot isn't in
users:read             — List users
users:read.email       — Get user emails (for linking)
team:read              — Workspace info
groups:read            — Private channels
im:read                — DM access
im:write               — Send DMs
im:history             — Read DM history
files:read             — Read shared files
files:write            — Upload files
reactions:read         — Read reactions
reactions:write        — Add reactions
pins:read              — Read pinned items
pins:write             — Pin messages
bookmarks:read         — Channel bookmarks
bookmarks:write        — Manage bookmarks
canvases:read          — Read canvases
canvases:write         — Create/edit canvases
commands               — Slash commands
app_mentions:read      — Detect @mentions
```

**User Token Scopes:**
```
identity.basic         — User identity
identity.email         — User email
identity.avatar        — User avatar
```

### Event Subscriptions
```
URL: https://0ncore.com/api/webhooks/slack

Bot Events:
  app_home_opened      — User opens App Home tab
  app_mention          — Bot is @mentioned
  message.im           — DM to bot
  message.channels     — Message in public channel (for keyword triggers)
  member_joined_channel — User joins channel
  reaction_added       — Emoji reaction (for approval flows)
```

### Interactivity
```
Request URL: https://0ncore.com/api/slack/interactive
```

### Slash Commands
```
/0n  →  https://0ncore.com/api/slack/commands
```

---

## 2. App Home Tab (Dashboard in Slack)

**File**: `lib/slack-home.ts`

When a user opens the 0nCore bot in Slack, they see a personalized dashboard.

### What to show:

```
┌──────────────────────────────────────┐
│  0nCore                    Connected │
│  ─────────────────────────────────── │
│                                      │
│  📊 YOUR STATS                       │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ 247    │ │ 12     │ │ 3      │   │
│  │Contacts│ │Pipeline│ │Hot Lead│   │
│  └────────┘ └────────┘ └────────┘   │
│                                      │
│  🔥 CRO9 ANALYTICS                  │
│  Position: 14.2 ↑  CTR: 3.8%       │
│  Tasks: 8 pending  Clicks: 1,247   │
│  [View Full Report]                  │
│                                      │
│  ⚡ QUICK ACTIONS                    │
│  [New Contact] [Score Lead]          │
│  [Run Workflow] [Check Stripe]       │
│                                      │
│  📋 RECENT ACTIVITY                  │
│  • New lead: Sarah Chen (2m ago)    │
│  • Payment: $299 from Acme (1h)     │
│  • Blog published: "AI Tools" (3h)  │
│                                      │
│  🔗 CONNECTED ACCOUNTS              │
│  Google ✓  LinkedIn ✓  Slack ✓      │
│                                      │
│  ⚙️ [Settings] [Manage at 0ncore.com] │
└──────────────────────────────────────┘
```

### Implementation:

```typescript
// lib/slack-home.ts

export async function buildHomeView(userId: string, slackUserId: string): Promise<SlackView> {
  // 1. Resolve Slack user to 0nCore user via channel_sessions
  // 2. Fetch CRM stats, CRO9 data, recent activity, connections
  // 3. Build Block Kit view with sections, buttons, dividers
  // 4. Return the view payload

  return {
    type: 'home',
    blocks: [
      // Header
      headerBlock('0nCore Command Center'),
      divider(),

      // Stats row (3 columns using section with fields)
      statsSection(crmStats),

      // CRO9 Analytics
      cro9Section(cro9Data),

      // Quick action buttons
      actionsSection(),

      // Recent activity
      activitySection(recentActivity),

      // Connected accounts
      connectionsSection(connections),

      // Footer
      contextBlock('Powered by 0nMCP v4.5.0 · 1,554 tools · 96 services'),
    ],
  }
}
```

### Event handler in `/api/webhooks/slack`:
```typescript
if (event.type === 'app_home_opened') {
  const view = await buildHomeView(session.userId, event.user)
  await fetch('https://slack.com/api/views.publish', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: event.user, view }),
  })
}
```

---

## 3. Slack Canvas Integration (Mini Dashboard)

**File**: `lib/slack-canvas.ts`

Slack Canvases are rich documents inside Slack channels. We can create a live, updating dashboard canvas for each user/channel.

### Canvas API Endpoints:
```
POST   https://slack.com/api/canvases.create      — Create canvas
PATCH  https://slack.com/api/canvases.edit         — Update canvas content
DELETE https://slack.com/api/canvases.delete        — Delete canvas
GET    https://slack.com/api/canvases.access.list  — List who has access
POST   https://slack.com/api/canvases.access.set   — Set access permissions
POST   https://slack.com/api/canvases.sections.lookup — Get sections
```

### Canvas content format:
Canvases use **Slack Markdown** with rich elements. They support:
- Headers (h1, h2, h3)
- Bullet lists, numbered lists, checklists
- Code blocks
- Links
- Mentions (@user)
- Emoji
- Dividers

### What to build:

**`/0n dashboard` command** → Creates/updates a canvas with:

```markdown
# 0nCore Dashboard — {Business Name}
Updated: {timestamp}

## 📊 CRM Stats
| Metric | Value | Trend |
|--------|-------|-------|
| Contacts | 247 | ↑ 12 this week |
| Pipeline | $42,800 | ↑ 8% |
| Open Deals | 12 | 3 closing soon |
| Hot Leads | 3 | 🔥 Score > 80 |

## 🔍 CRO9 SEO Performance (28d)
| Metric | Value |
|--------|-------|
| Clicks | 1,247 |
| Impressions | 18,432 |
| Avg Position | 14.2 |
| CTR | 3.8% |

### Top Opportunities
- [ ] CTR_FIX: "ai automation tools" — position 8, CTR gap -42%
- [ ] POSITION_CLIMB: "mcp server setup" — position 14
- [ ] THIN_CONTENT: /blog/getting-started — 280 words

## 💰 Revenue (Stripe)
| Metric | Value |
|--------|-------|
| MRR | $4,280 |
| Active Subs | 23 |
| New This Month | 6 |

## ⚡ Active Automations
- ✅ Content Engine — runs daily, last: 2h ago
- ✅ Lead Nurture — active, 12 contacts enrolled
- ⏸️ Review Requester — paused

## 🔗 Quick Links
- [Full Dashboard](https://0ncore.com/dashboard)
- [CRO9 Engine](https://0ncore.com/dashboard/cro9-engine)
- [Automations](https://0ncore.com/dashboard/automations)
```

### Implementation:

```typescript
// lib/slack-canvas.ts

export async function createDashboardCanvas(
  channelId: string,
  userId: string,
  data: DashboardData,
): Promise<string> {
  const markdown = buildDashboardMarkdown(data)

  const res = await fetch('https://slack.com/api/canvases.create', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `0nCore Dashboard — ${data.businessName}`,
      document_content: { type: 'markdown', markdown },
    }),
  })

  const result = await res.json()
  return result.canvas_id
}

export async function updateDashboardCanvas(
  canvasId: string,
  data: DashboardData,
): Promise<void> {
  const markdown = buildDashboardMarkdown(data)

  await fetch('https://slack.com/api/canvases.edit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      canvas_id: canvasId,
      changes: [{
        operation: 'replace',
        document_content: { type: 'markdown', markdown },
      }],
    }),
  })
}
```

### Cron update:
Add to `/api/cron/addons` — every hour, update all active user canvases with fresh data.

---

## 4. Full /0n Command Capabilities

The `/0n` command already routes through the AI orchestrator. But these **local shortcuts** should be fast (no AI round-trip):

### CRM Commands (direct API, instant):
```
/0n contacts                    — List recent contacts
/0n contact {name}              — Look up contact by name
/0n create contact {name} {email} — Create new contact
/0n tag {name} {tag}            — Add tag to contact
/0n note {name} {note}          — Add note to contact
/0n pipeline                    — Show pipeline summary
/0n deals                       — List open opportunities
/0n move {deal} {stage}         — Move deal to stage
```

### Analytics Commands:
```
/0n analytics                   — CRO9 summary (position, CTR, clicks)
/0n seo {keyword}               — Check ranking for keyword
/0n tasks                       — List CRO9 tasks
/0n brief {task_id}             — Show content brief
```

### Communication:
```
/0n sms {name} {message}        — Send SMS via CRM
/0n email {name} {subject}      — Send email via CRM
/0n book {name} {time}          — Book appointment
```

### Billing:
```
/0n stripe                      — Revenue summary
/0n customers                   — List Stripe customers
/0n invoice {name} {amount}     — Create invoice
```

### Workflows:
```
/0n run {workflow_name}          — Execute a saved automation
/0n automations                  — List active automations
/0n pause {automation}           — Pause an automation
```

### System:
```
/0n status                      — System health
/0n dashboard                   — Create/update Slack Canvas dashboard
/0n connect                     — Link Slack to 0nCore account
/0n help                        — Show all commands
```

### AI (routes through bridge):
```
/0n {anything else}             — AI interprets and executes
```

---

## 5. Interactive Components

### Modals (views.open)

When a command needs user input, open a Slack modal:

**Contact Creation Modal:**
```
/0n new contact → Opens modal:
  [First Name    ] [Last Name     ]
  [Email         ] [Phone         ]
  [Company       ]
  [Tags          ] (multi-select)
  [Pipeline      ] (select)
  [         Create Contact         ]
```

**Workflow Builder Modal:**
```
/0n build → Opens modal:
  Describe your automation:
  [                              ]
  [                              ]
  [       Generate Workflow       ]
```

### Button Actions (already partially built):

Every message with actionable data should have buttons:
- Lead notification → [Score] [Call] [SMS] [Email] [Book]
- Payment received → [View Invoice] [Send Receipt]
- CRO9 task → [View Brief] [Mark Applied] [Skip]
- Automation suggestion → [Activate] [Edit] [Dismiss]

### Approval Flows (reaction-based):

```
Bot posts: "AI wants to send nurture email to 3 leads. ✅ to approve, ❌ to reject."
User reacts with ✅ → Bot executes the action
User reacts with ❌ → Bot cancels
```

Handle via `reaction_added` event.

---

## 6. Proactive Notifications (CRM → Slack)

### Already Built (`/api/slack/events`):
- `crm_contact_created` → Lead notification with action buttons
- `crm_appointment_booked` → Appointment confirmation
- `crm_opportunity_stage_changed` → Deal stage update
- `stripe_payment_received` → Payment notification
- `stripe_subscription_created` → New subscription alert

### Add These:
- `crm_form_submitted` → Form submission with contact details
- `crm_task_completed` → Task completion
- `crm_review_received` → Review notification
- `cro9_task_created` → New SEO opportunity detected
- `cro9_run_complete` → Daily CRO9 analysis summary
- `content_engine_published` → Blog/social post published
- `addon_execution_complete` → Any add-on finished running
- `hot_visitor_detected` → K-Analytics hot visitor alert
- `token_expiring` → OAuth token about to expire

---

## 7. Channel-Specific Features

### #leads channel:
- Auto-post every new CRM contact with score + action buttons
- Daily lead summary (top 5 hottest leads)

### #revenue channel:
- Auto-post every Stripe payment
- Weekly revenue summary canvas

### #seo channel:
- Daily CRO9 analysis results
- Position change alerts (moved up/down 5+ positions)
- New content brief notifications

### #general or #all-0n:
- System status updates
- New feature announcements
- Add-on activation confirmations

---

## 8. Files to Create/Modify

### New Files:
```
lib/slack-blocks.ts        — Block Kit builder helpers (header, section, actions, modal, etc.)
lib/slack-canvas.ts        — Canvas CRUD + dashboard markdown builder
lib/slack-home.ts          — App Home tab view builder
lib/slack-modals.ts        — Modal view builders (contact form, workflow builder, etc.)
lib/slack-notifications.ts — Proactive notification formatters
```

### Modify:
```
app/api/webhooks/slack/route.ts      — Add app_home_opened, reaction_added handlers
app/api/slack/commands/route.ts      — Add local shortcuts for CRM, analytics, billing
app/api/slack/interactive/route.ts   — Add modal submission + button action handlers
app/api/slack/events/route.ts        — Add CRO9, content engine, K-Analytics notifications
app/api/cron/addons/route.ts         — Add canvas update cycle
```

---

## 9. Database: Channel-Specific Storage

### Existing table: `channel_sessions`
Already links Slack users to 0nCore accounts.

### New columns/table needed:
```sql
-- Add to channel_sessions or create new table
ALTER TABLE channel_sessions ADD COLUMN IF NOT EXISTS
  canvas_id TEXT,              -- User's dashboard canvas ID
  home_tab_data JSONB,         -- Cached home tab data
  notification_prefs JSONB,    -- Which notifications user wants
  default_channel TEXT;        -- Where to post notifications
```

---

## 10. Env Vars (Already on Vercel)

```
SLACK_BOT_TOKEN          — xoxb-... (bot OAuth token)
SLACK_CLIENT_ID          — 10833698032195.10833711411523
SLACK_CLIENT_SECRET      — [encrypted on Vercel]
SLACK_SIGNING_SECRET     — [encrypted on Vercel]
SLACK_APP_ID             — A0AQHLXC3FD
SLACK_VERIFICATION_TOKEN — [encrypted on Vercel]
```

---

## 11. Build Order (Priority)

### Phase 1: Foundation (do first)
1. `lib/slack-blocks.ts` — Block Kit helpers
2. Update `/api/webhooks/slack` — Add `app_home_opened` handler
3. `lib/slack-home.ts` — Build App Home view
4. Update `/api/slack/interactive` — Handle button clicks + modal submissions

### Phase 2: Local Commands
5. Update `/api/slack/commands` — Add CRM shortcuts (contacts, pipeline, tag, note)
6. Add analytics shortcuts (CRO9 summary, tasks)
7. Add billing shortcuts (stripe, invoice)
8. Add modal openers (new contact form, workflow builder)

### Phase 3: Canvas Dashboard
9. `lib/slack-canvas.ts` — Canvas CRUD
10. `/0n dashboard` command → Create/update canvas
11. Cron job to auto-refresh canvases hourly

### Phase 4: Proactive Intelligence
12. `lib/slack-notifications.ts` — Notification formatters
13. Update event handlers for CRO9, K-Analytics, Content Engine
14. Reaction-based approval flows
15. Channel-specific auto-posting

### Phase 5: Advanced
16. `lib/slack-modals.ts` — Full modal builders
17. Workflow builder modal (describe → generate → activate)
18. File upload handling (import .0n files via Slack)
19. Thread-based conversation context (multi-turn AI in threads)

---

## 12. Key Principles

1. **Fast local, smart remote**: Known commands (contact lookup, pipeline, status) execute locally with direct API calls. Unknown/complex requests route through the AI orchestrator.

2. **Every message is actionable**: Never post a notification without buttons. "New lead Sarah Chen" always has [Score] [Call] [SMS] [Email].

3. **Canvas is the dashboard**: Users who live in Slack should never need to open 0ncore.com. The canvas IS their dashboard, updated hourly.

4. **App Home is the control panel**: Quick stats, quick actions, recent activity — all in the App Home tab.

5. **Threads for context**: AI conversations happen in threads. Each thread maintains context. Don't pollute channels with multi-turn conversations.

6. **Reactions for approvals**: Simple yes/no decisions use emoji reactions, not buttons. Faster for mobile users.

7. **User linking is critical**: Every feature depends on knowing which 0nCore account a Slack user maps to. The `connect 0n_TOKEN` flow or `/install/slack` OAuth flow must happen first.

---

## 13. Testing

```bash
# Test slash command locally
curl -X POST http://localhost:3000/api/slack/commands \
  -d "command=/0n&text=help&user_id=U123&response_url=https://httpbin.org/post"

# Test event webhook
curl -X POST http://localhost:3000/api/webhooks/slack \
  -H "Content-Type: application/json" \
  -d '{"type":"event_callback","event":{"type":"app_home_opened","user":"U123"}}'

# Test interactive payload
curl -X POST http://localhost:3000/api/slack/interactive \
  -d "payload={\"type\":\"block_actions\",\"actions\":[{\"action_id\":\"score_lead\",\"value\":\"contact_123\"}]}"
```

---

*This spec enables 0nCore to be a full Slack-native platform. Users never need to leave Slack — CRM, analytics, automations, AI, billing, and dashboards all live inside their workspace.*
