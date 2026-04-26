import type { GigId, GigTemplate } from '../types'
import claudeMcpSetup from './gig-1-claude-mcp-setup'
import aiAgentBuild from './gig-2-ai-agent-build'
import crmAiFunnel from './gig-3-crm-ai-funnel'
import saasLanding from './gig-4-saas-landing'
import linkedinContent from './gig-5-linkedin-content'

const MAP: Record<GigId, GigTemplate> = {
  'claude-mcp-setup': claudeMcpSetup,
  'ai-agent-build': aiAgentBuild,
  'crm-ai-funnel': crmAiFunnel,
  'saas-landing': saasLanding,
  'linkedin-content': linkedinContent,
}

export function getTemplate(gigId: GigId): GigTemplate | null {
  return MAP[gigId] ?? null
}

export function listGigs(): GigId[] {
  return Object.keys(MAP) as GigId[]
}
