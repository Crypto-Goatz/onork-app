/**
 * Snapshot Deployment System
 * Pre-configured CRM setups deployed to new sub-locations.
 * Creates pipeline, custom fields, tags, workflows, knowledge bases, voice agent, chat bot.
 */

import { crmPost, crmPostRaw, crmGet } from './crm'

export interface SnapshotStage {
  name: string
}

export interface SnapshotCustomField {
  name: string
  /**
   * One of the platform's 15 accepted values, verbatim — TEXT, LARGE_TEXT,
   * NUMERICAL, PHONE, MONETORY, CHECKBOX, SINGLE_OPTIONS, MULTIPLE_OPTIONS,
   * FLOAT, TIME, DATE, TEXTBOX_LIST, FILE_UPLOAD, SIGNATURE, RADIO.
   * Not "NUMBER" — the obvious guess, and a 422 (measured 2026-08-20).
   */
  type: string
  /** Intended field folder. Not sent on create — see the POST below. */
  group: string
}

export interface SnapshotWorkflow {
  name: string
  trigger: string
  webhookUrl: string
}

export interface SnapshotKB {
  slot: string
  name: string
  description: string
}

export interface SnapshotVoiceAgent {
  name: string
  greeting: string
  prompt: string
}

export interface SnapshotChatBot {
  name: string
  prompt: string
}

export interface SnapshotConfig {
  pipeline: {
    name: string
    stages: SnapshotStage[]
  }
  /**
   * CUSTOM VALUES — the variables every workflow reads from.
   *
   * This is what makes a snapshot portable. A workflow that hardcodes a phone
   * number works in exactly one account; a workflow that says
   * {{custom_values.booking_link}} works in all of them, and an agency
   * onboarding a client fills in values rather than rebuilding automations.
   *
   * They are seeded EMPTY on purpose, with the key present. A key that exists
   * with no value renders as blank — recoverable, and obvious in the UI. A key
   * that does not exist renders the raw {{custom_values.x}} token into a
   * customer-facing email, which is the failure people actually notice.
   */
  customValues: SnapshotCustomValue[]
  customFields: SnapshotCustomField[]
  tags: string[]
  workflows: SnapshotWorkflow[]
  knowledgeBases: SnapshotKB[]
  voiceAgent?: SnapshotVoiceAgent
  chatBot?: SnapshotChatBot
  socialCategories?: string[]
}

export interface Snapshot {
  id: string
  name: string
  description: string
  version: string
  config: SnapshotConfig
}

export interface DeployResult {
  success: boolean
  deployed: { type: string; name: string; id?: string }[]
  errors: string[]
  /**
   * Parts of the snapshot this route CANNOT deploy, and why — separated from
   * `errors` on purpose. An error is something that might have gone otherwise;
   * these never can, at any scope, and reporting them as failures taught every
   * reader to expect a red deploy and ignore it. A caller that sees `success:
   * true` with a populated `unsupported` knows exactly what it got and exactly
   * what the platform snapshot still has to carry.
   */
  unsupported: { type: string; name: string; reason: string }[]
}

/** One agency-configurable variable, referenced by workflows as {{custom_values.<key>}}. */
export interface SnapshotCustomValue {
  name: string
  key: string
  /** Seeded value. Empty means "the agency fills this in" — see the note on the type. */
  value: string
  /** Why it exists, so an agency filling these in knows what it drives. */
  purpose: string
}

/**
 * THE AGENCY VARIABLE SET — everything a workflow, email or AI agent needs to
 * speak as the client instead of as a template.
 *
 * Grouped by what breaks when it is missing, not alphabetically:
 *   identity   an email signed by nobody
 *   booking    a call-to-action with nowhere to go
 *   support    a customer who cannot reach anyone
 *   brand      an AI that does not sound like the business
 *   offer      a pitch with no price and no promise
 *   legal      a marketing email that is not compliant to send
 */
