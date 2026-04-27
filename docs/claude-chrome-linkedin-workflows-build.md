# Claude Chrome — Configure 0nLinkedIn Workflows in CRM

> Hand this file to a Claude Chrome (browser-driving) session. Mike installed the CRM marketplace app but the 6 LinkedIn workflows were not configured. Your job: log into the CRM, configure all custom values, custom fields, pipelines, and 6 workflows exactly as specified below, then verify with a test fire.

## Mission

The 0nLinkedIn product is a CRM SaaS snapshot. The structure is in place but the **per-step configuration** (webhook URLs, custom field bindings, conditional logic, Slack payloads) needs to be set in the CRM workflow editor for each of the 6 workflows.

## Login

1. Navigate to https://app.gohighlevel.com
2. Sign in as `mike@rocketopp.com`
3. Switch to the **0nCore** sub-location (Location ID: `nphConTwfHcVE1oA0uep`)
4. Confirm you're in: **Settings → Custom Values** appears in the left nav

## Spec source of truth

The full spec lives at `/Users/rocketopp/Downloads/social0n/0nlinkedin-ghl-complete/0nlinkedin-ghl-marketplace-spec.yaml` (1,046 lines). When in doubt, read the spec.

API endpoints all hit `https://0nmcp.com/api/linkedin-bot/*`. Authorization header on every webhook step is `Bearer {{custom_values.onlinkedin_api_key}}`.

---

## Phase 1 — Custom Values (15 fields)

**Path:** Settings → Custom Values → Add Custom Value

Create each with the exact key (case-sensitive). Set non-editable ones to read-only after save.

| Key | Default Value | Editable | Notes |
|---|---|---|---|
| `onlinkedin_api_endpoint` | `https://0nmcp.com/api/linkedin-bot` | ❌ no | Locked endpoint base |
| `onlinkedin_api_key` | _(blank — fill at onboarding)_ | ✅ yes | API key from 0nmcp.com |
| `linkedin_account_1_id` | _(blank)_ | ✅ yes | LinkedIn account ID after OAuth |
| `linkedin_company_page_id` | _(blank)_ | ✅ yes | Optional company page |
| `icp_description` | _(blank)_ | ✅ yes | Long text. Example: "Founders using 3+ AI tools that don't connect" |
| `value_prop` | _(blank)_ | ✅ yes | Long text. Example: "We connect 101 services to Claude through one MCP install" |
| `brand_voice` | `vibe` | ✅ yes | Dropdown: vibe / technical / authority / contrarian |
| `target_keywords` | _(blank)_ | ✅ yes | Comma-separated. Example: "mcp, claude, ai automation, workflow" |
| `auto_post_enabled` | `false` | ✅ yes | Boolean as string |
| `auto_comment_enabled` | `false` | ✅ yes | Boolean as string |
| `post_window_start` | `08:00` | ✅ yes | HH:MM 24h |
| `post_window_end` | `10:00` | ✅ yes | HH:MM 24h |
| `post_days` | `tuesday,wednesday,thursday` | ✅ yes | Comma-separated lowercase day names |
| `slack_webhook_url` | _(blank)_ | ✅ yes | Slack incoming webhook URL |
| `target_vpis_score` | `85` | ✅ yes | Number |
| `max_posts_per_day` | `1` | ✅ yes | Rate limit |
| `max_comments_per_day` | `8` | ✅ yes | Rate limit |
| `auto_approve_timeout_minutes` | `15` | ✅ yes | Minutes before auto-fire |

## Phase 2 — Custom Fields

**Path:** Settings → Custom Fields → Add Custom Field

### Contact Fields (7)

| Label | Key | Type |
|---|---|---|
| LinkedIn Profile URL | `linkedin_profile_url` | URL |
| LinkedIn Company Page URL | `linkedin_company_url` | URL |
| ICP Score | `icp_score` | Number |
| Last Comment Date | `last_comment_date` | Date |
| Author Reply Received | `author_reply_received` | Checkbox |
| DM Sent | `dm_sent` | Checkbox |
| Lead Source Post URL | `lead_source_post_url` | URL |

