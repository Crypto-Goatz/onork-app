# 0nCORE — Verified Capability & Scope Report

Generated 2026-08-05 from the live token, the code registries and the platform's own API specs.
Nothing here is aspirational: every line is either a scope we hold, a handler that exists, or an endpoint verified against a live account.

---

## 1. What we can do RIGHT NOW, with certainty

These have handlers, run through the approval gate, and write receipts.

| Capability | What it does | Verified |
|---|---|---|
| `contact.create` | add or create a contact | live |
| `contact.update` | update a contact or its custom fields | live |
| `contact.search` | find or segment contacts | live |
| `contact.tag` | tag or untag contacts, in bulk | live |
| `contact.note` | add a note to a contact | live |
| `customfield.create` | create a custom field or object | live |
| `sms.send` | send an SMS | live |
| `email.send` | send an email | live |
| `conversation.read` | read or summarise conversation history | live |
| `appointment.book` | book, reschedule or cancel an appointment | live |
| `opportunity.move` | move or update a deal | live |
| `snapshot.list` | see which snapshots the agency has | live |
| `workflow.list` | see what automations a client has | live |
| `workflow.trigger` | start an existing workflow for contacts | live |
| `task.create` | add a task, for a person or an agent | live |
| `agent.list` | see what AI agents a client has | live |
| `agent.run` | ask an AI agent to do something or answer | live |
| `agent.create` | create a new AI agent for a client | live |
| `external.call` | do something in another service — mail, payments, docs | live |

**19 capabilities wired.**

## 2. Present in the registry, deliberately NOT runnable

| Capability | Why | What we offer instead |
|---|---|---|
| `location.create` | Needs the billing meter configured | Ships when its dependency does |
| `user.create` | Needs the billing meter configured | Ships when its dependency does |
| `funnel.clone` | Only applies when a sub-account is created | Ships when its dependency does |
| `site.build` | Depends on a 0n product not yet shipped | Ships when its dependency does |
| `social.schedule` | Depends on a 0n product not yet shipped | Ships when its dependency does |
| `agents.deploy` | Only applies when a sub-account is created | Ships when its dependency does |
| `invoice.create` | Needs the billing meter configured | Ships when its dependency does |
| `report.rollup` | Depends on a 0n product not yet shipped | Ships when its dependency does |
| `snapshot.apply_at_create` | Needs the billing meter configured | Ships when its dependency does |
| `snapshot.repush` | No API exists — for anyone | A named alternative, in the assistant's own words |
| `workflow.deploy` | Only applies when a sub-account is created | Ships when its dependency does |
| `workflow.author` | No API exists — for anyone | A named alternative, in the assistant's own words |
| `funnel.edit` | No API exists — for anyone | A named alternative, in the assistant's own words |
| `agents.author` | No API exists — for anyone | A named alternative, in the assistant's own words |

## 3. OAuth scopes we actually hold

Read from a live location token: **142 scopes**. This is the ceiling on everything above.

**agent-studio** — agent-studio.readonly, agent-studio.write

**associations** — associations.readonly, associations.write, associations/relation.readonly, associations/relation.write

**blogs** — blogs/author.readonly, blogs/category.readonly, blogs/check-slug.readonly, blogs/list.readonly, blogs/post-update.write, blogs/post.write, blogs/posts.readonly

**brand-boards** — brand-boards/design-kit.readonly, brand-boards/design-kit.write

**businesses** — businesses.readonly, businesses.write

**calendars** — calendars.readonly, calendars.write, calendars/events.readonly, calendars/events.write, calendars/groups.readonly, calendars/groups.write, calendars/resources.readonly, calendars/resources.write

**campaigns** — campaigns.readonly

**charges** — charges.readonly, charges.write

**contacts** — contacts.readonly, contacts.write

**conversation-ai** — conversation-ai.readonly, conversation-ai.write

**conversations** — conversations.readonly, conversations.write, conversations/livechat.write, conversations/message.readonly, conversations/message.write, conversations/reports.readonly

