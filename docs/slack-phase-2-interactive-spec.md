# Slack Phase 2 — Interactive Workspace Spec

> Phase 1 shipped the plumbing: 8 slash commands, events handler, interactivity handler, Jaxx AI brain, token rotation, and OAuth. See [`slack-0nmcp-connection-spec.md`](./slack-0nmcp-connection-spec.md) for the foundation.
>
> Phase 2 turns the bot into a **full interactive workspace inside Slack** — App Home dashboard, modal flows for every quick action, and message + global shortcuts that wrap the entire 0nCore surface in Block Kit.

---

## GOAL

Make Slack the second screen of 0nCore. A user should be able to:

- Open the bot's App Home and see their personalized control panel without typing a command.
- Click any action and complete the full flow inside a modal (no browser bounce).
- Right-click any message to score it, save it as a lead, generate a reply, or create a CRM task.
- Use the Slack global shortcut menu (lightning bolt) to fire the most-used flows from any channel.

Phase 2 ships **zero new slash commands**. Everything runs through App Home + modals + shortcuts, all wired to the existing `/api/slack/events` and `/api/slack/interactivity` routes.

---

## APP HOME TAB (`views.publish`)

When a user opens the 0n bot in their Slack sidebar, they see a personalized dashboard. Published via `views.publish` on the `app_home_opened` event (already subscribed in Phase 1). Slack allows up to **100 blocks per view**.

### Layout (top → bottom)

| # | Section | Block types | Data source |
|---|---------|-------------|-------------|
| 1 | Welcome header | `header` + `context` (plan badge) | `profiles` (joined via `slack_user_links`) |
| 2 | Quick Actions row | `actions` with 4 buttons | static — buttons open modals 1–4 |
| 3 | Company Pulse | summary `section` + alert cards | `exec_columns` + related (only if 0nExec is configured) |
| 4 | Recent VPIS Scores | 3 `section` blocks + `actions` | `vpis_history` (last 3) |
| 5 | Connected Services | `section` with mrkdwn list | `crm_installations`, OAuth status flags on profile |
| 6 | Active Fiverr Gigs | up to 3 `section` cards + `actions` | `fiverr_templates` (active) |
| 7 | Recent Scans | up to 3 `section` cards + `actions` | `stack_scans` (last 3) |
| 8 | Settings | `actions` (single button) | opens Settings modal |

### Section detail

**1. Welcome header**

```
Welcome back, {first_name}
{plan_badge}  ·  Last active {relative_time}
divider
```

**2. Quick Actions row**

Single `actions` block, 4 buttons (left → right):

- `Score Text` → opens VPIS Scorer (Modal 1)
- `Scan URL` → opens Stack Scanner (Modal 2)
- `Search CRM` → opens CRM Search (Modal 3)
- `Generate Post` → opens Post Generator (Modal 4)

Each button uses `action_id` of the form `home_quick_<modal>` so the interactivity handler can route on action prefix.

**3. Company Pulse** (only renders if `exec_columns` has rows for this user)

```
Company Pulse
3 critical · 5 warning · 12 on track

[ critical card ] section block
  emoji + Department · {days} days in stage
  context: company · contact · $value · assigned to {name}
  actions: View | Reassign | Escalate

[ critical card 2 ]
[ critical card 3 ]
```

Show top 3 critical items max in App Home (full list lives in the `Company Pulse` global shortcut modal).

**4. Recent VPIS Scores**

For each of the last 3 scored items: a `section` block with score and a one-line excerpt, plus a single `actions` block at the end with `Score New` (opens Modal 1).

**5. Connected Services**

Single `section` block with mrkdwn list:

```
🟢 CRM     ·  🟢 Slack     ·  ⚪️ LinkedIn
🟢 Groq    ·  ⚪️ Analytics  ·  ⚪️ Fiverr
```

Green dot = connected, gray dot = not connected. Click on any row → the `Turn it 0n` flow for that service (deep link to `0ncore.com/welcome?connect=<slug>`).

**6. Active Fiverr Gigs**

If `fiverr_templates` has rows: show top 3 with `Generate New Gig` button. If none: hidden.

**7. Recent Scans**

If `stack_scans` has rows: show last 3 with domain, gap count, and `View Report` button per row. If none: hidden.