### Opportunity Fields (10)

| Label | Key | Type | Options (if dropdown) |
|---|---|---|---|
| VPIS Score | `vpis_score` | Number | — |
| Content Type | `content_type` | Dropdown | post, comment, article |
| Post Text | `post_text` | Large Text | — |
| Predicted Score | `predicted_vpis_score` | Number | — |
| Actual Score | `actual_vpis_score` | Number | — |
| GHL Post ID | `ghl_post_id` | Text | — |
| Scheduled For | `scheduled_for` | Date/Time | — |
| Status | `content_status` | Dropdown | pending_approval, approved, scheduled, posted, rejected |
| Patterns Fired | `patterns_fired` | Text | — |
| Hook Archetype | `hook_archetype` | Dropdown | absolute_declaration, bait_and_flip, specificity_spike, authority_contrast, confession_contrast |

## Phase 3 — Pipelines (2)

**Path:** Opportunities → Pipelines → Create Pipeline

### Pipeline 1: `0nLinkedIn Content Queue`
Stages in order:
1. Pending Approval
2. Approved
3. Scheduled
4. Posted
5. Rejected
6. Expired

### Pipeline 2: `0nLinkedIn Lead Pipeline`
Stages in order:
1. Commenter Identified
2. ICP Scored
3. Comment Sent
4. Author Replied
5. DM Sent
6. Conversation Active
7. Meeting Booked
8. Converted

---

## Phase 4 — Workflows (6)

**Path:** Automations → Workflows → Create Workflow

For every webhook step, set headers:
```
Authorization: Bearer {{custom_values.onlinkedin_api_key}}
Content-Type: application/json
```

### WF_001 — Daily Post Generator

- **Name:** `🚀 Daily Post Generator`
- **Trigger:** Scheduled — Daily at 6:00 AM (account timezone)
- **Active days:** Tuesday, Wednesday, Thursday (use a "Day of Week" condition at step 1)

**Steps:**

1. **If/Else** — `posts_today >= max_posts_per_day` → END workflow
2. **Webhook (POST)** → `{{custom_values.onlinkedin_api_endpoint}}/generate-post`
   - Body:
     ```json
     {
       "topic": "{{rotate_from_topic_list}}",
       "hook_archetype": "{{rotate_hook_archetype}}",
       "icp_context": "{{custom_values.icp_description}}",
       "value_prop": "{{custom_values.value_prop}}",
       "brand_voice": "{{custom_values.brand_voice}}",
       "target_keywords": "{{custom_values.target_keywords}}",
       "target_score": "{{custom_values.target_vpis_score}}"
     }
     ```
   - Response mapping:
     - `post_text` ← `response.post_text`
     - `vpis_score` ← `response.scores.adjusted_score`
     - `hook_score` ← `response.scores.hook`
     - `patterns_fired` ← `response.scores.patterns_fired`
     - `queue_id` ← `response.queue_id`
3. **Create Opportunity**
   - Pipeline: `0nLinkedIn Content Queue`
   - Stage: `Pending Approval`
   - Name: `Post — {{now | date: '%b %d'}} — VPIS {{vpis_score}}`
   - Custom fields: `post_text`, `vpis_score`, `content_type=post`, `content_status=pending_approval`, `patterns_fired`
4. **If/Else** — `custom_values.auto_post_enabled == 'true' AND vpis_score >= 85`
   - **If true** → step 5A
   - **If false** → step 5B
5. **A. Wait** `{{custom_values.auto_approve_timeout_minutes}}` minutes → step 6
   **B. Send Slack notification** → `{{custom_values.slack_webhook_url}}`
   - Slack blocks: header (`📝 LinkedIn Post — VPIS Score: {{vpis_score}}`), section (post preview, truncated 300), section (`Hook: {{hook_score}} | Patterns: {{patterns_fired}}`), actions (Approve/Edit/Reject buttons linking to `{{opportunity_url}}`)
