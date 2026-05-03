/**
 * Knowledge layer: every 0nCore API endpoint reachable from a CRM workflow's
 * Custom Code action.
 *
 * For each endpoint we give the model:
 *   - HTTP method + path
 *   - One-sentence purpose
 *   - Example request body
 *   - Example response shape
 *   - The exact JS snippet to drop into a Custom Code step
 *
 * The model uses this to generate Claude-Chrome instructions that paste correct
 * code into the CRM workflow builder. Auth is always Bearer with a 0n_ token.
 */

export const ONCORE_API_KNOWLEDGE = `
# 0nCore API surface (callable from CRM Custom Code actions)

Base URL: \`https://www.0ncore.com\`
Auth: \`Authorization: Bearer <0n_token>\` — token sourced from Custom Value
\`{{custom_values.oncore_token}}\`. Never embed a literal token in code.

## /api/auth/verify-token  (POST)
Verifies a \`0n_\` token and returns the matching user profile, connections,
and active add-ons. Lets a workflow confirm "is this contact's owner-account
still authorized to call 0nCore?" before doing chargeable work.

Body: \`{ token: "0n_..." }\`
Returns: \`{ profile: {...}, connections: [...], addons: [...], services: {...} }\`

\`\`\`js
const r = await fetch('https://www.0ncore.com/api/auth/verify-token', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ token: inputData.oncore_token }),
});
return await r.json();
\`\`\`

## /api/linkedin-bot  (POST)
Universal endpoint for VPIS scoring + content generation. Pick an action.

- \`action: "generate-post"\` — body: \`{ topic, hook_archetype, icp_context, value_prop, brand_voice, target_keywords, target_score }\`. Returns \`{ text, scores: { vpis, ... }, model }\`.
- \`action: "generate-comment"\` — body: \`{ post_text, target_post_url, persona }\`. Returns \`{ text, scores }\`.
- \`action: "score-post"\` — body: \`{ text, url? }\`. Returns \`{ score, factors: { velocity, profile, intent, stage }, recommendation }\`.
- \`action: "schedule-post"\`, \`"post-comment"\`, \`"feedback"\`, \`"weekly-report"\`, \`"register-account"\`, \`"generate-dm"\`.

\`\`\`js
const r = await fetch('https://www.0ncore.com/api/linkedin-bot', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer ' + inputData.oncore_token,
  },
  body: JSON.stringify({
    action: 'generate-post',
    topic: inputData.topic,
    hook_archetype: 'bait_and_flip',
    icp_context: 'agency owners running CRM for clients',
    target_score: 85,
  }),
});
const { text, scores } = await r.json();
return { post_text: text, vpis: scores.vpis };
\`\`\`

## /api/scanner/analyze  (POST)
Stack scanner — detects CRM/marketing/analytics tools on a URL, computes a
gap-score, suggests recommended add-ons. Use as the first step of any
"new lead" workflow.

Body: \`{ url, hostname?, detected?, network_hosts? }\`
Returns: \`{ scan_id, gaps: ["analytics","email"], score, recommendations: [...], detected_categories }\`

\`\`\`js
const r = await fetch('https://www.0ncore.com/api/scanner/analyze', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer ' + inputData.oncore_token,
  },
  body: JSON.stringify({ url: inputData.contact_website }),
});
const { score, gaps, recommendations } = await r.json();
return { gap_score: score, gap_summary: gaps.join(', '), recs: recommendations };
\`\`\`

## /api/scanner/save-lead  (POST)
Persist a scanned URL as a lead row (rolls into 0nExec). Body: \`{ url, name, email, phone?, notes? }\`.

## /api/exec/score        (POST)  — score one or many contacts on the active formula. Body: \`{ contact_ids: [...] }\` or \`{ filter: { tag: "..." } }\`. Returns \`{ scored: [...], top: [...] }\`.
## /api/exec/score/batch  (POST)  — bulk score; long-running, returns a job id.
## /api/exec/orbits       (GET)   — list orbit configs (visual ranking widget). Returns \`{ orbits: [...] }\`.
## /api/exec/formulas     (GET|POST|PATCH|DELETE) — manage VPIS-style formulas at \`vpis_formula_weights\`. POST body: \`{ name, weights: { velocity, profile, intent, stage, ...58 patterns } }\`.
## /api/exec/patterns     (GET)   — list registered scoring patterns.
## /api/exec/variables    (GET|PATCH) — read or update bot_settings keys (no hardcoding).
## /api/exec/think        (POST)  — Groq-backed "what should I do next?" given current 0nExec state. Body: \`{ context, question }\`. Returns \`{ recommendation, confidence, action }\`.
## /api/exec/learn        (POST)  — feedback loop; body: \`{ contact_id, signal: "won"|"lost"|"replied"|... }\`.
## /api/exec/contacts     (GET)   — paginated list with VPIS scores; query: \`?tag=X&min_score=80&limit=50\`.

## /api/fiverr/generate            (POST) — generate a Fiverr gig (title, description, package tiers, FAQ) from a brief. Body: \`{ niche, target_buyer, deliverable, price_range, tone? }\`. Returns \`{ title, description, packages: [basic, standard, premium], faqs }\`.
## /api/fiverr/section-regenerate  (POST) — regenerate a single gig section.
## /api/fiverr/templates           (GET)  — list saved templates.

## /api/slack/commands       (POST) — Slack-signed slash command handler.
## /api/slack/events         (POST) — Slack Events API endpoint.
## /api/slack/interactive    (POST) — Block Kit button / modal callback URL.
## /api/slack/oauth          (GET|POST) — OAuth install flow for the 0n Slack app.
We don't usually call these from a CRM workflow; instead use the inverse:

### Posting to Slack from a CRM workflow
The cleanest path is the "Slack Notification" CRM action *or* a Custom Webhook
to the team's Slack incoming webhook URL stored in \`{{custom_values.slack_webhook}}\`.
For richer messages with action buttons, POST to \`/api/slack/notify\` (when
present) with \`{ channel, blocks }\` as the body.

## /api/oauth/authorize  (GET)
## /api/oauth/token      (POST)
## /api/oauth/userinfo   (GET)
## /api/oauth/reauth     (GET)
The OAuth 2.1 server other apps use to log into 0nCore (PKCE + DCR). You
generally don't call these from a CRM workflow.

## /api/canvas/ai-build   (POST) — generate a React Flow canvas from a natural-language brief. Body: \`{ brief, current_canvas? }\`. Returns \`{ nodes, edges }\`.
## /api/canvas/flows      (GET|POST|PATCH|DELETE) — CRUD on saved canvases.

## /api/cron/*  (GET; usually called by Vercel cron, not workflows)
\`linkedin\`, \`linkedin-engagement\`, \`market-collect\`, \`market-aggregate\`,
\`market-match\`, \`learning-loop\`, \`run-marketplace-apps\`, \`task-guardian\`,
\`indexnow-daily\`, \`mcp-registry-sync\`, \`refresh-tokens\`, \`daily-post\`,
\`crm-changelog\`, \`use-cases\`, \`addons\`, \`blog\`, \`cro9\`. If a workflow
needs to *trigger* one ad-hoc, call it as a regular GET with the cron secret.

## /api/webhooks/crm        (POST) — inbound CRM webhook handler. CRM POSTs contact / opportunity / appointment / message events here; we route them into Supabase + the workflow stream.
## /api/webhooks/automation (POST) — inbound webhook for arbitrary external system to trigger an internal automation chain.
## /api/webhooks/stripe     (POST) — Stripe events.
## /api/webhooks/{discord,linkedin,marketplace,slack,telegram,whatsapp,wordpress} — channel-specific.

## /api/courses, /api/course-builder, /api/lead-magnet, /api/landing-pages
Programmatic creation of CRM-side assets (course, lead magnet, landing page)
via 0nMCP. Usable in a workflow as part of a "spawn an asset" step.

## /api/workflows, /api/workflow-action, /api/workflow-trigger
Endpoints that *the CRM marketplace app* calls into when a workflow uses our
custom Action / Trigger app. The workflow side is configured via the marketplace
app config in the CRM dashboard; the bridge is implemented here.

## /api/0nmcp/* (execute, health, workflows)
HTTP client for 0nMCP. Lets a workflow run any of the 1,640+ 0nMCP tools by name.
Body: \`{ tool: "service.toolName", input: {...} }\`. Returns \`{ output, latency_ms }\`.

\`\`\`js
const r = await fetch('https://www.0ncore.com/api/0nmcp/execute', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    authorization: 'Bearer ' + inputData.oncore_token,
  },
  body: JSON.stringify({
    tool: 'crm.contacts_search',
    input: { query: inputData.email, locationId: inputData.location_id },
  }),
});
return await r.json();
\`\`\`

## Conventions for embedding any 0nCore API in a CRM workflow

1. Add Custom Value \`oncore_token\` (type:plain) to the location.
2. Add Custom Code step. Map prior step values into \`inputData\`.
3. Always \`await fetch(..., { method: 'POST', headers: { authorization: 'Bearer ' + inputData.oncore_token } })\`.
4. Wrap in try/catch; on error \`return { error: e.message }\` so the next If/Else can route to a fallback path.
5. Tag the contact \`oncore::ok\` on success, \`oncore::error::<endpoint>\` on failure — gives ops a Smart List of failures.
6. After Custom Code, use If/Else on \`{{custom_code.<step>.<key>}}\` to branch.
`;