**courses** — courses.readonly, courses.write

**documents_contracts** — documents_contracts/list.readonly, documents_contracts/sendLink.write

**documents_contracts_template** — documents_contracts_template/list.readonly, documents_contracts_template/sendLink.write

**emails** — emails/builder.readonly, emails/builder.write, emails/schedule.readonly, emails/schedule.write

**forms** — forms.readonly, forms.write

**funnels** — funnels/funnel.readonly, funnels/page.readonly, funnels/pagecount.readonly, funnels/redirect.readonly, funnels/redirect.write

**invoices** — invoices.readonly, invoices.write, invoices/estimate.readonly, invoices/estimate.write, invoices/schedule.readonly, invoices/schedule.write, invoices/template.readonly, invoices/template.write

**knowledge-bases** — knowledge-bases.readonly, knowledge-bases.write

**lc-email** — lc-email.readonly

**links** — links.readonly, links.write

**locations** — locations.readonly, locations/customFields.readonly, locations/customFields.write, locations/customValues.readonly, locations/customValues.write, locations/tags.readonly, locations/tags.write, locations/tasks.readonly, locations/tasks.write, locations/templates.readonly

**marketplace-external-auth-migration** — marketplace-external-auth-migration.write

**marketplace-installer-details** — marketplace-installer-details.readonly

**medias** — medias.readonly, medias.write

**numberpools** — numberpools.read

**oauth** — oauth.readonly, oauth.write

**objects** — objects/record.readonly, objects/record.write, objects/schema.readonly, objects/schema.write

**opportunities** — opportunities.readonly, opportunities.write

**payments** — payments/coupons.readonly, payments/coupons.write, payments/custom-provider.readonly, payments/custom-provider.write, payments/integration.readonly, payments/integration.write, payments/orders.collectPayment, payments/orders.readonly, payments/orders.write, payments/subscriptions.readonly, payments/transactions.readonly

**phonenumbers** — phonenumbers.read, phonenumbers.write

**products** — products.readonly, products.write, products/collection.readonly, products/collection.write, products/prices.readonly, products/prices.write

**recurring-tasks** — recurring-tasks.readonly, recurring-tasks.write

**saas** — saas/location.read, saas/location.write

**socialplanner** — socialplanner/account.readonly, socialplanner/account.write, socialplanner/category.readonly, socialplanner/category.write, socialplanner/csv.readonly, socialplanner/csv.write, socialplanner/oauth.readonly, socialplanner/oauth.write, socialplanner/post.readonly, socialplanner/post.write, socialplanner/statistics.readonly, socialplanner/tag.readonly, socialplanner/tag.write

**store** — store/setting.readonly, store/setting.write, store/shipping.readonly, store/shipping.write

**surveys** — surveys.readonly

**twilioaccount** — twilioaccount.read

**users** — users.readonly, users.write

**voice-ai-agent-goals** — voice-ai-agent-goals.readonly, voice-ai-agent-goals.write

**voice-ai-agents** — voice-ai-agents.readonly, voice-ai-agents.write

**voice-ai-dashboard** — voice-ai-dashboard.readonly

**wordpress** — wordpress.site.readonly

**workflows** — workflows.readonly

## 4. Workflow steps the agency can place

| Key | Name | Runs today |
|---|---|---|
| `oncore_run_command` | 0nCORE: Run Command | yes |
| `oncore_ai_draft` | 0nCORE: AI Draft Message | yes |
| `oncore_score_route` | 0nCORE: Score & Route | yes |
| `oncore_member_link` | 0nCORE: Send Portal Link | yes |
| `oncore_build_site` | 0nCORE: Build Site | not yet |
| `oncore_schedule_social` | 0nCORE: Schedule Social | not yet |

## 5. Events that start their workflows