6. **Webhook (POST)** → `{{custom_values.onlinkedin_api_endpoint}}/schedule-post`
   - Body: `queue_id`, `linkedin_account_id` (from custom values), `post_text`, `scheduled_time={{next_optimal_window}}`
7. **Update Opportunity** → stage `Scheduled`, fields `content_status=scheduled`, `ghl_post_id={{response.ghl_post_id}}`, `scheduled_for={{response.scheduled_time}}`

### WF_002 — Comment Sniper

- **Name:** `💬 Comment Sniper`
- **Trigger:** Inbound Webhook (capture URL — paste back to Mike when done)

**Steps:**

1. **If/Else** — `comments_today >= max_comments_per_day` → Send Slack "Daily limit reached" → END
2. **Webhook (POST)** → `{{onlinkedin_api_endpoint}}/score-post`
   - Body: `post_url`, `post_text`, `post_author` from trigger
   - Response mapping: `vpis_score`, `icp_score`, `timing_status`, `hook_archetype`
3. **If/Else** — `timing_status == 'TOO_OLD' OR vpis_score < 80` → END
4. **If/Else / Set variable** — Determine `product_mention`:
   - `icp_score >= 85` → `aggressive`
   - `icp_score >= 60` → `moderate`
   - else → `subtle`
5. **Webhook (POST)** → `{{onlinkedin_api_endpoint}}/generate-comment`
   - Body: `target_post_url`, `target_post_text`, `target_post_author`, `icp_score`, `product_mention`, `icp_context`, `value_prop`
   - Response mapping: `comment_text`, `comment_score`
6. **Create Opportunity** → Pipeline `0nLinkedIn Content Queue`, stage `Pending Approval`
   - Name: `Comment — {{trigger.post_author}} — VPIS {{vpis_score}}`
   - Custom fields: `post_text=comment_text`, `vpis_score=comment_score`, `content_type=comment`, `content_status=pending_approval`, `lead_source_post_url=trigger.post_url`, `icp_score`
7. **Send Slack notification** with target context, comment preview, Approve/Edit buttons
8. **If** `custom_values.auto_comment_enabled == 'true' AND comment_score >= 85` → Wait `auto_approve_timeout_minutes` → Trigger WF_003

### WF_003 — Content Publisher

- **Name:** `📤 Content Publisher`
- **Trigger:** Opportunity stage changed to `Approved` (in pipeline `0nLinkedIn Content Queue`)

**Steps:**

1. **Get Opportunity Data** — fields: `post_text`, `content_type`, `ghl_post_id`, `scheduled_for`, `lead_source_post_url`
2. **If/Else** — `content_type == 'post'`
   - **If post:**
     - Social Planner → Schedule Post
       - Account: `{{custom_values.linkedin_account_1_id}}`
       - Content: `{{post_text}}`
       - Schedule: `{{scheduled_for}}`
       - Platform: LinkedIn
     - Wait 60 seconds
     - Social Planner → Add First Comment with `{{first_comment_text}}` to `{{ghl_post_id}}`
   - **If comment:**
     - Webhook (POST) → `{{onlinkedin_api_endpoint}}/post-comment`
       - Body: `target_post_url`, `comment_text=post_text`, `linkedin_account_id`
3. **Update Opportunity** → stage `Posted`, fields `content_status=posted`, `scheduled_for=now`
4. **Wait 24 hours** → trigger WF_004

### WF_004 — Engagement Tracker

- **Name:** `📊 Engagement Tracker`
- **Trigger:** Opportunity stage = `Posted` AND 24 hours elapsed

**Steps:**

1. **Webhook (GET)** → `{{onlinkedin_api_endpoint}}/get-engagement`
   - Params: `ghl_post_id`, `linkedin_account_id`
   - Response mapping: `likes`, `comments`, `shares`, `impressions`
