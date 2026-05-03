/**
 * Knowledge layer: the CRM (a.k.a. ROCKET / GoHighLevel) platform surface.
 *
 * Every product area, every workflow trigger / action / condition, every API
 * scope. Concatenated into the GHL-Jaxx system prompt at runtime. Intentionally
 * verbose — the model is the consumer, not a human reader.
 *
 * Hard rule: never use the words "GHL" / "Go High Level" / "HighLevel" in
 * customer-facing output. Internally we use "CRM" or "ROCKET". This document
 * uses "CRM" everywhere.
 */

export const GHL_KNOWLEDGE = `
# CRM Platform Knowledge (ROCKET / 0nMCP target surface)

## Product areas (top-level dashboard navigation)

- **Contacts** — single source of truth for a person.
  - Fields: first_name, last_name, email, phone, address, dnd, tags, customFields, source, assignedTo, dateOfBirth, country, timezone, locationId.
  - Bulk actions: tag, untag, send to workflow, export, delete, change owner.
  - Smart Lists: saved filter views (status, tags, custom field, last activity).
  - Manual / Imported / API as source.

- **Opportunities & Pipelines** — sales stages.
  - Each pipeline has stages (id, name, position).
  - An opportunity ties to a contact, has monetary value, status (open/won/lost/abandoned), stage, assignedTo.
  - Stages drive Workflow triggers ("Pipeline Stage Changed").

- **Calendars & Appointments**
  - Round-robin, class booking, collective, service calendars.
  - Buffer time, slot duration, slot buffer, max per slot, max per day.
  - Triggers: appointment booked / status changed / no-show / canceled.
  - Slots can be embedded as widgets or sent via SMS/email.

- **Workflows / Automations** — the engine. See dedicated section below.

- **Conversations** — unified inbox.
  - Channels: SMS, Email (Mailgun/LC SMTP), FB Messenger, Instagram DM, WhatsApp, Live Chat (web widget), Google Business Messages.
  - Snooze, assign, mark unread, internal comment.
  - Templates and snippets per channel.

- **Sites & Funnels**
  - Drag-drop page builder with components (rows, columns, sections, headings, buttons, video, forms, surveys, countdowns, calendars, products, custom HTML/JS).
  - Funnel: ordered set of pages with goals (opt-in, sale, book).
  - Order forms (1-step, 2-step, bump, upsell, downsell).
  - Forms & surveys: multi-step, conditional logic, tracking.
  - Trigger Links: short URLs that fire workflows on click; trackable per-contact.
  - Custom domains with auto-SSL.

- **Email Marketing**
  - Templates (drag-drop, code, text), Builder + Code editor.
  - Campaigns and broadcast lists.
  - Automated sequences live inside Workflows.
  - Sender domain verification, dedicated IP option.

- **Social Planner**
  - Channels: FB pages, IG business, LinkedIn (personal/page), GMB, X/Twitter, TikTok Business, YouTube, Pinterest.
  - Schedule, queue, recurring posts, AI captions, watermark, first-comment.
  - Bulk CSV upload of posts.

- **Reputation Management**
  - Review requests over SMS/email triggered by workflows.
  - Listing sync to top directories.
  - Sentiment summary + auto-reply templates.

- **Memberships / Courses**
  - Categories > Courses > Modules > Lessons (video, audio, file, text, quiz).
  - Drip schedules, prerequisites, certificate of completion.
  - Pricing: free / one-time / subscription / payment-plan; integrated with Stripe / NMI / Square / Authorize.net.
  - Triggers: course enrolled, module completed, lesson completed, course completed.

- **Invoices, Estimates, Subscriptions, Documents & Contracts**
  - Send via email/SMS, partial payment, payment plan, recurring.
  - Tax + discounts + line items + custom values.
  - Triggers: invoice sent / viewed / paid / voided / overdue.

- **Reporting & Analytics**
  - Pre-built dashboards: Attribution, Google Ads, Facebook Ads, Call, Appointment, Pipeline, Agency.
  - Custom dashboards with KPI widgets.
  - Source attribution via UTM parameters and trigger links.

- **Custom Fields, Custom Values, Tags**
  - Custom Fields live on a contact (TEXT, LARGE_TEXT, NUMBER, PHONE, DATE, MONETARY, CHECKBOX, RADIO, SELECT, MULTI, FILE_UPLOAD, SIGNATURE).
  - Custom Values live on the *location* (account-wide constants like {{custom_values.business_phone}}).
  - Tags are flat strings on a contact; max-256 chars, supports hierarchy via "category::value" by convention.

- **Users & Teams**
  - User roles: admin, user, agency-admin, agency-user.
  - Permissions per role (assigned data, calendars, payments, conversations, etc.).
  - Teams group users for round-robin assignment.

- **Sub-accounts / Locations** (agency view)
  - Each "location" is a tenant. Has its own pipelines, contacts, calendars.
  - Snapshots clone an entire location's automations, workflows, funnels, calendars, emails, custom fields and apply to a target location.
  - Saas Mode wraps locations with Stripe billing for the agency.

- **White-label SaaS settings** (agency)
  - Custom domain for the dashboard, custom logo, custom email-from.
  - Rebill: agency marks up Twilio / Mailgun / OpenAI usage to clients.
  - Agency snapshot library, prospecting tool, dashboard widgets per plan.

- **Snapshots / Templates**
  - A snapshot exports an entire location's config. Used to onboard new clients.
  - Loadable selectively (workflows only, funnels only, etc.).

- **Marketplace apps** (custom integrations)
  - Custom Pages: an iframe inside the CRM nav serving an external URL with a signed token.
  - Custom Menu Links: a sub-account-level link to an external tool.
  - Custom JS / CSS injection (white-label JS; runs in dashboard chrome).
  - Workflow Action apps: the app exposes a URL, gets POSTed when the action fires.
  - Workflow Trigger apps: the app POSTs to the CRM trigger URL.
  - OAuth 2.0 with marketplace + agency modes; PIT (Private Integration Token) for non-OAuth.
  - Webhooks: contact / opportunity / appointment / invoice / order / message events.

## Workflow Builder — every primitive

### Triggers (the event that starts the run)

- **Contact** — Contact Created, Contact Changed, Contact Tag (Added | Removed), Contact DND (On | Off), Birthday, Note Added, Task Added, Task Reminder.
- **Opportunity** — Opportunity Created, Opportunity Status Changed, Pipeline Stage Changed, Opportunity Stale (X days no activity), Opportunity Value Changed.
- **Appointment** — Appointment Status (Booked | Confirmed | Cancelled | No-Show | Showed), Appointment Reminder.
- **Form / Survey** — Form Submitted, Survey Submitted (per-form-id filter).
- **Email** — Email Opened, Email Clicked, Email Bounced.
- **SMS** — Inbound SMS, Inbound SMS Reply.
- **Call** — Call Inbound, Call Status (answered | missed | voicemail).
- **Trigger Link** — Trigger Link Clicked.
- **Membership** — Course Enrolled, Module Completed, Lesson Completed, Course Completed.
- **Invoice / Payment** — Order Submitted, Order Form Filled, Invoice Sent / Viewed / Paid / Voided / Overdue, Subscription Created / Paused / Canceled.
- **Calendar** — Calendar Event Created.
- **Custom** — Custom Webhook (any external system POSTs JSON to a CRM-supplied URL; payload mapped to workflow variables).
- **Tags / Notes / Tasks** — Tag Added, Tag Removed, Note Added, Task Added, Task Completed.
- **Workflow** — Workflow Run Completed (chain workflows).

Every trigger supports filters (e.g. tag = X, source = Facebook Ads, custom field = Y).

### Actions (what the workflow does on each step)

- **Communications**
  - Send Email (template or custom HTML; supports merge fields).
  - Send SMS (text + MMS; supports {{custom_values}}, {{contact.first_name}}, etc.).
  - Send WhatsApp / FB Messenger / IG DM (channel-specific).
  - Send Voicemail Drop (ringless voicemail via Twilio).
  - Send Voice Call (text-to-speech via TTS engines).
  - Internal Notification (email / SMS / Slack channel).
  - Manual SMS / Manual Call (queue for a user, not auto-sent).

- **Contact ops**
  - Add / Remove Tag.
  - Add / Remove from Workflow (start, pause, end, remove from another workflow).
  - Update Contact Field (built-in or custom).
  - Update Custom Value (location-level; rare).
  - Set Event Start Date (used to time follow-up steps relative to a date).
  - Add Note, Add Task, Assign to User.
  - DND on / off (per channel: email, sms, voice, all).

- **Opportunity ops**
  - Create Opportunity, Update Opportunity (move stage, change value, change status, change owner).
  - Remove Opportunity.

- **Appointment ops**
  - Create Appointment, Update Appointment Status, Reschedule, Cancel.

- **Logic**
  - **If / Else** — branch on contact field, workflow data, custom code response.
  - **Wait** — until specific date, until X minutes/hours/days, until trigger event, until contact replies, until appointment.
  - **Goal** — terminal step that marks "achieved" if reached (used for funnels).
  - **Go To** — jump to another step in the same workflow.
  - **End Workflow** — terminate this contact's path.
  - **Random Splitter** — A/B/C with percentage weights.
  - **Math Operation** — arithmetic on number fields (write back to a custom field).

- **External**
  - **Custom Webhook (Send)** — POST a JSON payload to any URL; capture response into workflow variables.
  - **Custom Webhook (Receive)** — pause until inbound webhook hits a unique URL.
  - **Inbound Webhook** — same idea, mid-workflow listening.
  - **Custom Code (JavaScript)** — run JS server-side; \`fetch()\` to external APIs; access workflow variables; return JSON consumed by next steps.
  - **Slack Notification, Google Sheets Update, Zapier / Make / Pabbly handoff, Webhook Module.**

- **AI Studio actions** (CRM native)
  - **AI Reply** — generate reply text from prompt + context; uses chosen model (OpenAI/Anthropic/etc. — but in our stack we override with Groq via Custom Code).
  - **AI Summary** — summarize a conversation thread.
  - **AI Tagging / Routing** — classify message + apply tag.
  - **Conversation AI Bot** — auto-reply on inbound conversations (FB / IG / SMS / web chat) with a configured persona.
  - **Voice AI Agent** — answer / make calls with a persona; handoffs to human.
  - For the 0n stack we *prefer* Custom Code → Groq for any AI step, because AI Studio bills the agency at platform rates and AI Studio cannot guarantee Groq.

### Custom Code action — the bridge to 0nCore

Every Custom Code step runs JavaScript in a sandboxed Node-like runtime
(no native modules, but \`fetch\` is available). The signature is:

\`\`\`js
const someInput = inputData.fieldName;       // values mapped from prior steps
const contactId = inputData.contactId;        // when forwarded by trigger context

const res = await fetch('https://www.0ncore.com/api/<endpoint>', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer ' + inputData.oncore_token, // pulled from {{custom_values.oncore_token}}
  },
  body: JSON.stringify({ ... }),
});
const data = await res.json();

// Whatever you return becomes \`outputData\` for downstream steps.
return {
  vpis_score: data.score,
  recommended_action: data.action,
  next_message: data.text,
};
\`\`\`

Conventions used by every 0n-built workflow:

1. The workflow has a **Custom Value** \`oncore_token\` storing a \`0n_\`-prefixed
   token (type:plain on Vercel — Critical Rule #10). Custom Code steps read it via
   \`{{custom_values.oncore_token}}\` and inject as Bearer.
2. Inputs to Custom Code come from prior steps' outputs OR from contact fields
   mapped explicitly into the step config.
3. Outputs are merged into \`outputData\` and become available as
   \`{{custom_code.<step_name>.<key>}}\` to downstream actions.
4. If the API call fails, we set a tag like \`error::custom_code::<step>\` on the
   contact so the workflow's error branch can pick it up.

### Conditions / Filters

- Field-level: contact field equals / contains / not equals / less-than / greater-than / is empty / is not empty / before / after.
- Tag-level: has tag / does not have tag / has any of / has all of.
- Time-based: workflow-data > X, custom field date is past/future.
- Custom code result: route on \`{{custom_code.last.score}}\`.

### Wait Steps

- **Time delay** — fixed (5 min), relative ("until 9am tomorrow"), business-hours-aware.
- **Event** — wait until contact replies / clicks / opens / books.
- **Date Field** — wait until a contact date field, plus offset (e.g. birthday + 0 days, due_date - 7 days).

## CRM API — scope catalogue (the 140+ scopes we actually use)

OAuth scopes used by our Sub-Location app (and the Agency app):

- **Contacts:** \`contacts.readonly\`, \`contacts.write\`
- **Opportunities:** \`opportunities.readonly\`, \`opportunities.write\`
- **Calendars:** \`calendars.readonly\`, \`calendars.write\`, \`calendars/events.readonly\`, \`calendars/events.write\`, \`calendars/groups.readonly\`, \`calendars/groups.write\`, \`calendars/resources.readonly\`, \`calendars/resources.write\`
- **Conversations:** \`conversations.readonly\`, \`conversations.write\`, \`conversations/message.readonly\`, \`conversations/message.write\`, \`conversations/reports.readonly\`
- **Workflows:** \`workflows.readonly\`
- **Custom Fields & Values:** \`locations/customFields.readonly\`, \`locations/customFields.write\`, \`locations/customValues.readonly\`, \`locations/customValues.write\`
- **Tags:** \`locations/tags.readonly\`, \`locations/tags.write\`
- **Tasks:** \`locations/tasks.readonly\`, \`locations/tasks.write\`
- **Notes:** \`contacts/notes.readonly\` (via contacts API)
- **Locations:** \`locations.readonly\`, \`locations.write\` (agency)
- **Users:** \`users.readonly\`, \`users.write\` (agency)
- **Funnels & Forms:** \`funnels/page.readonly\`, \`funnels/funnel.readonly\`, \`forms.readonly\`, \`forms.write\`, \`surveys.readonly\`
- **Sites:** \`websites.readonly\`
- **Social Planner:** \`socialplanner/account.readonly\`, \`socialplanner/account.write\`, \`socialplanner/post.readonly\`, \`socialplanner/post.write\`, \`socialplanner/category.readonly\`, \`socialplanner/category.write\`, \`socialplanner/tag.readonly\`, \`socialplanner/tag.write\`, \`socialplanner/csv.readonly\`, \`socialplanner/csv.write\`, \`socialplanner/oauth.readonly\`, \`socialplanner/oauth.write\`
- **Invoices & Payments:** \`invoices.readonly\`, \`invoices.write\`, \`invoices/template.readonly\`, \`invoices/template.write\`, \`invoices/schedule.readonly\`, \`invoices/schedule.write\`, \`payments/orders.readonly\`, \`payments/orders.write\`, \`payments/integration.readonly\`, \`payments/integration.write\`, \`payments/transactions.readonly\`, \`payments/subscriptions.readonly\`, \`payments/coupons.readonly\`, \`payments/coupons.write\`, \`payments/custom-provider.readonly\`, \`payments/custom-provider.write\`
- **Products & Pricing:** \`products.readonly\`, \`products.write\`, \`products/prices.readonly\`, \`products/prices.write\`, \`products/collection.readonly\`, \`products/collection.write\`, \`store/shipping.readonly\`, \`store/shipping.write\`, \`store/setting.readonly\`, \`store/setting.write\`
- **Campaigns:** \`campaigns.readonly\`
- **Courses & Memberships:** \`medias.readonly\`, \`medias.write\`, \`courses.readonly\`, \`courses.write\` (via Marketplace bulk-import; bulk import contentType MUST be 'video' for Course Builder)
- **Reporting:** \`reports.readonly\`
- **Custom Objects (Object Manager):** \`objects/schema.readonly\`, \`objects/schema.write\`, \`objects/record.readonly\`, \`objects/record.write\`, \`associations.readonly\`, \`associations.write\`, \`associations/relation.readonly\`, \`associations/relation.write\`
- **Reputation & Reviews:** \`businesses.readonly\`, \`businesses.write\`
- **Marketplace:** \`marketplace-installer-details.readonly\`, \`oauth.write\`, \`oauth.readonly\`

API base: \`https://services.leadconnectorhq.com\`.
Version header: \`Version: 2021-07-28\`.
Auth: \`Authorization: Bearer <PIT or OAuth access token>\`.
PIT: starts with \`pit-...\` — used for non-OAuth backend calls; type:plain on Vercel.
`;
