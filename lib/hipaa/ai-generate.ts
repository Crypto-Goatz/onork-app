/**
 * AI personalization engine for tiered HIPAA reports.
 *
 * Tier 1 → Groq llama-3.3-70b, plain-English explanations only
 * Tier 2 → Sonnet 4.6, explanations + developer fixes with code
 * Tier 3 → Groq, explanations + NPRM 2026 delta
 * Tier 4 → Hybrid: Sonnet for dev fixes, Groq for everything else
 *
 * Public entry point: generateReport(order, assessment) — returns FullReport.
 * Caller persists to hipaa_reports and updates hipaa_orders.report_status.
 */

import type {
  FullReport, ReportFinding, AttestationItem, RemediationStep, Tier, DeveloperFix, NprmAnalysis,
} from './report-types'
import { TIER_META } from './report-types'

const GROQ_KEY = process.env.GROQ_API_KEY || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const CLAUDE_MODEL = 'claude-sonnet-4-6-20250514'

interface RawCheck {
  id: string
  name: string
  status: string
  severity: string
  category: string
  impact: string
  effort: string
  detail: string
  ruleSection: string
  currentRule: string
  nprm2026: string
  remediation?: string
}

interface AssessmentRow {
  company_name: string
  public_url: string
  dashboard_url: string
  current_grade: string
  current_rule_score: number
  nprm_grade: string
  nprm_2026_score: number
  created_at: string
  results: {
    publicChecks?: RawCheck[]
    dashboardChecks?: RawCheck[]
    universalChecks?: RawCheck[]
  }
  remediation?: Array<{ priority: number; checkId: string; name: string; effort: string; impact: string }>
}

interface GenerateArgs {
  orderId: string
  tier: Tier
  customerEmail: string
  supportCallUrl?: string
  supportCallExpiresAt?: string
  assessment: AssessmentRow
}

// ---------------------------------------------------------------------------
export async function generateReport(args: GenerateArgs): Promise<FullReport> {
  const started = Date.now()
  const meta = TIER_META[args.tier]

  const { actionableFindings, attestationItems, remediationPlan } =
    collectFindings(args.assessment)

  // 1) Executive summary — fast Groq call, always
  const executiveSummary = await writeExecSummary(args, actionableFindings)

  // 2) Per-finding content, bounded to top 14 by priority
  const top = actionableFindings.slice(0, 14)
  const enriched: ReportFinding[] = []
  let tokens = 0
  for (const f of top) {
    const explanation = await writeExplanation(args.tier, args.assessment, f)
    const whyItFails  = await writeWhyItFails(args.assessment, f)

    let devFix: DeveloperFix | undefined
    if (meta.includesDevCode) {
      devFix = await writeDevFix(args.assessment, f)
    }

    let nprmAnalysis: NprmAnalysis | undefined
    if (meta.includesNprmOverlay) {
      nprmAnalysis = await writeNprmAnalysis(args.assessment, f)
    }

    enriched.push({
      checkId: f.id, name: f.name,
      severity: f.severity as ReportFinding['severity'],
      status: f.status as ReportFinding['status'],
      category: f.category as ReportFinding['category'],
      ruleSection: f.ruleSection,
      currentRuleStatus: normStatus(f.currentRule),
      nprm2026: normNprm(f.nprm2026),
      impact: f.impact, effort: f.effort as ReportFinding['effort'],
      originalDetail: f.detail,
      explanation, whyItFails, devFix, nprmAnalysis,
    })
    tokens += approxTokens(explanation) + approxTokens(whyItFails) +
              (devFix ? approxTokens(JSON.stringify(devFix)) : 0) +
              (nprmAnalysis ? approxTokens(JSON.stringify(nprmAnalysis)) : 0)
  }

  return {
    orderId: args.orderId,
    tier: args.tier,
    companyName: args.assessment.company_name,
    publicUrl: args.assessment.public_url,
    dashboardUrl: args.assessment.dashboard_url,
    currentGrade: args.assessment.current_grade,
    currentRuleScore: args.assessment.current_rule_score,
    nprmGrade: args.assessment.nprm_grade,
    nprm2026Score: args.assessment.nprm_2026_score,
    scanDate: args.assessment.created_at,
    customerEmail: args.customerEmail,
    executiveSummary,
    findings: enriched,
    attestationItems,
    remediationPlan,
    supportCallUrl: args.supportCallUrl,
    supportCallExpiresAt: args.supportCallExpiresAt,
    meta: {
      generatedBy: meta.aiModel,
      tokensUsed: tokens,
      durationMs: Date.now() - started,
      generatedAt: new Date().toISOString(),
    },
  }
}