2. **Calculate** — `actual_vpis_score = MIN(100, (likes + comments*3 + shares*2) / MAX(1, impressions) * 1000)`
3. **Calculate** — `score_delta = predicted_vpis_score - actual_vpis_score`
4. **Update Opportunity** → field `actual_vpis_score`
5. **Webhook (POST)** → `{{onlinkedin_api_endpoint}}/feedback`
   - Body: `queue_id`, `predicted_score`, `actual_score`, `score_delta`, engagement counts, `patterns_fired`, `hook_archetype`
6. **Send Slack notification** if `actual_vpis_score >= 85` (high performer) OR `< 70` (below target)

### WF_005 — Reply → DM Pipeline

- **Name:** `🤝 Reply → DM Pipeline`
- **Trigger:** Inbound Webhook — author replied to comment (capture URL)

**Steps:**

1. **Find Opportunity** — search by `lead_source_post_url`
2. **Update Opportunity** field `author_reply_received = true`
3. **Webhook (POST)** → `{{onlinkedin_api_endpoint}}/generate-dm`
   - Body: `author_name`, `author_title`, `original_comment` (from opp), `author_reply` (from trigger), `post_url`, `icp_context`
   - Response mapping: `dm_text`
4. **Create Note on Opportunity:**
   ```
   Author replied! Suggested DM:
   {{dm_text}}
   Send via LinkedIn manually — DO NOT auto-send DMs.
   ```
5. **Send Slack notification** with reply text + suggested DM

### WF_006 — Weekly Intelligence Report

- **Name:** `🧠 Weekly Intelligence Report`
- **Trigger:** Scheduled — Every Monday at 7:00 AM

**Steps:**

1. **Webhook (GET)** → `{{onlinkedin_api_endpoint}}/weekly-report`
   - Params: `account_id={{custom_values.linkedin_account_1_id}}`, `week_ending={{last_sunday | date: '%Y-%m-%d'}}`
   - Response: `top_patterns`, `bottom_patterns`, `formula_version`, `current_mae`, `posts_this_week`, `avg_score`, `comments_this_week`, `author_reply_rate`
2. **Send Slack notification** — multi-line summary of performance, formula status, what worked, what to adjust

---

## Phase 5 — Verification (do this BEFORE handing back)

1. **Custom Values appear correctly:** Settings → Custom Values → confirm 18 entries listed
2. **Custom Fields:** Settings → Custom Fields → 7 contact + 10 opportunity fields visible
3. **Pipelines:** Opportunities → Pipelines → both 0nLinkedIn pipelines listed
4. **Workflows:** Automations → all 6 workflows present, all set to **Published** (not Draft)
5. **Capture both inbound webhook URLs:**
   - WF_002 trigger URL — paste back to Mike
   - WF_005 trigger URL — paste back to Mike
6. **Test fire WF_001 manually:**
   - Open WF_001 → click Test → Step 2 should hit `https://0nmcp.com/api/linkedin-bot/generate-post` and return JSON
   - If 401 → `onlinkedin_api_key` custom value isn't set yet (expected for fresh install — flag it but don't block)
   - If 200 → step 3 creates an opportunity in `0nLinkedIn Content Queue / Pending Approval`. Confirm visible.
7. **Confirm Social Planner is wired:** Marketing → Social Planner → at least one LinkedIn account connected (or note "user must complete onboarding to connect")

## What you do NOT need to touch

- Do not change PIT tokens
- Do not modify the CRM marketplace app config or scopes
- Do not touch the existing `Run OnCore` or `OnCore Event` workflow integrations — those are separate
- Do not delete any existing workflows you didn't create
- If a custom value or field already exists with the same key, **leave it** — don't overwrite

## Output back

Reply with:

```
Custom Values:    {created}/{updated}/{skipped}
Custom Fields:    {contacts created}/{opportunities created}
Pipelines:        2 created (or N existed)
Workflows:        6/6 published
WF_002 webhook URL: <paste>
WF_005 webhook URL: <paste>
Test fire WF_001: <PASS|FAIL with reason>
Issues: <list or "none">
```

Mike will paste those webhook URLs into the 0nmcp.com control panel so the LinkedIn bot can fire them.
