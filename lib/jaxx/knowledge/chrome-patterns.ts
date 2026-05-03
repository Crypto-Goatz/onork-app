/**
 * Knowledge layer: Claude-Chrome instruction templates.
 *
 * Each template is a numbered, click-by-click recipe Claude Chrome can run
 * inside the CRM dashboard. Placeholders look like {{<name>}} so Jaxx can
 * substitute the user's specifics when emitting the final instruction.
 *
 * Selectors are described semantically ("the 'Add Trigger' button in the
 * left panel of the workflow builder") rather than as CSS — Claude Chrome
 * resolves them visually.
 */

export const CHROME_PATTERNS_KNOWLEDGE = `
# Claude-Chrome instruction templates (CRM dashboard)

Every emitted instruction set follows this shape:

\`\`\`
SURFACE: <crm | sites | conversations | calendars | settings | marketplace>
PRECONDITIONS:
  - User is logged in to https://app.<crm-host>/ (\`{{crm_host}}\`).
  - Sub-account context is \`{{location_id}}\` (location switcher top-left).
STEPS:
  1. ...
  2. ...
SUCCESS CHECK: <what should be visible on screen at the end>
\`\`\`

## Navigate to a sub-account

\`\`\`
1. Click the "Sub-Account" switcher in the top-left header.
2. Type "{{location_name}}" into the search input.
3. Click the matching row.
4. Wait for the dashboard to load (URL ends with /location/{{location_id}}).
\`\`\`

## Create a workflow from scratch

\`\`\`
SURFACE: workflows
1. From the left nav, click "Automation" then "Workflows".
2. Click the "+ Create Workflow" button (top-right).
3. Choose "Start from Scratch" in the modal.
4. In the title field, type "{{workflow_name}}".
5. Click "Create Workflow".
6. Wait for the workflow canvas to load (empty canvas + "Add New Trigger" placeholder).
\`\`\`

## Add a trigger

\`\`\`
1. Click "Add New Trigger".
2. In the right-side drawer, search "{{trigger_label}}" and pick "{{trigger_type}}".
3. Set the trigger filters (per spec):
   {{#each filters}}
   - Click "+ Add filter", set field "{{this.field}}", operator "{{this.op}}", value "{{this.value}}".
   {{/each}}
4. Click "Save Trigger".
\`\`\`

## Add an action (generic)

\`\`\`
1. Click the "+" below the previous step.
2. In the right drawer, search "{{action_label}}" and click "{{action_type}}".
3. Configure each parameter:
   {{#each params}}
   - Field "{{this.label}}": set to "{{this.value}}".
   {{/each}}
4. Click "Save Action".
\`\`\`

## Add a Custom Code action that calls 0nCore

\`\`\`
1. Click "+" below the prior step.
2. Search "Custom Code" and select it.
3. In the editor, paste the following (substituting {{...}} from prior steps):

   \`\`\`js
   const r = await fetch('https://www.0ncore.com{{endpoint}}', {
     method: 'POST',
     headers: {
       'content-type': 'application/json',
       authorization: 'Bearer ' + inputData.oncore_token,
     },
     body: JSON.stringify({{request_body_json}}),
   });
   const data = await r.json();
   return data;
   \`\`\`

4. In the "Test Values" panel, set:
   - oncore_token = (paste a 0n_ test token; replaced at run-time by Custom Value)
   {{#each test_inputs}}
   - {{this.key}} = {{this.value}}
   {{/each}}
5. Click "Run Test". Confirm the response panel shows expected JSON.
6. Click "Save Action".
\`\`\`

After saving, in the Custom Value mapping for the action's \`oncore_token\`:

\`\`\`
1. Click the {{}} placeholder beside "oncore_token".
2. Switch to "Custom Values" tab.
3. Pick "oncore_token". Save.
\`\`\`

## Add If/Else after a Custom Code step

\`\`\`
1. Click "+" below the Custom Code step.
2. Pick "If/Else".
3. In the first branch, click "+ Add filter".
4. Source: "Workflow Data". Field: "custom_code.{{step_name}}.{{output_key}}".
   Operator: "{{op}}". Value: "{{value}}".
5. Save the branch. Repeat for additional branches.
\`\`\`

## Add a Wait step

\`\`\`
1. Click "+" then choose "Wait".
2. Type: "{{wait_type}}" (Specific Time / Time Delay / Event / Date Field).
3. Configure per type and Save.
\`\`\`

## Configure tracking on a Send Email step

\`\`\`
1. In the email step config, scroll to "Tracking".
2. Toggle "Track Opens" and "Track Clicks" ON.
3. In the body, replace each external URL with a Trigger Link:
   - Click the "Insert Trigger Link" button in the editor toolbar.
   - Pick "{{trigger_link_name}}" from the dropdown.
   - The link URL will now be a tracked short link.
4. Append UTMs to the trigger-link target URL: \`?utm_source=crm&utm_medium=email&utm_campaign={{campaign}}&utm_content={{content_id}}\`.
5. Save.
\`\`\`

## Build a landing page

\`\`\`
SURFACE: sites
1. From the left nav, click "Sites" then "Funnels" (or "Websites").
2. Click "+ New Funnel" (or "+ Create Page").
3. Name it "{{funnel_name}}". Click Create.
4. Click "+ Add Step", name "{{step_name}}", choose template or blank.
5. Click "Edit Page" to enter the builder.
6. Drag a "Section" onto canvas; inside drop "Headline" and set text "{{headline}}".
7. Drop a "Form" element. Configure: "{{form_id}}" or create new with fields {{form_fields}}.
8. Drop a "Button" — text "{{cta_text}}", action "Submit Form".
9. Top-right click "Save", then "Publish".
10. Note the published URL (\`https://{{custom_domain}}/{{funnel_slug}}\`).
\`\`\`

## Configure an email template

\`\`\`
SURFACE: marketing
1. Left nav → "Marketing" → "Emails" → "Templates".
2. Click "+ New" → choose "Builder" or "HTML Code".
3. Name "{{template_name}}".
4. Build / paste content. Use merge fields {{contact.first_name}}, {{custom_values.business_name}}, etc.
5. Save. Use this template ID later in workflow Send Email steps.
\`\`\`

## Create a trigger link

\`\`\`
SURFACE: marketing
1. Left nav → "Marketing" → "Trigger Links".
2. Click "+ New".
3. Name "{{link_name}}". Redirect URL "{{target_url}}".
4. Save. The short URL appears in the row — copy it.
\`\`\`

## Install Facebook Pixel

\`\`\`
SURFACE: settings
1. Top-right gear → "Settings" → "Tracking & Analytics" (or "Business Profile" → "Tracking").
2. Find "Facebook Pixel ID" field, paste "{{pixel_id}}". Save.
3. To verify: open any funnel/site page, view source, search for "fbq('init'".
\`\`\`

## Schedule a social post

\`\`\`
SURFACE: social
1. Left nav → "Marketing" → "Social Planner".
2. Click "+ New Post".
3. Pick channels (toggle FB / IG / LinkedIn / GMB / X / TikTok / YouTube / Pinterest).
4. Paste caption "{{caption}}", attach media.
5. Click the calendar icon → set date "{{schedule_at}}".
6. Click "Schedule Post".
\`\`\`

## Set up a Custom Webhook trigger

\`\`\`
1. In the workflow, set Trigger to "Inbound Webhook".
2. Copy the displayed Webhook URL (https://services.leadconnectorhq.com/hooks/<id>).
3. Click "Sample Request" then in another tab POST a sample payload to the URL.
4. Back in CRM, click "Capture Sample" so the field map populates.
5. Map fields: each path in the JSON becomes \`{{webhook.<path>}}\` available downstream.
6. Save Trigger.
\`\`\`

## Add a Custom Value

\`\`\`
SURFACE: settings
1. Top-right gear → "Settings" → "Custom Values".
2. Click "+ New Folder" / "+ New Custom Value".
3. Name "{{value_name}}", value "{{value}}".
4. Save. Reference as \`{{custom_values.{{value_name}}}}\` in workflows.
\`\`\`

## Activate / Publish a workflow

\`\`\`
1. Top-right toggle "Draft / Publish" → switch to **Publish**.
2. Confirm in the modal "I understand this will run live".
3. Verify the toggle now reads "Published" and the canvas badge is green.
\`\`\`

## Final emission rules for Jaxx

When you produce instructions:

1. Open every recipe with the \`SURFACE\` / \`PRECONDITIONS\` block.
2. Number every step.
3. Reference UI labels in quotes ("+ Create Workflow", "Save Action").
4. Use placeholders \`{{...}}\` only where the user's spec hasn't given a value.
5. End with a SUCCESS CHECK line stating the visible end-state.
`;