// ---------------------------------------------------------------------------
// Findings collection + prioritisation (pure; no AI)
// ---------------------------------------------------------------------------
function collectFindings(a: AssessmentRow): {
  actionableFindings: RawCheck[]
  attestationItems: AttestationItem[]
  remediationPlan: RemediationStep[]
} {
  const all = [
    ...(a.results.publicChecks || []),
    ...(a.results.dashboardChecks || []),
    ...(a.results.universalChecks || []),
  ] as RawCheck[]

  const actionable = all.filter((c) => c.status === 'fail' || c.status === 'warning')
  const attestation = all
    .filter((c) => c.status === 'attestation-required')
    .map<AttestationItem>((c) => ({
      checkId: c.id, name: c.name, ruleSection: c.ruleSection, severity: c.severity,
      instruction: c.remediation || `Document and retain evidence for: ${c.name} (45 CFR §${c.ruleSection}).`,
    }))

  const priorityRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }
  const effortMinutes: Record<string, number> = { low: 20, medium: 90, high: 240 }
  actionable.sort((x, y) => (priorityRank[y.severity] || 0) - (priorityRank[x.severity] || 0))

  const plan: RemediationStep[] = (a.remediation || []).map((r) => ({
    priority: r.priority,
    checkId: r.checkId,
    name: r.name,
    severity: all.find((c) => c.id === r.checkId)?.severity || r.impact,
    effort: r.effort,
    estimatedMinutes: effortMinutes[r.effort] || 60,
  }))

  return { actionableFindings: actionable, attestationItems: attestation, remediationPlan: plan }
}

// ---------------------------------------------------------------------------
// AI primitives
// ---------------------------------------------------------------------------
async function writeExecSummary(args: GenerateArgs, findings: RawCheck[]): Promise<string> {
  const prompt = `You are a HIPAA compliance analyst writing the Executive Summary for a readiness report.

Organisation:   ${args.assessment.company_name}
Scanned site:   ${args.assessment.public_url}
Current grade:  ${args.assessment.current_grade} (${args.assessment.current_rule_score}/100)
NPRM 2026:      ${args.assessment.nprm_grade} (${args.assessment.nprm_2026_score}/100)
Findings:       ${findings.length} actionable

Write 2–3 short paragraphs. Plain English. No hedging. Lead with the verdict ("your site is in X shape today but..." or "you're in reasonable shape but..."). Mention the NPRM delta if grades diverge by more than 10 points. No bullet lists. Max 180 words.`

  return (await groq(prompt, { max_tokens: 500 })).trim()
}

async function writeExplanation(tier: Tier, a: AssessmentRow, c: RawCheck): Promise<string> {
  const prompt = `Write a plain-English explanation of this HIPAA scan finding.

Organisation: ${a.company_name}
Finding: ${c.name}
Severity: ${c.severity}
Rule: 45 CFR §${c.ruleSection}
Scanner detail: ${c.detail}

Write 2–4 sentences. Address the reader directly ("your site", "you"). Explain what was found without using technical jargon. Be direct; don't hedge. No filler phrases like "it is important to note". Don't describe what HIPAA is — the reader already knows. Max 90 words.`
  return (await groq(prompt, { max_tokens: 250 })).trim()
}

async function writeWhyItFails(a: AssessmentRow, c: RawCheck): Promise<string> {
  const prompt = `Explain why a HIPAA auditor would flag this finding.

Finding: ${c.name}
Severity: ${c.severity}
Rule: 45 CFR §${c.ruleSection}
Current rule status: ${c.currentRule}

Write ONE paragraph (3–5 sentences). Cite the rule section by name. Reference OCR enforcement patterns where relevant. No hedging. Max 100 words.`
  return (await groq(prompt, { max_tokens: 280 })).trim()
}

