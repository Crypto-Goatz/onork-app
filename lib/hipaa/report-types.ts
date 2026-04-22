/**
 * Shared shapes for the tier-aware HIPAA report.
 * Both the AI generator (onork-app) and the renderer (rocketopp.com) import these.
 */

export type Tier = 1 | 2 | 3 | 4

export const TIER_META: Record<Tier, {
  name: string
  priceCents: number
  anchorCents?: number
  includesDevCode: boolean
  includesNprmOverlay: boolean
  includesSupportCall: boolean
  aiModel: 'groq' | 'sonnet' | 'hybrid'
  blurb: string
}> = {
  1: { name: 'Current HIPAA · Cited Issues',      priceCents: 14900, includesDevCode: false, includesNprmOverlay: false, includesSupportCall: false, aiModel: 'groq',   blurb: 'Current HIPAA issues + citations + plain-English explanations.' },
  2: { name: 'Current HIPAA · Developer Fix Kit', priceCents: 39900, includesDevCode: true,  includesNprmOverlay: false, includesSupportCall: false, aiModel: 'sonnet', blurb: 'Everything in Tier 1 + developer-grade fix steps with code, commands, file diffs.' },
  3: { name: 'Current + 2026 NPRM · Overview',    priceCents: 49900, includesDevCode: false, includesNprmOverlay: true,  includesSupportCall: false, aiModel: 'groq',   blurb: 'Current + upcoming 2026 NPRM rules with side-by-side delta analysis.' },
  4: { name: 'Full Compliance · Everything',      priceCents: 89900, anchorCents: 149900, includesDevCode: true, includesNprmOverlay: true, includesSupportCall: true, aiModel: 'hybrid', blurb: 'Everything above + developer fixes + 60-day free support call with a compliance engineer.' },
}

export interface ReportFinding {
  checkId: string
  name: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'pass' | 'warning' | 'fail' | 'attestation-required'
  category: 'technical' | 'administrative' | 'organizational'
  ruleSection: string              // e.g. "164.312(d)"
  currentRuleStatus: 'required' | 'addressable' | 'not-specified'
  nprm2026: 'required' | 'new-requirement' | 'removed' | 'unchanged' | 'not-specified'
  impact: string
  effort: 'low' | 'medium' | 'high'
  originalDetail: string          // scanner's raw finding

  // AI-written content
  explanation: string             // plain-English, 2–4 sentences
  whyItFails?: string             // "why HIPAA would flag this" paragraph
  devFix?: DeveloperFix           // only populated for Tier 2 + 4
  nprmAnalysis?: NprmAnalysis     // only populated for Tier 3 + 4
}

export interface DeveloperFix {
  stackDetected?: string           // e.g. "Next.js 16 on Vercel"
  steps: DeveloperStep[]
  verificationCommand?: string
  expectedOutput?: string
  estimatedMinutes: number
}

export interface DeveloperStep {
  index: number
  title: string
  body: string                     // markdown — supports code fences
}

export interface NprmAnalysis {
  today: string                    // short paragraph on current rule
  underNprm: string                // short paragraph on what 2026 changes
  whatThisMeans: string            // business-impact paragraph
  relatedChanges?: string[]        // bullet list of related NPRM deltas
}

export interface AttestationItem {
  checkId: string
  name: string
  ruleSection: string
  severity: string
  instruction: string              // "You must document X and retain Y"
  templateLinkRef?: string         // reference to a template in the report
}

export interface RemediationStep {
  priority: number
  checkId: string
  name: string
  severity: string
  effort: string
  estimatedMinutes: number
}

export interface FullReport {
  orderId: string
  tier: Tier
  companyName: string
  publicUrl: string
  dashboardUrl: string
  currentGrade: string
  currentRuleScore: number
  nprmGrade: string
  nprm2026Score: number
  scanDate: string
  customerEmail: string

  executiveSummary: string         // AI-written 2–3 paragraphs
  findings: ReportFinding[]
  attestationItems: AttestationItem[]
  remediationPlan: RemediationStep[]

  supportCallUrl?: string          // only populated if tier includes it
  supportCallExpiresAt?: string

  meta: {
    generatedBy: 'groq' | 'sonnet' | 'hybrid'
    tokensUsed: number
    durationMs: number
    generatedAt: string
  }
}