**8. Settings**

Single `actions` block with one button → opens Settings modal (Modal 6).

### Refresh strategy

- Re-publish the home view on every `app_home_opened` event.
- Cache the rendered view per user for **30 seconds** in memory (Vercel runtime KV is fine; falls back to no cache on cold start). Don't re-fetch DB + CRM data if opened within 30s.
- Force-refresh after any modal submit that changes home-tab state (new score, new scan, new gig, settings change).

### API wiring

Update `app/api/slack/events/route.ts`:

```ts
case 'app_home_opened':
  await publishHome(event.user, event.team_id);
  break;
```

New file `lib/slack/home.ts`:

```ts
export async function publishHome(slackUserId: string, teamId: string): Promise<void>
```

The function:

1. Resolves the Slack user → 0nCore profile via `slack_user_links`.
2. Loads home-tab data (profile, exec, vpis, scans, gigs, services).
3. Builds the view using `lib/slack/block-patterns.ts` helpers.
4. Calls `views.publish` with `user_id`, `view`, and the cached `bot_token` for the team.

---

## MODAL FLOWS (`views.open`, `views.update`, `views.push`)

Each Quick Action opens a modal. Modals use the **3-view stack** for multi-step flows: open → submit (update in place) → optional push (new view on top).

All modals share these conventions:

- `callback_id` of the form `modal_<name>_<step>` (e.g. `modal_scorer_input`, `modal_scorer_results`).
- `private_metadata` carries any state needed across steps as JSON.
- All long-running work (Groq, /api/scanner/analyze, CRM search) shows a loading view first, then `views.update` when done.
- Errors render as a `context` block in red mrkdwn at the top of the current view (no destructive actions on validation fail).

### Modal 1: VPIS Scorer

| Trigger | callback_id |
|---|---|
| `Score Text` button in App Home | `modal_scorer_input` |
| `/0nscore` invoked with no args | `modal_scorer_input` |

**View 1 — Input**

```
Title: Score with VPIS
Submit: Score
Cancel: Cancel

[plain_text_input multiline]   text  (required)
[static_select]                tone  (professional / casual / technical)
```

**On submit:** call Groq with VPIS prompt → `views.update` to View 2.

**View 2 — Results**

Uses the **Score Display Pattern** (see Block Kit Patterns below). Buttons in trailing `actions`:

- `Copy Text` → DMs the user the scored text
- `Post to LinkedIn` → pushes View 3
- `Score Another` → resets to View 1

**View 3 — Schedule (pushed)**

```
Title: Post to LinkedIn
Submit: Confirm

[radio_buttons]   when   (Now / Schedule for later)
[datetimepicker]  time   (only enabled if "Schedule for later")
```

On submit: enqueue post, close stack, post confirmation back to the channel where the modal was triggered (or DM the user if triggered from App Home).

### Modal 2: Stack Scanner

| Trigger | callback_id |
|---|---|
| `Scan URL` button | `modal_scanner_input` |
| `/0nscan` invoked with no args | `modal_scanner_input` |

**View 1 — Input:** single `plain_text_input` for URL + Submit.

**View 2 — Results:** detected stack list, gaps with severity, recommended services. Buttons:

- `Generate Fiverr Gig` → push View 3
- `Save as Lead` → push the same modal as the `save_as_lead` shortcut
- `Copy Report` → DMs the report

**View 3 — Generate Gig (pushed)**

```
[plain_text_input multiline]   description (pre-filled from gap analysis)
[static_select]                tone
[button]                       Generate
```

On submit: call Groq → close stack → DM the generated gig to the user with `Save to Templates` button.

### Modal 3: CRM Search

| Trigger | callback_id |
|---|---|
| `Search CRM` button | `modal_crm_input` |
| `/0ncrm search` with no args | `modal_crm_input` |

**View 1 — Input:** search input + filter (`contacts` / `opportunities` / `all`) + Submit.

**View 2 — Results:** list of cards using the **Card Pattern**. Each contact card has an `overflow` accessory with options:

- `View` → push View 3 with full contact detail
- `Edit` → push View 3 with editable fields
- `Add Note` → push View 3 with a note input
- `Create Task` → push View 3 with the task fields from the message-shortcut Create Task flow

### Modal 4: Post Generator