async function writeNprmAnalysis(a: AssessmentRow, c: RawCheck): Promise<NprmAnalysis> {
  const prompt = `Produce a side-by-side analysis of this HIPAA finding under the CURRENT rule vs. the 2026 NPRM. Output JSON only.

Finding: ${c.name}
Severity: ${c.severity}
Rule: 45 CFR §${c.ruleSection}
Current rule status: ${c.currentRule}
NPRM 2026 status: ${c.nprm2026}

Return:
{
  "today":         "1 short paragraph on the current rule for this control",
  "underNprm":     "1 short paragraph on what 2026 changes for this control",
  "whatThisMeans": "1 short paragraph on business-impact for the organisation",
  "relatedChanges": ["short bullet 1", "short bullet 2", "short bullet 3"]
}

Each paragraph: 2–3 sentences. Be specific. Plain English.`
  const raw = await groq(prompt, { max_tokens: 700, json: true })
  return safeParse<NprmAnalysis>(raw) || {
    today: `The current rule treats "${c.name}" as ${c.currentRule}.`,
    underNprm: `Under the 2026 NPRM this becomes ${c.nprm2026}.`,
    whatThisMeans: 'You should plan to address this before the final rule takes effect.',
    relatedChanges: [],
  }
}

async function writeDevFix(a: AssessmentRow, c: RawCheck): Promise<DeveloperFix> {
  const prompt = `You are a senior full-stack engineer writing production-grade remediation steps for a HIPAA finding. Output STRICT JSON only.

Organisation: ${a.company_name}
Site:         ${a.public_url}
Finding:      ${c.name}
Severity:     ${c.severity}
Rule:         45 CFR §${c.ruleSection}
Scanner detail: ${c.detail}
Scanner-suggested remediation: ${c.remediation || '(not specified)'}

Respond with:
{
  "stackDetected":  "best-guess tech stack based on context, e.g. 'Next.js on Vercel'",
  "steps": [
    { "index": 1, "title": "...", "body": "markdown with code fences where needed" },
    ...
  ],
  "verificationCommand": "exact shell command to confirm the fix",
  "expectedOutput":      "what a successful run prints",
  "estimatedMinutes":    <int>
}

Rules:
- 3 to 5 steps.
- Every step's body is complete markdown — include code fences (\`\`\`ts, \`\`\`bash) as needed.
- Code must be directly pasteable, not pseudo-code.
- Prefer real file paths (\`next.config.mjs\`, \`middleware.ts\`, etc.).
- Include the exact curl / shell command to verify success.`
  const raw = await sonnet(prompt, { max_tokens: 1800, json: true })
  return safeParse<DeveloperFix>(raw) || {
    stackDetected: 'Unknown',
    steps: [{ index: 1, title: 'Follow the HIPAA remediation recommendation', body: c.remediation || 'Consult a qualified engineer.' }],
    verificationCommand: '',
    expectedOutput: '',
    estimatedMinutes: 60,
  }
}

// ---------------------------------------------------------------------------
// LLM wrappers
// ---------------------------------------------------------------------------
async function groq(prompt: string, opts: { max_tokens?: number; json?: boolean } = {}): Promise<string> {
  if (!GROQ_KEY) return ''
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      max_tokens: opts.max_tokens || 600,
      response_format: opts.json ? { type: 'json_object' } : undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(25000),
  })
  if (!r.ok) return ''
  const j = await r.json()
  return j?.choices?.[0]?.message?.content || ''
}

async function sonnet(prompt: string, opts: { max_tokens?: number; json?: boolean } = {}): Promise<string> {
  if (!ANTHROPIC_KEY) return ''
  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: opts.max_tokens || 1500,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  }
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  })
  if (!r.ok) return ''
  const j = await r.json()
  const content = j?.content?.[0]?.text || ''
  // Strip common markdown code fences around JSON responses
  if (opts.json) {
    const m = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    return (m ? m[1] : content).trim()
  }
  return content
}

function safeParse<T>(raw: string): T | null {
  if (!raw) return null
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
    return JSON.parse(cleaned) as T
  } catch { return null }
}

function normStatus(s: string): 'required' | 'addressable' | 'not-specified' {
  if (s === 'required' || s === 'addressable') return s
  return 'not-specified'
}

function normNprm(s: string): 'required' | 'new-requirement' | 'removed' | 'unchanged' | 'not-specified' {
  if (['required', 'new-requirement', 'removed', 'unchanged', 'not-specified'].includes(s)) {
    return s as 'required' | 'new-requirement' | 'removed' | 'unchanged' | 'not-specified'
  }
  return 'not-specified'
}

function approxTokens(s: string): number { return Math.ceil((s?.length || 0) / 4) }
