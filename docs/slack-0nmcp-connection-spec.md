# Slack ↔ 0nMCP — Connection Spec

> The 0n Slack app: 8 slash commands that put the entire 0nMCP ecosystem inside Slack.

> Connect once, run anything: `/0nexec`, `/0nscore`, `/0npost`, `/0nscan`, `/0ncrm`, `/0ncourse`, `/0nmarket`, plus the master `/0n` dispatcher.

---

## OVERVIEW

The Slack integration is a thin wrapper that lets a workspace fire 0nMCP workflows, view 0nExec urgency data, run SXO scans, post content, and operate the CRM — all without leaving Slack.

**Architecture:**

```
Slack workspace
   │
   │  slash commands / shortcuts / events
   ▼
api.0ncore.com/api/slack/*       ← Vercel routes in onork-app
   │
   │  signed JWT, location context
   ▼
0nMCP HTTP server                ← orchestrator (1,640+ tools)
   │
   ├── CRM (245 tools)
   ├── 0nExec engine
   ├── Workflow runner (.0n files)
   └── 96 connected services
```

The Slack app authenticates the user via the workspace OAuth handshake, looks up the matching 0nCore account by email, and uses the cached PIT token to dispatch actions through 0nMCP.

---

## CREDENTIALS (App-level)

The Slack app already exists. Add these to Vercel env vars on `onork-app` (and any project that needs to push to Slack):

```bash
# Slack app credentials (REQUIRED, plain on Vercel)
SLACK_APP_ID=A0AQHLXC3FD
SLACK_APP_TOKEN=xapp-1-A0AQHLXC3FD-                # ...rotate-and-paste-from-1Password
SLACK_BOT_TOKEN=xoxb-10833698032195-                # ...rotate-and-paste-from-1Password
SLACK_INCOMING_WEBHOOK_URL=                         # https://hooks.slack.com/services/<team>/<channel>/<token> — paste from 1Password
SLACK_SIGNING_SECRET=                               # from Slack app config → Basic Information
SLACK_CLIENT_ID=                                    # from Slack app config → Basic Information
SLACK_CLIENT_SECRET=                                # from Slack app config → Basic Information
SLACK_VERIFICATION_TOKEN=                           # legacy — only if Events API uses it

# Default routing
SLACK_DEFAULT_TEAM_ID=T0AQHLJ0Y5R
SLACK_DEFAULT_CHANNEL_ID=                           # #ceo-alerts or #onmcp by default
SLACK_ADMIN_USER_ID=                                # Mike's Slack user id for DMs
```