| Key | Fires when |
|---|---|
| `oncore_burst_completed` | a command finishes acting on a contact |
| `oncore_site_built` | a site is deployed |
| `oncore_client_provisioned` | a new sub-account finishes provisioning |
| `oncore_lead_scored` | a contact is scored past a threshold |
| `oncore_recovery_fired` | a failed step recovered another way |
| `oncore_member_updated` | a member edits their own details |
| `oncore_member_viewed` | a member opens their portal |

## 6. Page widgets

| Key | Name | Ships today |
|---|---|---|
| `oncore_site_builder` | 0nCORE Site Builder | not yet |
| `oncore_lp_inject` | 0nCORE Landing Page | not yet |
| `oncore_booking_block` | 0nCORE Booking Block | yes |
| `oncore_course_embed` | 0nCORE Course Player | not yet |
| `oncore_member_profile` | 0nCORE Member Profile | yes |
| `oncore_analytics` | 0nCORE Analytics | yes |
| `oncore_chat` | 0nCORE Chat | yes |
| `oncore_script_manager` | 0nCORE Script Manager | yes |
| `oncore_social_proof` | 0nCORE Social Proof | yes |

## 7. What is billable

| Meter | Unit | Price |
|---|---|---|
| Site build | per site | $10.00 |
| Site build — in your CRM | per site | free |
| Client provisioned | per client | $5.00 |
| Social post | per post | $0.15 |
| Command action | per action | free |
---

## 8. Marketing — what the back end can actually run today

Every item below maps to a wired capability above. Nothing here is a plan.

**Reach a person, from a command or a workflow step**
- `email.send` · `sms.send` — one contact, resolved by name or email, refusing on ambiguity
- `contact.tag` — segment for a campaign, capped at 25 per action because tags fire automations
- `workflow.trigger` — drop a contact into any nurture the agency already built
- `task.create` — put follow-up on a human's list

**Know who to reach**
- `contact.search` — segment by anything the CRM indexes
- `conversation.read` — what was last said, per contact
- `agent.run` — ask a briefed AI agent to judge, draft or summarise
- `opportunity.move` — advance the pipeline when a campaign lands

**Capture and convert on the page**
- Form Capture widget — submissions become contacts, tagged, and **enrolled into a thank-you workflow**
- Conversion Bar — offer copy edited once, changes on every client site
- Social Proof — real CRM activity, never invented testimonials
- Chat — answered by that client's **own** agent, so the site matches the inbox
- Member Profile — the #1 request on the platform's idea board

**Measure and decide**
- CRO9 collector on every page, per location
- Demand Radar — 792 feature requests across 82 boards, re-read three times daily
- Cross-client AI query — one question answered across the whole book of business

**What marketing CANNOT do from here, and why**
- Author a native workflow or funnel page — **no write API exists for anyone**
- Push a snapshot into an existing client — manual in the CRM UI, not automatable
- Build a hosted site — webOn is not wired to the command bar yet
- Schedule social — needs the `SOCIAL_POST` meter created before it can bill

---

## 9. Verified platform facts

These cost real time to establish. They are true as of the generation date and each was confirmed against a live account, not read from a doc.

| Area | Finding |
|---|---|
| Workflows | `workflows-v3` exposes exactly **one** path: `GET /workflows/`. No create, no edit, for anyone. |
| Enrolment | `POST /contacts/{id}/workflow/{workflowId}` **does** exist — we choose who enters. |
| Agent Studio | **Writable.** Create is 3 calls: shell with empty `nodes` → PATCH the graph → publish. |
| Agent execute | `locationId` goes in the **body**; a 404 means *unpublished*, not missing. |
| Conversation AI | Full CRUD. `triggerWorkflow` action type is the bridge to everything else. |
| SaaS endpoint | Not an enumeration — needs a Stripe id. There is no "list my plans" call. |
| Snapshots | Cannot be created by API. Share links **can** be generated. |
| Contacts | Duplicated `locationId` → misleading 403; sub-resource POSTs reject it entirely → 422. |
| Wallet | Price lives in a portal-defined meter; we send `units`. `has-funds` returned true for 100,000,000 — advisory only. |
