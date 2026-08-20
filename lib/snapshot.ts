/**
 * Snapshot Deployment System
 * Pre-configured CRM setups deployed to new sub-locations.
 * Creates pipeline, custom fields, tags, workflows, knowledge bases, voice agent, chat bot.
 */

import { crmPost, crmGet } from './crm'

export interface SnapshotStage {
  name: string
}

export interface SnapshotCustomField {
  name: string
  type: string
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
      { name: 'Trust Score', type: 'NUMBER', group: 'security' },
      { name: 'K-Layers Active', type: 'NUMBER', group: 'ai' },
      { name: 'Last AI Interaction', type: 'DATE', group: 'ai' },
    ],
    tags: ['0ncore-managed', 'ai-enabled', 'vip', 'active', 'trial', 'churned'],
    workflows: [
      { name: 'Lead Follow-up', trigger: 'contact.created', webhookUrl: 'https://0ncore.com/api/agent-bridge' },
      { name: 'Content Engine', trigger: 'manual', webhookUrl: 'https://0ncore.com/api/workflows/blog-to-social' },
      { name: 'HIPAA Assessment', trigger: 'manual', webhookUrl: 'https://0ncore.com/api/hipaa/scan' },
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

  // 1. Create pipeline with stages
  try {
    const pipelineRes = await crmPost('/opportunities/pipelines', locationId, {
      name: snapshot.config.pipeline.name,
      stages: snapshot.config.pipeline.stages.map((s, i) => ({
        name: s.name,
        position: i,
      })),
    })
    if (pipelineRes.ok) {
      const data = await pipelineRes.json()
      deployed.push({ type: 'pipeline', name: snapshot.config.pipeline.name, id: data.pipeline?.id || data.id })
    } else {
      const text = await pipelineRes.text()
      errors.push(`Pipeline: ${pipelineRes.status} — ${text}`)
    }
  } catch (e) {
    errors.push(`Pipeline: ${e instanceof Error ? e.message : 'unknown error'}`)
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
      const res = await crmPost(`/locations/${locationId}/customValues`, locationId, {
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
        if (!/already exists|duplicate/i.test(text)) {
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
      const res = await crmPost('/locations/customFields', locationId, {
        name: field.name,
        dataType: field.type,
        group: field.group,
      })
      if (res.ok) {
        const data = await res.json()
        deployed.push({ type: 'customField', name: field.name, id: data.customField?.id || data.id })
      } else {
        const text = await res.text()
        errors.push(`Custom field "${field.name}": ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`Custom field "${field.name}": ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // 3. Create tags
  for (const tag of snapshot.config.tags) {
    try {
      const res = await crmPost('/locations/tags', locationId, { name: tag })
      if (res.ok) {
        deployed.push({ type: 'tag', name: tag })
      } else {
        const text = await res.text()
        errors.push(`Tag "${tag}": ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`Tag "${tag}": ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // 4. Register webhook-based workflows
  for (const wf of snapshot.config.workflows) {
    try {
      // Register webhook that triggers the workflow
      const res = await crmPost('/webhooks', locationId, {
        url: wf.webhookUrl,
        events: [wf.trigger],
        name: wf.name,
      })
      if (res.ok) {
        const data = await res.json()
        deployed.push({ type: 'workflow', name: wf.name, id: data.webhook?.id || data.id })
      } else {
        const text = await res.text()
        errors.push(`Workflow "${wf.name}": ${res.status} — ${text}`)
      }
    } catch (e) {
      errors.push(`Workflow "${wf.name}": ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  // 5. Create knowledge bases (K1-K4)
  for (const kb of snapshot.config.knowledgeBases) {
    try {
      const res = await crmPost('/knowledge-base', locationId, {
        name: `[${kb.slot}] ${kb.name}`,
        description: kb.description,
      })
      if (res.ok) {
        const data = await res.json()
        deployed.push({ type: 'knowledgeBase', name: `[${kb.slot}] ${kb.name}`, id: data.id || data.knowledgeBase?.id })
      } else {
        const text = await res.text()
        errors.push(`KB "${kb.slot}": ${res.status} — ${text}`)
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
  }
}