| Trigger | callback_id |
|---|---|
| `Generate Post` button | `modal_post_input` |
| `/0npost` with no topic | `modal_post_input` |

**View 1 — Input:**

```
[plain_text_input multiline]   topic
[static_select]                tone     (professional / casual / bold / educational)
[checkboxes]                   platform (LinkedIn / Twitter)  -- both can be selected
```

**View 2 — Results:** generated post + VPIS score (uses Score Display Pattern). Buttons:

- `Approve & Post` → confirm + post
- `Regenerate` → re-run with same inputs
- `Edit` → push View 3 with `rich_text_input` (Slack's WYSIWYG)

### Modal 5: 0nExec Quick Action

| Trigger | callback_id |
|---|---|
| Action button on any critical/warning card in App Home or Company Pulse | `modal_exec_action` |

`private_metadata` carries the card id.

**View 1 — Card detail + actions:**

```
Header: {company} — {department}
Section: contact, days in stage, value, assigned_to
Actions block:
  Reassign  (opens users_select)
  Escalate  (opens confirm dialog)
  Add Note  (focuses a plain_text_input multiline below)
  Move Stage (opens static_select with stage options)
  Snooze    (opens datetimepicker)
```

On submit: route to the right CRM call → `views.update` to a confirmation view → auto-close after 1.5s.

### Modal 6: Settings

| Trigger | callback_id |
|---|---|
| `Settings` button in App Home | `modal_settings` |

**View 1 — Form:**

```
[checkboxes] notifications:
  - Critical alerts
  - Daily digest
  - Fast completions

[radio_buttons] default_tone (professional / casual / technical / bold)

[section] Connected accounts (read-only status mirror of App Home section 5)
```

On submit: write to `slack_user_links.home_preferences` (see Database section) → close → re-publish App Home.

---

## MESSAGE SHORTCUTS (`message_action`)

Right-click context-menu actions on any message. All routed through the existing `/api/slack/interactivity` handler — payload `type: 'message_action'`.

| Callback ID | Label | Behavior |
|---|---|---|
| `vpis_score_message` | Score with VPIS | Opens Modal 1 with `text` pre-filled from `payload.message.text`. After scoring, posts the score as a thread reply on the original message. |
| `save_as_lead` | Save as Lead | Calls Groq to extract `name / email / phone / company` from the message text. Opens a modal with those fields pre-filled for review. On submit creates a CRM contact and replies in-thread: `Saved {name} as a new lead`. |
| `generate_reply` | Generate Reply | Calls Jaxx with `payload.message.text` as context. Opens a modal with the generated reply in a `rich_text_input` (editable). On submit, posts the reply as a thread reply on the original message. |
| `create_task` | Create Task | Opens a modal with `title` (first line of message), `description` (full message), `due_date` (datepicker), `assign_to` (users_select), `priority` (radio: low / medium / high / urgent). On submit creates a CRM task → replies in-thread with task link. |

---

## GLOBAL SHORTCUTS (`shortcut`)

Available from the lightning bolt menu anywhere in Slack. Payload `type: 'shortcut'`.

| Callback ID | Label | Behavior |
|---|---|---|
| `new_linkedin_post` | New LinkedIn Post | Opens Modal 4 (Post Generator) with platform pre-selected to LinkedIn. |
| `exec_pulse` | Company Pulse | Opens a modal showing the same Company Pulse list as App Home but expanded — all critical + warning items, each with the same action buttons as Modal 5. |
| `quick_score` | Quick Score | Opens Modal 1 (VPIS Scorer). |

---

## BLOCK KIT PATTERNS

Reusable block builders, all in `lib/slack/block-patterns.ts`. Every UI surface in Phase 2 should be assembled from these — never hand-roll blocks in route handlers.

### Card Pattern — `cardBlock({ title, body, accessory, meta })`

Used for any list item in App Home or modal results.

```
section ( text: *{title}*\n{body} , accessory: {accessory} )
context ( elements: meta.map(m => mrkdwn) )
divider
```

`accessory` is either an `overflow` menu or a single primary `button`.

### Score Display Pattern — `scoreBlock({ score, factors, patterns, actions })`

Used by VPIS Scorer results, Post Generator results, any score-bearing surface.

```
header  ( text: VPIS Score: {score}/100 )
section ( text: factors formatted as 8-line mrkdwn table )
section ( text: Patterns fired:\n• {pattern_1}\n• {pattern_2}... )
actions ( buttons from actions[] )
```

### Alert Card Pattern — `alertBlock({ severity, dept, daysInStage, company, contact, value, assignedTo, cardId })`

Used by 0nExec items in App Home and the Company Pulse modal.

```
section ( text: {severity_emoji} *{dept}* · {daysInStage} days in stage,
          accessory: overflow ( View / Reassign / Escalate ) )
context ( elements: company, contact, $value, assigned to {assignedTo} )
actions ( buttons: View | Reassign | Escalate, all carrying cardId in value )
divider
```

`severity_emoji`: 🔴 critical · 🟡 warning · 🟢 ontrack.

### Result Pattern — `resultBlock({ title, items, footerActions })`

Generic result list (used by CRM search, scan results, etc.).

```
header  ( text: title )
for each item:
  cardBlock(...)
actions ( footerActions )
```

---

## DATABASE

No new tables. Existing tables used:

| Table | Used by |
|---|---|
| `profiles` | App Home welcome header + Settings modal |
| `slack_user_links` | Slack ↔ 0nCore resolution + home preferences |
| `exec_columns` (and related `exec_*` tables) | Company Pulse + Modal 5 |
| `vpis_formula_weights` | VPIS scoring (existing) |
| `vpis_history` | App Home Recent VPIS Scores section |
| `stack_scans` | App Home Recent Scans + Scanner modal results |
| `fiverr_templates` | App Home Active Fiverr Gigs + gig generation |
| `crm_installations` | Connected Services section + CRM modal API auth |

### One column to add

```sql
ALTER TABLE slack_user_links
  ADD COLUMN IF NOT EXISTS home_preferences JSONB DEFAULT '{}';
```

Migration file: `supabase/migrations/<timestamp>_slack_home_preferences.sql`.

`home_preferences` shape:

```json
{
  "notifications": {
    "critical_alerts": true,
    "daily_digest": false,
    "fast_completions": true
  },
  "default_tone": "professional"
}
```

---

## NEW FILES

```
lib/slack/
├── block-patterns.ts    NEW — cardBlock, scoreBlock, alertBlock, resultBlock
├── home.ts              NEW — publishHome(), section builders, 30s cache
├── modals.ts            NEW — openScorerModal, openScannerModal, openCrmModal,
│                              openPostModal, openExecActionModal, openSettingsModal,
│                              plus update/push helpers per modal
└── shortcuts.ts         NEW — handleMessageShortcut, handleGlobalShortcut
```

### Existing files to update

- `app/api/slack/events/route.ts` — add `app_home_opened` → `publishHome`.
- `app/api/slack/interactivity/route.ts` — extend the type-router to handle `view_submission`, `block_actions`, `message_action`, `shortcut`. Existing button-click branch stays.
- `app/api/slack/commands/0nscore/route.ts` — when invoked with no args, open Modal 1 instead of the current help text.
- `app/api/slack/commands/0nscan/route.ts` — same, open Modal 2.
- `app/api/slack/commands/0ncrm/route.ts` — when called with `search` and no query, open Modal 3.
- `app/api/slack/commands/0npost/route.ts` — when called with no topic, open Modal 4.

---

## BUILD ORDER

### Phase 2A — App Home

1. `lib/slack/block-patterns.ts` — reusable block builders, unit-tested with snapshot output.
2. `lib/slack/home.ts` — `publishHome(slackUserId, teamId)` with all 8 sections and 30s cache.
3. Update `app/api/slack/events/route.ts` to handle `app_home_opened` → `publishHome`.
4. **Smoke test:** open the 0n bot in Slack → see personalized dashboard with all sections (or hidden sections if no data).

### Phase 2B — Modal Flows

5. `lib/slack/modals.ts` — all 6 modal openers + their update/push helpers.
6. Extend `app/api/slack/interactivity/route.ts`:
   - `view_submission` branch → route by `view.callback_id`
   - `block_actions` branch → route by `action_id` prefix
7. Wire App Home Quick Action buttons to modal openers.
8. Wire each `/0nscore`, `/0nscan`, `/0ncrm`, `/0npost` no-arg invocation to the corresponding modal opener.
9. **Smoke test:** click Score Text → modal opens → submit text → see Score Display → click Post to LinkedIn → schedule view → confirm → DM lands.

### Phase 2C — Shortcuts

10. `lib/slack/shortcuts.ts` — `handleMessageShortcut(payload)`, `handleGlobalShortcut(payload)`.
11. Extend `app/api/slack/interactivity/route.ts` with `message_action` and `shortcut` branches → delegate to shortcuts.ts.
12. Configure all 4 message shortcuts + 3 global shortcuts in the Slack app config (manual step, see below).
13. **Smoke test:** right-click a message → Score with VPIS → modal pre-filled → submit → score posts as thread reply.

### Phase 2D — Polish

14. **Loading states** — every modal that does async work renders a "Working..." view before `views.update`. Use a small spinner emoji + context block.
15. **Error handling** — wrap every external call (Groq, CRM, scanner) in try/catch; on error, render a context block at the top of the current view with a plain-language message and `Try Again` button.
16. **Rate limiting** — wrap `views.publish` in the existing token bucket keyed by `team_id`. Slack limits home tab publishes to ~1/sec per user.
17. **Home tab caching** — the 30s in-memory cache from step 2; invalidate on any modal submit that mutates state.

---

## SLACK APP CONFIG CHANGES (manual, after deploy)

Once the code is deployed:

1. **Interactivity & Shortcuts** → Request URL: confirm `https://www.0ncore.com/api/slack/interactivity` (already set in Phase 1).
2. **Add message shortcuts:**
   - `Score with VPIS` (callback_id `vpis_score_message`)
   - `Save as Lead` (callback_id `save_as_lead`)
   - `Generate Reply` (callback_id `generate_reply`)
   - `Create Task` (callback_id `create_task`)
3. **Add global shortcuts:**
   - `New LinkedIn Post` (callback_id `new_linkedin_post`)
   - `Company Pulse` (callback_id `exec_pulse`)
   - `Quick Score` (callback_id `quick_score`)
4. **App Home** → enable the Home Tab toggle. Disable Messages Tab if not used.
5. **Event Subscriptions** → confirm `app_home_opened` is in bot events (added in Phase 1).
6. Reinstall the app to the workspace so new shortcuts and Home Tab capability propagate.

---

## TESTING CHECKLIST

- [ ] App Home renders for a user with full data (profile, exec, vpis, scans, gigs).
- [ ] App Home renders for a user with **no data** — empty sections hide cleanly, Quick Actions still work.
- [ ] App Home cache prevents re-fetch within 30s.
- [ ] App Home re-publishes after any modal submit that changes state.
- [ ] All 6 modals open within 3 seconds (Slack `trigger_id` budget).
- [ ] Loading view shows while async work runs.
- [ ] Validation errors render in a context block, no destructive actions fire.
- [ ] All 4 message shortcuts work from a real channel message.
- [ ] All 3 global shortcuts work from the lightning bolt menu.
- [ ] `views.update` works mid-flow for every modal.
- [ ] `views.push` works for the modals that need a 3rd view.
- [ ] Settings persist to `slack_user_links.home_preferences` and re-render on next App Home open.
- [ ] Block Kit renders identically on Slack desktop, iOS, and Android.
- [ ] Rate limiter respects Slack 429 + `Retry-After`.

---

## COMMIT

```bash
cd ~/Github/onork-app
git add docs/slack-phase-2-interactive-spec.md
git commit -m "docs: Slack Phase 2 interactive spec — App Home, modals, shortcuts, Block Kit patterns"
git push origin main
```

---

## WHY THIS MATTERS

Phase 1 made the bot **callable**. Phase 2 makes it **usable** without ever typing a slash command.

A teammate opens the 0n bot in Slack and sees their pipeline pulse, last week's scores, recent scans, and four buttons that cover 80% of daily work. They right-click a customer email and turn it into a CRM contact in one modal. They hit the lightning bolt and generate a LinkedIn post from any channel. The Slack app stops being a way to *trigger* 0nCore and starts being a way to *use* 0nCore.

**Phase 1 was the API. Phase 2 is the UI.**

---

*0n Slack Phase 2 — App Home, modals, shortcuts, Block Kit.*
*0ncore.com | Built by RocketOpp LLC*
