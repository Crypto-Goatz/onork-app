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