export const AGENCY_CUSTOM_VALUES: SnapshotCustomValue[] = [
  // identity
  { name: 'Business Name',        key: 'business_name',    value: '', purpose: 'Every email, SMS and AI reply says this name.' },
  { name: 'Business Email',       key: 'business_email',   value: '', purpose: 'Reply-to on outbound mail.' },
  { name: 'Business Phone',       key: 'business_phone',   value: '', purpose: 'Shown in signatures and given out by the AI agent.' },
  { name: 'Business Address',     key: 'business_address', value: '', purpose: 'Required in marketing email footers to be lawful to send.' },
  { name: 'Website',              key: 'website_url',      value: '', purpose: 'Linked from emails and the AI agent.' },
  { name: 'Owner First Name',     key: 'owner_first_name', value: '', purpose: 'Personal sign-off — "— Rachel" beats "— The Team".' },

  // booking
  { name: 'Booking Link',         key: 'booking_link',     value: '', purpose: 'THE call to action. Every nurture sequence points here.' },
  { name: 'Calendar Name',        key: 'calendar_name',    value: '', purpose: 'What the AI calls the calendar when it offers times.' },
  { name: 'Business Hours',       key: 'business_hours',   value: '', purpose: 'Stops the AI booking or promising outside opening times.' },
  { name: 'Timezone',             key: 'timezone',         value: '', purpose: 'Every scheduled send and reminder resolves against this.' },

  // support
  { name: 'Support Email',        key: 'support_email',    value: '', purpose: 'Where "reply if you need help" actually goes.' },
  { name: 'Support Phone',        key: 'support_phone',    value: '', purpose: 'Never a placeholder — a wrong number is acted on immediately.' },

  // brand + AI voice
  { name: 'AI Assistant Name',    key: 'ai_name',          value: '', purpose: 'The agency names their AI. It signs messages with this.' },
  { name: 'Brand Tone',           key: 'brand_tone',       value: '', purpose: 'Warm / direct / clinical — drives every generated message.' },
  { name: 'Brand Primary Color',  key: 'brand_color',      value: '', purpose: 'Buttons and headers in generated pages and emails.' },
  { name: 'Logo URL',             key: 'logo_url',         value: '', purpose: 'Email headers, sales pages, course covers.' },

  // offer
  { name: 'Primary Offer',        key: 'primary_offer',    value: '', purpose: 'What this business actually sells, in one line.' },
  { name: 'Offer Price',          key: 'offer_price',      value: '', purpose: 'Quoted by the AI and printed on sales pages.' },
  { name: 'Guarantee',            key: 'guarantee',        value: '', purpose: 'The risk-reversal line that closes.' },
  { name: 'Service Area',         key: 'service_area',     value: '', purpose: 'Stops the AI promising service where they do not operate.' },

  // legal
  { name: 'Unsubscribe Text',     key: 'unsubscribe_text', value: '', purpose: 'Footer wording for marketing mail.' },
  { name: 'Privacy Policy URL',   key: 'privacy_url',      value: '', purpose: 'Linked from forms and footers.' },
]

/**
 * THE AI PLAN IS NOT EVERYWHERE — Mike, 2026-08-20.
 *
 * **`nphConTwfHcVE1oA0uep` is the ONLY location with the AI workflow ($97) plan.**
 *
 * This app is installed in 100 sub-accounts. Anything below that depends on
 * Conversation AI — knowledge bases, the voice agent, the chat bot, and any
 * workflow whose value comes from an AI action — will deploy into the other 99
 * and then simply never work. Not error. Not warn. Sit there looking configured.
 *
 * That is the worst failure shape this codebase keeps producing: a green tick
 * over something that cannot run. So AI-dependent pieces are declared HERE,
 * separately, and `deploySnapshot` skips them unless the target location is
 * known to carry the plan — and says out loud that it skipped them.
 *
 * When more accounts get the plan, add them to this list. Do not infer it from
 * anything else; there is no API that reports plan entitlement, so a guess here
 * becomes a silent outage in a client's account.
 */
export const AI_PLAN_LOCATIONS = new Set<string>([
  'nphConTwfHcVE1oA0uep',
])

/** Does this location carry the AI workflow plan? */
export function hasAiPlan(locationId: string): boolean {
  return AI_PLAN_LOCATIONS.has(locationId)
}

