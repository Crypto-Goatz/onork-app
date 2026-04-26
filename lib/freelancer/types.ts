// lib/freelancer/types.ts
// Core types for the freelancer fulfillment engine

export type GigId =
  | 'claude-mcp-setup'
  | 'ai-agent-build'
  | 'crm-ai-funnel'
  | 'saas-landing'
  | 'linkedin-content'

export interface OrderContext {
  orderId: string
  userId: string
  gigId: GigId
  rawBrief: string
  parsed: Record<string, unknown>
}

export interface BundleFile {
  path: string
  content: string
}

export interface FulfillmentBundle {
  files: BundleFile[]
  loomScript: string
  deliveryMessage: string
  crmTags: string[]
  upsellHint?: string
}

export interface GigTemplate {
  gigId: GigId
  label: string
  fulfill(ctx: OrderContext): Promise<FulfillmentBundle>
}
