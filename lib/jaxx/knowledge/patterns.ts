/**
 * Knowledge layer: reusable workflow blueprints.
 *
 * Each pattern is a named, parameterized recipe Jaxx can adapt. The brain
 * cites a pattern by name and adapts the steps to the user's specifics.
 */

export const PATTERNS_KNOWLEDGE = `
# Reusable workflow patterns (cite by name, adapt to user's specifics)

## 1. Campaign Nurture
Goal: educate / warm a lead over N days; exit on reply or booking.

Steps:
1. **Trigger:** Tag Added \`nurture::start\` (or Form Submitted on a lead-magnet form).
2. **Action:** Add Tag \`nurture::active\`. Add Note "nurture started by {{workflow.name}}".
3. **Action:** Send Email — value-only #1 (no pitch). Subject A/B via Random Splitter (50/50).
4. **Wait:** 2 days OR until contact replies / books appointment / clicks trigger link.
5. **If/Else:** Has Tag \`booked\` → End Workflow (goal). Has Tag \`reply::positive\` → Go To Step "Hot handoff".
6. **Action:** Send SMS — soft check-in with a trigger link to a calendar.
7. **Wait:** 3 days.
8. **Action:** Send Email — case study #2.
9. **Wait:** 4 days.
10. **Action:** Send Email — final value, then ask one specific question.
11. **If/Else:** No reply by day 14 → Add Tag \`nurture::cold\`, remove from active.
12. **Goal step:** "Booked or replied" — sets attribution to this workflow.

Tracking discipline:
- Every email/SMS uses a unique trigger link with UTMs:
  \`?utm_source=crm&utm_medium=email&utm_campaign=nurture&utm_content=email_2\`.
- Each touch tags the contact \`nurture::touch::<n>\` for cohort analysis.

## 2. Lead Scoring (0nCore-powered)
Goal: every new contact comes in with a VPIS score and a stack-gap profile.

Steps:
1. **Trigger:** Contact Created.
2. **Wait:** 30 seconds (let other systems write fields).
3. **Custom Code:** call \`/api/scanner/analyze\` with \`{{contact.website}}\`.
   Output: \`gap_score\`, \`gaps\` (csv), \`recs\`.
4. **Action:** Update Contact Field — set custom field \`gap_score\` and \`stack_gaps\` from outputs.
5. **Custom Code:** call \`/api/exec/score\` with \`{ contact_ids: [contact.id] }\`.
   Output: \`vpis\`, \`tier\` (\`hot\` / \`warm\` / \`cold\`).
6. **Action:** Add Tag \`vpis::{{custom_code.exec_score.tier}}\`.
7. **If/Else:** \`vpis >= 80\` → Go To "Hot handoff" (notify owner via Slack + assign).
   \`vpis 50-79\` → Add to Workflow "Campaign Nurture".
   \`vpis < 50\` → Add Tag \`drip::low-priority\`, no further action.

## 3. Auto-Gig Generator
Goal: turn an inbound lead's website into a tailored Fiverr gig + Slack ping.

Steps:
1. **Trigger:** Form Submitted on the "Free SXO Audit" form OR Tag Added \`gig::generate\`.
2. **Custom Code:** \`/api/scanner/analyze\` → gap profile.
3. **Custom Code:** \`/api/fiverr/generate\` with \`{ niche, target_buyer, deliverable: "fix " + gaps[0], price_range: "150-450" }\`.
   Output: \`title\`, \`description\`, \`packages\`, \`faqs\`.
4. **Action:** Update Contact Custom Field \`fiverr_gig_title\`, \`fiverr_gig_url\` (placeholder).
5. **Action:** Internal Notification → Slack channel \`#fiverr-queue\` with title + summary + link to the contact in CRM.
6. **Action:** Add Tag \`fiverr::queued\`.
7. **Wait:** until Tag \`fiverr::published\` is added (manual step by ops).
8. **Action:** Send Email to lead — "Here's what we'd build for you" with the gig URL.

## 4. Urgency Alert
Goal: when 0nExec marks a customer "critical", page the owner and arm a recovery sequence.

Steps:
1. **Trigger:** Custom Webhook — \`/api/webhooks/automation\` POSTs \`{ contact_id, urgency: "critical", reason }\`.
2. **Action:** Update Contact Field \`urgency\` = \`critical\`.
3. **Action:** Slack Notification (channel \`#alerts-critical\`) with Block Kit: contact name, reason, two buttons "Take it" (assigns to clicker) / "Triage" (opens \`/exec/contacts/<id>\`).
4. **Custom Code:** \`/api/exec/think\` body \`{ context: "critical-recovery", question: "what's the next best action for {{contact.id}}?" }\`. Output: \`action\`, \`message_draft\`.
5. **Action:** Manual SMS queued to assigned user with the suggested message.
6. **Wait:** 1 hour OR until Tag \`urgency::handled\`.
7. **If/Else:** If still \`critical\` after 1h → escalate to second Slack channel and add Task to founder.

## 5. Content Pipeline (VPIS-gated auto-publish)
Goal: generate posts on a schedule; auto-publish only the strongest.

Steps:
1. **Trigger:** Schedule (recurring workflow) — Mon/Wed/Fri 9 AM.
2. **Custom Code:** \`/api/linkedin-bot\` action \`generate-post\` with topic from \`{{custom_values.content_topic_pool}}\`.
   Output: \`text\`, \`vpis\`.
3. **If/Else:** \`vpis >= 80\` → Go To "Auto-publish".
4. **Auto-publish branch:**
   - Custom Code: \`/api/linkedin-bot\` action \`schedule-post\` body \`{ text, channel: "linkedin" }\`.
   - Add Note to "Content Calendar" contact: "auto-published, vpis = X".
5. **Else branch (vpis < 80):**
   - Internal Notification → \`#content-review\` Slack channel with the draft + score.
   - Wait until Tag \`content::approved\` or \`content::rejected\`.
   - On approval, route to Auto-publish; on rejection, log and exit.

## 6. Client Onboarding (white-label SaaS)
Goal: new paying client triggers full sub-account / location bootstrap.

Steps:
1. **Trigger:** Order Submitted (Stripe / payments) for product \`client-onboarding-saas\`.
2. **Custom Code:** \`/api/0nmcp/execute\` tool \`crm.locations_create\` with the contact's company name + plan.
   Output: \`location_id\`.
3. **Custom Code:** \`/api/0nmcp/execute\` tool \`crm.snapshots_apply\` with \`{ location_id, snapshot_id: {{custom_values.client_starter_snapshot}} }\`.
4. **Custom Code:** create the client's owner user via \`crm.users_create\` with role \`admin\` and the contact's email.
5. **Action:** Send Email — welcome + login URL (custom-domain dashboard).
6. **Action:** Add Tag \`saas::onboarded\`. Set Custom Field \`location_id\` on the parent contact.
7. **Wait:** 24 hours.
8. **Action:** Send SMS — "How's setup going?" with reply listener.
9. **Goal:** "First login detected" — webhook from CRM \`user.first_login\` event tags the contact \`saas::active\`.

## Pattern usage notes for Jaxx

- **Always pick a pattern first**, then adapt step IDs and copy. Tell the user
  which pattern you're starting from.
- **Always include exit conditions** — a Goal step or an End Workflow + tag.
- **Always tag** at every meaningful state transition (\`<workflow>::<state>\`).
  Tags are how downstream Smart Lists, dashboards, and other workflows pick up.
- **Always trigger-link or UTM** outbound URLs — attribution falls apart without it.
- **Always wrap Custom Code in try/catch** and have an error tag path.
`;