export const MASTER_SNAPSHOT: Snapshot = {
  id: 'master-v1',
  name: '0nCore Master Snapshot',
  description: 'Complete 0nCore setup with pipeline, custom fields, K-layers, workflows, voice AI, and chat bot',
  version: '1.0.0',
  config: {
    pipeline: {
      name: '0nCore Pipeline',
      stages: [
        { name: 'New Lead' },
        { name: 'Contacted' },
        { name: 'Qualified' },
        { name: 'Proposal Sent' },
        { name: 'Negotiation' },
        { name: 'Won' },
        { name: 'Lost' },
      ],
    },
    customValues: AGENCY_CUSTOM_VALUES,
    customFields: [
      { name: '0nCore User ID', type: 'TEXT', group: 'general' },
      { name: '0nCore Tier', type: 'TEXT', group: 'general' },
      { name: 'Trust Score', type: 'NUMERICAL', group: 'security' },
      { name: 'K-Layers Active', type: 'NUMERICAL', group: 'ai' },
      { name: 'Last AI Interaction', type: 'DATE', group: 'ai' },
    ],
    tags: ['0ncore-managed', 'ai-enabled', 'vip', 'active', 'trial', 'churned'],
    workflows: [
      { name: 'Lead Follow-up', trigger: 'contact.created', webhookUrl: 'https://app.0ncore.com/api/agent-bridge' },
      { name: 'Content Engine', trigger: 'manual', webhookUrl: 'https://app.0ncore.com/api/workflows/blog-to-social' },
      { name: 'HIPAA Assessment', trigger: 'manual', webhookUrl: 'https://app.0ncore.com/api/hipaa/scan' },
    ],
    knowledgeBases: [
      { slot: 'K1', name: 'Platform', description: '0nCore platform knowledge' },
      { slot: 'K2', name: 'Brand & Design', description: 'Brand voice, colors, fonts' },
      { slot: 'K3', name: 'Company', description: 'Business knowledge (FREE)' },
      { slot: 'K4', name: '0nAI Security', description: 'Trust engine and behavioral auth' },
    ],
  },
}

/**
 * Is this rejection just "it is already there"?
 *
 * A snapshot has to be safe to re-run — an agency that adds a client, then
 * re-deploys, must not get a red result for the twenty things that were already
 * correct. The platform does not phrase this one way:
 *   custom value  400 "...already exists..."
 *   tag           400 "The tag name is already exist."     <- not a typo on our side
 * The first version matched /already exists|duplicate/, which silently missed
 * the tag wording and turned every re-run into two hard errors (measured
 * 2026-08-20 on a live re-deploy). Match the platform's words, not ours.
 */
function isAlreadyExists(text: string): boolean {
  return /already\s*exist|duplicate/i.test(text)
}

/**
 * Deploy a snapshot to a CRM sub-location.
 * Calls CRM API to create pipeline, custom fields, tags, workflows, KBs, etc.
 */