> **PIT-rule reminder (CLAUDE.md rule #6):** all tokens above must be set as `type: plain` on Vercel. Double-encrypted tokens break HMAC verification.

---

## OAUTH SCOPES

When the user installs the app to a workspace, request these scopes:

### Bot scopes
- `commands` — for slash commands
- `chat:write` — post messages
- `chat:write.public` — post into channels the bot isn't a member of
- `incoming-webhook` — for the incoming webhook URL
- `users:read` — match Slack users to 0nCore accounts
- `users:read.email` — match by email (gated, must be approved by Slack)
- `channels:read` — list channels for routing
- `groups:read` — list private channels
- `im:write` — DM users with alerts
- `im:history` — read replies in DM threads
- `files:write` — upload generated artifacts (PDFs, screenshots)
- `links:read` + `links:write` — unfurl 0ncore.com links
- `app_mentions:read` — respond to @0nMCP

### User scopes
- `identity.basic` — for Sign in with Slack
- `identity.email` — match the installer to a 0nCore account

---

## EVENT SUBSCRIPTIONS

**Request URL:** `https://www.0ncore.com/api/slack/events`

Subscribe to:
- `app_mention` — `@0nMCP help`, `@0nMCP run X`
- `message.im` — DMs to the bot
- `message.channels` (optional, opt-in per workspace) — for in-channel triggers
- `app_home_opened` — render the App Home tab
- `link_shared` — unfurl `0ncore.com`, `0nmcp.com`, `marketplace.rocketclients.com` links
- `team_join` — auto-create 0nCore profile on workspace join (with consent)

Verification: the route must respond to Slack's `url_verification` challenge AND HMAC-verify every payload using `SLACK_SIGNING_SECRET` (timestamp must be within 5 minutes).

---

## INTERACTIVITY & SHORTCUTS

**Request URL:** `https://www.0ncore.com/api/slack/interactivity`

Handles:
- Block Kit button clicks from alerts
- Modal submissions (workflow setup, formula edits)
- Message shortcuts (e.g. *"Score this contact with 0nExec"*)
- Global shortcuts (e.g. *"Run a 0nMCP workflow"*)

### Global shortcuts to register
| Callback ID | Label | Description |
|-------------|-------|-------------|
| `run_workflow` | Run 0nMCP workflow | Open modal to pick a `.0n` workflow and run it |
| `view_exec` | Open 0nExec | DM the user a snapshot of their current dashboard |
| `score_url` | Score URL with SXO | Modal accepts URL → returns SXO report |
| `quick_post` | Generate post | Modal: prompt + tone → posts to a channel |

### Message shortcuts to register
| Callback ID | Label | Description |
|-------------|-------|-------------|
| `score_message` | Score this message | Run SXO/EQ scoring on linked URL or text |
| `crm_log` | Log to CRM | Save selected message as a CRM note attached to a contact |
| `make_card` | Send to 0nExec | Convert message into a 0nExec card |

---

## SLASH COMMANDS (8 total)

All commands have **Request URL:** `https://www.0ncore.com/api/slack/commands/<name>` (one route per command for clean routing & per-command rate limiting).

### `/0n` — Master dispatcher
Generic entry point. Subcommand-routed.

```
/0n help                          → list all commands
/0n status                        → ecosystem health (0nMCP, dispatch, supabase, vercel)
/0n run <workflow-slug> [params]  → run any .0n workflow
/0n connect <service>             → start "Turn it 0n" flow for a service
/0n whoami                        → show linked 0nCore account
```

Routes to `lib/slack/handlers/dispatcher.ts`.

### `/0nexec` — CEO Command Dashboard
```
/0nexec                           → DM snapshot of default layout
/0nexec layout <name>             → switch active layout
/0nexec critical                  → list cards in highest level only
/0nexec card <id>                 → show card detail with action buttons
/0nexec ack <alert-id>            → acknowledge an alert
/0nexec digest                    → trigger digest immediately
```

Routes to `lib/slack/handlers/exec.ts`. Uses the configurable engine from `0nexec-ceo-dashboard-spec.md`.

### `/0nscore` — SXO + EQ scoring
```
/0nscore <url>                    → run SXO audit, return summary in channel
/0nscore deep <url>               → full audit (longer, posts as thread)
/0nscore eq <text>                → emotional/EQ score on a piece of copy
/0nscore compare <url-a> <url-b>  → side-by-side ranking factors
```

Routes to `lib/slack/handlers/score.ts`.

### `/0npost` — Content engine
```
/0npost <topic>                   → generate post draft, ephemeral preview
/0npost blog <topic>              → long-form blog post → marketplace
/0npost social <topic>            → 4 platform variants (LinkedIn, X, Reddit, Dev.to)
/0npost schedule <when> <topic>   → queue for later
/0npost from-url <url>            → repurpose existing URL into new content
```

Routes to `lib/slack/handlers/post.ts`. Uses RocketPost.co content engine via 0nMCP.

### `/0nscan` — Site/asset scanner
```
/0nscan <url>                     → fast scan: title, schema, performance, broken links
/0nscan crawl <url>               → full crawl (queues, returns job id)
/0nscan job <id>                  → check status of crawl
/0nscan competitors <url>         → identify and scan top competitors
```

Routes to `lib/slack/handlers/scan.ts`.

### `/0ncrm` — CRM operations
```
/0ncrm find <query>               → search contacts/opportunities
/0ncrm contact <id>               → contact card with quick actions
/0ncrm note <id> <text>           → add note to contact/opportunity
/0ncrm move <opp-id> <stage>      → move opportunity to stage
/0ncrm assign <id> <user>         → assign contact/opp to team member
/0ncrm tag <id> <tag>             → add tag
```

Routes to `lib/slack/handlers/crm.ts`. Uses 245 CRM tools via 0nMCP.

### `/0ncourse` — Course Builder
```
/0ncourse list                    → user's courses
/0ncourse new <title>             → start a new course wizard (modal)
/0ncourse lesson <course-id>      → add a lesson via prompt
/0ncourse publish <course-id>     → publish to marketplace
/0ncourse enroll <course-id> <email> → manual enrollment
```

Routes to `lib/slack/handlers/course.ts`. Uses 0nMCP Course Builder (v4.10.0).

### `/0nmarket` — Marketplace operations
```
/0nmarket search <query>          → search marketplace listings
/0nmarket list                    → user's published listings
/0nmarket publish <workflow-slug> → publish a .0n workflow as a listing
/0nmarket revenue                 → show MTD revenue
/0nmarket buyers <listing-id>     → list recent buyers
```

Routes to `lib/slack/handlers/marketplace.ts`. Hits 0n Marketplace at marketplace.rocketclients.com.

---

## API ROUTES TO BUILD

In `onork-app`, under `app/api/slack/`:

```
app/api/slack/
├── events/route.ts                 ← POST: Events API (HMAC + url_verification)
├── interactivity/route.ts          ← POST: button clicks, modals, shortcuts
├── oauth/route.ts                  ← GET: OAuth install callback
├── oauth/install/route.ts          ← GET: kick off install (redirects to Slack)
├── commands/
│   ├── 0n/route.ts                 ← POST /0n
│   ├── 0nexec/route.ts             ← POST /0nexec
│   ├── 0nscore/route.ts            ← POST /0nscore
│   ├── 0npost/route.ts             ← POST /0npost
│   ├── 0nscan/route.ts             ← POST /0nscan
│   ├── 0ncrm/route.ts              ← POST /0ncrm
│   ├── 0ncourse/route.ts           ← POST /0ncourse
│   └── 0nmarket/route.ts           ← POST /0nmarket
├── home/route.ts                   ← POST: App Home view publish
└── webhook/route.ts                ← POST: outbound to incoming webhook
```

Shared library: `lib/slack/`

```
lib/slack/
├── verify.ts             ← HMAC verification, timestamp check
├── client.ts             ← Slack Web API wrapper (chat.postMessage, views.open, etc.)
├── auth.ts               ← link Slack user → 0nCore account
├── blocks.ts             ← Block Kit builders for cards, modals, alerts
├── responder.ts          ← in_channel / ephemeral / response_url helpers
└── handlers/
    ├── dispatcher.ts
    ├── exec.ts
    ├── score.ts
    ├── post.ts
    ├── scan.ts
    ├── crm.ts
    ├── course.ts
    └── marketplace.ts
```

---

## VERIFICATION PATTERN (every route)

Pseudocode for each command/event handler:

```ts
import { verifySlackRequest } from '@/lib/slack/verify';
import { resolveCallerToOnCoreUser } from '@/lib/slack/auth';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlackRequest(req, raw)) {
    return new Response('invalid signature', { status: 401 });
  }

  const params = new URLSearchParams(raw);
  const slackUserId = params.get('user_id')!;
  const teamId      = params.get('team_id')!;
  const text        = params.get('text') ?? '';
  const responseUrl = params.get('response_url')!;

  const user = await resolveCallerToOnCoreUser(slackUserId, teamId);
  if (!user) return slackEphemeral('Run /0n connect first to link your Slack to 0nCore.');

  // Slack expects a response in 3 seconds. Acknowledge, then do work async.
  ackImmediately();
  await runHandler({ user, text, responseUrl });
  return new Response('', { status: 200 });
}
```

The 3-second-ack rule is non-negotiable: ack the request immediately, then push results to `response_url` (or use `chat.postMessage` to the source channel).

---

## DATABASE TABLES (Supabase, project `pwujhhmlrtxjmjzyttwn`)

```sql
-- Workspace installs (one row per Slack workspace)
CREATE TABLE slack_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT UNIQUE NOT NULL,
  team_name TEXT,
  bot_user_id TEXT,
  bot_token TEXT NOT NULL,
  app_id TEXT,
  installed_by_email TEXT,
  installed_by_oncore_user UUID,
  default_channel_id TEXT,
  scopes TEXT[],
  installed_at TIMESTAMPTZ DEFAULT now(),
  uninstalled_at TIMESTAMPTZ
);

-- User identity links (Slack user ↔ 0nCore user)
CREATE TABLE slack_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slack_user_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  oncore_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(slack_user_id, team_id)
);

-- Command audit log (debugging + abuse prevention)
CREATE TABLE slack_command_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  oncore_user_id UUID,
  command TEXT NOT NULL,
  text TEXT,
  channel_id TEXT,
  response_status INTEGER,
  duration_ms INTEGER,
  fired_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_slack_workspaces ON slack_workspaces(team_id);
CREATE INDEX idx_slack_user_links ON slack_user_links(slack_user_id, team_id);
CREATE INDEX idx_slack_user_email ON slack_user_links(email);
CREATE INDEX idx_slack_cmd_log ON slack_command_log(team_id, fired_at DESC);
```

---

## APP HOME

Publish a personalized App Home tab when a user opens the app in Slack. Render with Block Kit. Sections:

1. **Linked account** — *Mike (mike@rocketopp.com) · 0nCore Pro plan*
2. **Quick actions** — buttons for `Open 0nExec`, `Run workflow`, `Score URL`, `Generate post`
3. **Top urgency** — first 3 cards from default 0nExec layout
4. **Recent activity** — last 5 commands run, with re-run buttons
5. **Help** — link to docs, list of all 8 commands

Refresh on `app_home_opened` and after every command run by that user.

---

## OUTBOUND POSTING (the webhook URL)

The `SLACK_INCOMING_WEBHOOK_URL` is a one-shot poster to a single channel — useful for cron-triggered alerts where we don't need the OAuth bot context.

Use the bot token (`SLACK_BOT_TOKEN`) for everything else: it can post to any channel the bot is in, send DMs, upload files, and open modals.

Wrapper: `lib/slack/client.ts` exposes `postToChannel(channel, blocks)`, `postToWebhook(blocks)`, `dm(userId, blocks)`, `openModal(triggerId, view)`, `uploadFile(channel, fileBuffer, filename)`.

---

## RATE LIMITS

Slack enforces ~1 message/sec per channel and Tier 3 limits on most Web API methods (~50/min). Wrap all outbound calls in a token bucket keyed by `team_id`. On 429, respect the `Retry-After` header.

For long workflows (`/0nscore deep`, `/0nscan crawl`), respond immediately with *"Working on it…"*, then post results in a thread when complete.

---

## INSTALL FLOW

1. User clicks **Add to Slack** on `0ncore.com/integrations/slack` → redirects to `/api/slack/oauth/install`
2. Route 302s to `https://slack.com/oauth/v2/authorize?client_id=...&scope=...&user_scope=...&redirect_uri=https://www.0ncore.com/api/slack/oauth`
3. Slack redirects back with `?code=...`
4. `/api/slack/oauth` exchanges the code for tokens via `oauth.v2.access`
5. Insert/update `slack_workspaces` row
6. Use `users.identity` to look up the installer's email → match to `0nCore user` → insert `slack_user_links`
7. Post a welcome message to the installer's DM with quick start buttons
8. Redirect the browser to `0ncore.com/welcome?slack=connected`

---

## TESTING CHECKLIST

- [ ] HMAC verification rejects forged requests (negative test)
- [ ] HMAC verification rejects stale requests (>5 min)
- [ ] Each slash command responds within 3 seconds
- [ ] Long workflows post follow-up via `response_url` or `chat.postMessage`
- [ ] OAuth install creates `slack_workspaces` + `slack_user_links` rows
- [ ] App Home renders with current user data
- [ ] Block Kit alerts from 0nExec render correctly with action buttons
- [ ] Button clicks route to `/api/slack/interactivity` and execute
- [ ] Modal submissions are validated and acknowledged
- [ ] Rate-limit guard on `/0nscore deep` and `/0nscan crawl`
- [ ] Uninstall sets `uninstalled_at` and revokes the bot token
- [ ] Link unfurls work on `0ncore.com` and `0nmcp.com` URLs

---

## BUILD ORDER

```
1. Supabase migration (slack_workspaces, slack_user_links, slack_command_log)
2. lib/slack/verify.ts — HMAC + timestamp check
3. lib/slack/client.ts — Slack Web API wrapper
4. /api/slack/oauth + /api/slack/oauth/install — install flow end-to-end
5. lib/slack/auth.ts — Slack user → 0nCore user resolver
6. /api/slack/commands/0n — master dispatcher (the simplest one)
7. /api/slack/events — events router with HMAC + url_verification
8. /api/slack/commands/0nexec — first real command (uses configurable engine)
9. lib/slack/blocks.ts — Block Kit builders for exec cards
10. /api/slack/interactivity — button + modal handler
11. Remaining 6 slash commands (0nscore, 0npost, 0nscan, 0ncrm, 0ncourse, 0nmarket)
12. /api/slack/home — App Home view
13. Outbound notification adapter (used by 0nExec rules with channel.type='slack')
14. Rate limiter + retry queue
15. Link unfurl handler in events route
16. End-to-end smoke test in a sandbox workspace
```

---

## COMMIT

```bash
cd ~/Github/onork-app
git add -A && git commit -m "slack: 0nMCP connection — 8 slash commands, OAuth, events, interactivity" && git push origin main
```

---

## WHY THIS MATTERS

Slack is where the team already lives. The 0n ecosystem is where the work gets done. Bridging them means: no context switch, no second login, no missed alerts.

`/0nexec critical` from your phone in a meeting → urgency snapshot in 2 seconds.
`/0npost from-url <competitor-blog>` after a strategy call → a draft repurpose by the time the call ends.
`/0ncrm move opp_xyz Negotiation` after closing → CRM updated without touching a browser.

**The Slack app isn't a feature. It's the second screen of 0nCore.**

---

*0n Slack — the ecosystem in 8 commands.*
*0ncore.com | Built by RocketOpp LLC*
