import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CRM_BASE = 'https://services.leadconnectorhq.com'
const CRM_VERSION = '2021-07-28'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { businessName, industry, services, phone, website, bookingUrl, aiName } = await req.json()
  const locationId = user.user_metadata?.active_location_id || process.env.CRM_LOCATION_ID
  const agentPit = process.env.CRM_AGENT_STUDIO_PIT || process.env.CRM_AGENCY_PIT

  // Update CRM custom values if we have access
  if (agentPit && locationId) {
    // Update agent prompt with business data
    try {
      // List agents to find the customer's agent
      const agentsRes = await fetch(`${CRM_BASE}/agent-studio/agents?locationId=${locationId}`, {
        headers: {
          Authorization: `Bearer ${agentPit}`,
          Version: CRM_VERSION,
        },
      })

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        const agent = agentsData.agents?.[0]

        if (agent?.productionVersion?.versionId) {
          const newPrompt = `You are ${aiName || '0nAI'}, the AI assistant for ${businessName}.
Industry: ${industry}
Services offered: ${services}
Phone: ${phone || 'Not provided'}
Website: ${website || 'Not provided'}
Booking: ${bookingUrl || 'Not provided'}

You help ${businessName} manage their business, answer client questions, book appointments, and run automations. Be professional, concise, and helpful. Always check the knowledge base first for business-specific information.`

          // Update the agent version with the new prompt
          await fetch(`${CRM_BASE}/agent-studio/agents/${agent.agentId}/versions/${agent.productionVersion.versionId}`, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${agentPit}`,
              Version: CRM_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              locationId,
              nodes: agent.productionVersion.nodes?.map((n: any) =>
                n.nodeType === 'llmNode'
                  ? { ...n, nodeConfig: { ...n.nodeConfig, prompt: newPrompt } }
                  : n
              ),
            }),
          }).catch(() => {})
        }
      }
    } catch (err) {
      console.error('[onboarding] Agent update failed:', err)
    }
  }

  return NextResponse.json({ success: true })
}