export async function deploySnapshot(
  locationId: string,
  snapshot: Snapshot,
  token: string
): Promise<DeployResult> {
  const deployed: DeployResult['deployed'] = []
  const errors: string[] = []
  const unsupported: DeployResult['unsupported'] = []

  /**
   * 1. PIPELINE — NOT DEPLOYABLE BY API, and saying so is the fix.
   *
   * Measured 2026-08-20 against a 142-scope location token that holds
   * `opportunities.write` and reads GET /opportunities/pipelines with a 200:
   * POST /opportunities/pipelines answers 401 "The token is not authorized for
   * this scope" — with or without the trailing slash. Pipeline CREATE is not an
   * OAuth capability at any scope we can be granted; the same is true of
   * workflows (see below).
   *
   * So this ran on every deploy, failed on every deploy, and pushed one line
   * into errors[] that read like a permissions hiccup. It was a category error:
   * the platform's own SNAPSHOT is the mechanism for pipelines and workflows
   * (CRM_MASTER_SNAPSHOT_ID, applied at provision time in lib/provision.ts).
   * This function is the API-deployable REMAINDER, and it now says which half
   * it is rather than pretending to be the whole.
   */
  unsupported.push({
    type: 'pipeline',
    name: snapshot.config.pipeline.name,
    reason: 'POST /opportunities/pipelines returns 401 at every scope (measured 2026-08-20). Pipelines ship via the platform snapshot CRM_MASTER_SNAPSHOT_ID, not this route.',
  })

  /**
   * PLAN GATE — checked once, before anything AI-dependent is attempted.
   *
   * A knowledge base or voice agent deployed into an account without the AI
   * workflow plan does not fail; it lands and never runs. Skipping is reported
   * in `deployed` as an explicit skip so a caller can tell "not deployed" from
   * "deployed and dead", which are different problems with different fixes.
   */
  const aiEnabled = hasAiPlan(locationId)
  if (!aiEnabled) {
    deployed.push({
      type: 'skipped',
      name: 'AI features (knowledge bases, voice agent, chat bot) — this location has no AI workflow plan',
    })
  }

  /**
   * 1b. Custom VALUES — before workflows, deliberately.
   *
   * A workflow that references {{custom_values.booking_link}} in an account
   * where the key does not exist renders the raw token into a customer-facing
   * email. Creating the keys first means the worst case is a blank, which is
   * recoverable and visible, rather than a template artefact in someone's inbox.
   *
   * Each one is independent: a single rejected key must not stop the other
   * twenty-one, because a partially-configured account is still usable and a
   * failed deploy is not.
   */
  for (const cv of snapshot.config.customValues ?? []) {
    try {
      // crmPostRaw, NOT crmPost. crmPost merges `locationId` into every body,
      // and this sub-resource rejects it outright:
      //   422 ["property locationId should not exist"]  (measured 2026-08-20)
      // The location is already in the path. Same body without the injection
      // validates cleanly, so the shape below is the one the platform accepts.
      const res = await crmPostRaw(`/locations/${locationId}/customValues`, locationId, {
        name: cv.name,
        value: cv.value,
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        deployed.push({ type: 'customValue', name: cv.name, id: data?.customValue?.id || data?.id })
      } else {
        const text = await res.text()
        // 400 on an existing key is idempotency, not failure — re-running a
        // snapshot on a configured account must be safe.
        if (!isAlreadyExists(text)) {
          errors.push(`Custom value ${cv.key}: ${res.status} — ${text.slice(0, 120)}`)
        }
      }
    } catch (e) {
      errors.push(`Custom value ${cv.key}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // 2. Create custom fields
  for (const field of snapshot.config.customFields) {
    try {
      // POST /locations/customFields is 404 "Cannot POST /locations/customFields".
      // The field collection is a SUB-RESOURCE of the location, and carrying
      // locationId in the body of one is a 422. Measured 2026-08-20.
      const res = await crmPostRaw(`/locations/${locationId}/customFields`, locationId, {
        name: field.name,
        dataType: field.type,
        // `group` is NOT sent: 422 "property group should not exist". It stays
        // on SnapshotCustomField because it is how we intend to organise these
        // in the UI, but field folders are their own endpoint — putting it in
        // the create body rejected the whole field. Measured 2026-08-20.
      })
      if (res.ok) {
        const data = await res.json()
        deployed.push({ type: 'customField', name: field.name, id: data.customField?.id || data.id })
      } else {
        const text = await res.text()
        if (!isAlreadyExists(text)) errors.push(`Custom field "${field.name}": ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`Custom field "${field.name}": ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // 3. Create tags
  for (const tag of snapshot.config.tags) {
    try {
      // POST /locations/tags is 404 "Cannot POST /locations/tags" — same
      // sub-resource shape as customFields. Measured 2026-08-20.
      const res = await crmPostRaw(`/locations/${locationId}/tags`, locationId, { name: tag })
      if (res.ok) {
        deployed.push({ type: 'tag', name: tag })
      } else {
        const text = await res.text()
        if (!isAlreadyExists(text)) errors.push(`Tag "${tag}": ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`Tag "${tag}": ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  /**
   * 4. WORKFLOWS — also not an API, and for a second reason.
   *
   * The old code posted to POST /webhooks. That path is a bare 404 with no
   * response body, as is /hooks — neither endpoint exists. And the thing it was
   * standing in for does not exist either: POST /workflows/ answers
   *   404 "Cannot POST /workflows/"
   * while GET /workflows/ returns the account's real workflows with a 200.
   * workflows-v3 is read-only. (Measured 2026-08-20; matches the deprecation
   * note already in lib/crm.ts on enrollInWorkflow.)
   *
   * Three fabricated errors per deploy, every deploy, worded as if a retry
   * might help. Workflows arrive with the platform snapshot; what THIS codebase
   * can do afterwards is enroll a contact into one — enrollInWorkflow() in
   * lib/crm.ts, which needs only contacts.write.
   */
  for (const wf of snapshot.config.workflows) {
    unsupported.push({
      type: 'workflow',
      name: wf.name,
      reason: 'POST /workflows/ is 404 (workflows-v3 is read-only) and POST /webhooks does not exist. Workflows ship via the platform snapshot; use enrollInWorkflow() to put a contact into one.',
    })
  }

  /**
   * 5. KNOWLEDGE BASES (K1-K4) — read first, because create is not idempotent
   * and does not tell you so.
   *
   * POST /knowledge-bases/ with a name that already exists does NOT 400. It
   * answers 201 and quietly stores `[K4] 0nAI Security 1787197908356` — the
   * name with a timestamp appended. Measured on a live re-deploy 2026-08-20:
   * a second run produced four more knowledge bases, all suffixed, and reported
   * four successes.
   *
   * That is worse than an error. The slot prefix is how everything downstream
   * finds these ("the K2 brand board"), so a re-run doesn't just litter — it
   * makes the lookup ambiguous, while the deploy result says it went perfectly.
   * So: list the location's knowledge bases and skip any slot already present.
   */
  let existingKbNames: string[] = []
  try {
    // crmGet appends `?locationId=` itself. Passing it in the path too sends
    // the param TWICE, which this platform answers with a bogus 403 — the
    // failure mode already recorded for /conversation-ai. Let the helper do it.
    const listRes = await crmGet('/knowledge-bases/', locationId)
    if (listRes.ok) {
      const listed = await listRes.json().catch(() => null)
      existingKbNames = (listed?.data?.knowledgeBases ?? listed?.knowledgeBases ?? [])
        .map((k: { name?: string }) => k?.name || '')
    } else {
      // Cannot read them ⇒ cannot create them safely. Creating blind is what
      // produced the suffixed duplicates in the first place.
      errors.push(`Knowledge bases: could not list existing (${listRes.status}); skipped to avoid creating duplicates.`)
      existingKbNames = []
    }
  } catch (e) {
    errors.push(`Knowledge bases: could not list existing (${e instanceof Error ? e.message : 'unknown'}); skipped to avoid creating duplicates.`)
  }

  for (const kb of snapshot.config.knowledgeBases) {
    const kbName = `[${kb.slot}] ${kb.name}`
    // Prefix match, not equality — an earlier bad run left `[K1] Platform
    // 1787197908356` behind, and that slot IS taken even though the name differs.
    if (existingKbNames.some((n) => n.startsWith(`[${kb.slot}]`))) {
      deployed.push({ type: 'knowledgeBase', name: `${kbName} (already present)` })
      continue
    }
    try {
      // PLURAL, with the trailing slash. `/knowledge-base` is a bare 404 with
      // no body at all — the shape of a path that does not exist, not of a
      // request that was refused. Measured 2026-08-20.
      const res = await crmPost('/knowledge-bases/', locationId, {
        name: kbName,
        description: kb.description,
      })
      if (res.ok) {
        const data = await res.json()
        deployed.push({ type: 'knowledgeBase', name: kbName, id: data.id || data.knowledgeBase?.id })
        existingKbNames.push(kbName)
      } else {
        const text = await res.text()
        if (!isAlreadyExists(text)) errors.push(`KB "${kb.slot}": ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`KB "${kb.slot}": ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // 6. Optionally create voice agent
  if (snapshot.config.voiceAgent) {
    try {
      const va = snapshot.config.voiceAgent
      const res = await crmPost('/voice-ai/agents', locationId, {
        name: va.name,
        greeting: va.greeting,
        prompt: va.prompt,
      })
      if (res.ok) {
        const data = await res.json()
        deployed.push({ type: 'voiceAgent', name: va.name, id: data.id || data.agent?.id })
      } else {
        const text = await res.text()
        errors.push(`Voice agent: ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`Voice agent: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return {
    success: errors.length === 0,
    deployed,
    errors,
    unsupported,
  }
}
