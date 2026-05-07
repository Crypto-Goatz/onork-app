import { createClient } from '@/lib/supabase/server'
import type { Edge } from '@xyflow/react'
import type { CapabilityNodeType, CapabilityNodeData } from '@/components/automations/CapabilityNode'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Capability {
  id: string
  name: string
  description: string
  category: string
  icon: string
  color: string
  steps: string[]
  configFields?: Array<{
    key: string
    label: string
    type: string
    placeholder?: string
    options?: string[]
    required?: boolean
    default?: string
  }>
}

interface WorkflowUpdate {
  action: 'replace' | 'add' | 'remove'
  name?: string
  nodes: Array<{
    capabilityId: string
    position?: { x: number; y: number }
  }>
}

function buildSystemPrompt(
  capabilities: Capability[],
  currentNodes: CapabilityNodeType[],
  currentEdges: Edge[]
): string {
  const capabilityList = capabilities
    .map((c) => `- ${c.id} | ${c.name} | ${c.description} | category: ${c.category}`)
    .join('\n')

  const workflowState =
    currentNodes.length === 0
      ? 'empty'
      : JSON.stringify(
          {
            nodes: currentNodes.map((n) => ({
              id: n.id,
              capabilityId: n.data.capabilityId,
              name: n.data.name,
              category: n.data.category,
            })),
            edges: currentEdges.map((e) => ({ from: e.source, to: e.target })),
          },
          null,
          2
        )

  return `You are the 0nCore automation builder. You help users create automated workflows by selecting from available capabilities and connecting them.

AVAILABLE CAPABILITIES:
${capabilityList}

CURRENT WORKFLOW:
${workflowState}

When the user describes what they want, respond with:
1. A conversational explanation of what you're building
2. A JSON block (fenced with \`\`\`workflow ... \`\`\`) containing the workflow update

The workflow JSON format:
{
  "action": "replace" | "add" | "remove",
  "name": "Automation Name",
  "nodes": [
    { "capabilityId": "trigger_new_lead", "position": { "x": 400, "y": 80 } },
    { "capabilityId": "score_hot_leads", "position": { "x": 400, "y": 220 } }
  ]
}

Rules:
- Always start with a trigger (category: triggers)
- Connect nodes sequentially
- Use exact capability IDs from the list above — never invent IDs
- Position nodes vertically, 140px apart, centered at x=400 (first node at y=80)
- Be conversational but concise
- For "add" action, only include the new nodes to append
- For "replace" action, include the full workflow from scratch`
}

function parseWorkflowBlock(text: string): WorkflowUpdate | null {
  const match = text.match(/```workflow\s*([\s\S]*?)```/)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim()) as WorkflowUpdate
  } catch {
    return null
  }
}

function capabilityToNodeData(cap: Capability): CapabilityNodeData {
  return {
    capabilityId: cap.id,
    name: cap.name,
    description: cap.description,
    icon: cap.icon,
    color: cap.color,
    category: cap.category,
    configured: false,
    steps: cap.steps,
    config: {},
  }
}

function buildNodesAndEdges(
  workflowUpdate: WorkflowUpdate,
  capabilities: Capability[],
  existingNodes: CapabilityNodeType[],
  existingEdges: Edge[]
): { nodes: CapabilityNodeType[]; edges: Edge[] } {
  const capMap = new Map(capabilities.map((c) => [c.id, c]))

  if (workflowUpdate.action === 'remove') {
    const removeIds = new Set(workflowUpdate.nodes.map((n) => n.capabilityId))
    const nodes = existingNodes.filter((n) => !removeIds.has(n.data.capabilityId))
    const nodeIds = new Set(nodes.map((n) => n.id))
    const edges = existingEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    return { nodes, edges }
  }

  // Build new nodes from the update spec
  const newNodes: CapabilityNodeType[] = workflowUpdate.nodes
    .map((spec, index) => {
      const cap = capMap.get(spec.capabilityId)
      if (!cap) return null
      const position = spec.position ?? { x: 400, y: 80 + index * 140 }
      const id = `node_${Date.now()}_${index}`
      return {
        id,
        type: 'capability' as const,
        position,
        data: capabilityToNodeData(cap),
      } satisfies CapabilityNodeType
    })
    .filter((n): n is CapabilityNodeType => n !== null)

  // Build sequential edges between consecutive nodes
  const newEdges: Edge[] = newNodes.slice(0, -1).map((node, index) => ({
    id: `edge_${node.id}_${newNodes[index + 1].id}`,
    source: node.id,
    target: newNodes[index + 1].id,
    animated: true,
    style: { stroke: '#14b8a6', strokeWidth: 2 },
    type: 'smoothstep',
  }))

  if (workflowUpdate.action === 'add') {
    // Append to existing workflow and connect last existing to first new
    const lastExisting = existingNodes[existingNodes.length - 1]
    const bridgeEdges: Edge[] = []
    if (lastExisting && newNodes.length > 0) {
      bridgeEdges.push({
        id: `edge_${lastExisting.id}_${newNodes[0].id}`,
        source: lastExisting.id,
        target: newNodes[0].id,
        animated: true,
        style: { stroke: '#14b8a6', strokeWidth: 2 },
        type: 'smoothstep',
      })
    }
    return {
      nodes: [...existingNodes, ...newNodes],
      edges: [...existingEdges, ...newEdges, ...bridgeEdges],
    }
  }

  // replace — return only new nodes/edges
  return { nodes: newNodes, edges: newEdges }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    message: string
    currentNodes?: CapabilityNodeType[]
    currentEdges?: Edge[]
    capabilities?: Capability[]
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { message, currentNodes = [], currentEdges = [], capabilities = [] } = body

  if (!message?.trim()) {
    return Response.json({ error: 'Message required' }, { status: 400 })
  }

  const groqKey = (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)[0]

  if (!groqKey) {
    return Response.json({ error: 'No Groq API key configured' }, { status: 500 })
  }

  const systemPrompt = buildSystemPrompt(capabilities, currentNodes, currentEdges)

  let aiText: string | null = null

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        temperature: 0.4,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (groqRes.ok) {
      const data = await groqRes.json()
      aiText = data.choices?.[0]?.message?.content ?? null
    } else {
      const errBody = await groqRes.text()
      console.error('[automations/chat] Groq error:', groqRes.status, errBody)
    }
  } catch (err) {
    console.error('[automations/chat] Groq fetch failed:', err instanceof Error ? err.message : err)
  }

  if (!aiText) {
    return Response.json(
      { error: 'AI service unavailable. Please try again.' },
      { status: 503 }
    )
  }

  // Strip the workflow block from the conversational part
  const conversationalMessage = aiText.replace(/```workflow[\s\S]*?```/g, '').trim()

  // Parse workflow block
  const workflowUpdate = parseWorkflowBlock(aiText)

  if (!workflowUpdate || !workflowUpdate.nodes?.length) {
    // No workflow block — pure conversational response
    return Response.json({ message: conversationalMessage })
  }

  // Map capability IDs to full node + edge data
  const { nodes, edges } = buildNodesAndEdges(
    workflowUpdate,
    capabilities,
    currentNodes,
    currentEdges
  )

  return Response.json({
    message: conversationalMessage,
    workflow: {
      nodes,
      edges,
      name: workflowUpdate.name,
    },
  })
}
