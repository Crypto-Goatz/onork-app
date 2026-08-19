/**
 * AI personalization engine for tiered HIPAA reports.
 *
 * GROQ-ONLY. Every AI call in this file goes through Groq openai/gpt-oss-120b.
 * No Anthropic, no OpenAI, no anything else — per owner directive.
 *
 * Public entry point: generateReport(order, assessment) — returns FullReport.
 * Caller persists to hipaa_reports and updates hipaa_orders.report_status.
 */

import type {
  FullReport, ReportFinding, AttestationItem, RemediationStep, Tier, DeveloperFix, NprmAnalysis,
} from './report-types'
import { TIER_META } from './report-types'

const GROQ_KEY = process.env.GROQ_API_KEY || ''

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

  // 2) Per-finding content, bounded to top 14 by priority. Run the 4 AI
  // calls per finding in parallel; findings themselves processed serially to
  // avoid hammering Groq's rate limit.
  const top = actionableFindings.slice(0, 14)
  const enriched: ReportFinding[] = []
  let tokens = 0
  for (const f of top) {
    const [explanation, whyItFails, devFix, nprmAnalysis] = await Promise.all([
      writeExplanation(args.tier, args.assessment, f),
      writeWhyItFails(args.assessment, f),
      meta.includesDevCode    ? writeDevFix(args.assessment, f)       : Promise.resolve(undefined),
      meta.includesNprmOverlay ? writeNprmAnalysis(args.assessment, f) : Promise.resolve(undefined),
    ])

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

  const out = (await groq(prompt, { max_tokens: 500 })).trim()
  if (out) return out
  return `${args.assessment.company_name}: your site currently scores ${args.assessment.current_rule_score}/100 (grade ${args.assessment.current_grade}) against the existing HIPAA rule and ${args.assessment.nprm_2026_score}/100 (grade ${args.assessment.nprm_grade}) against the 2026 NPRM. We found ${findings.length} actionable findings; the ones below are ordered by severity so you can work top-to-bottom.`
}

async function writeExplanation(tier: Tier, a: AssessmentRow, c: RawCheck): Promise<string> {
  const prompt = `Write a plain-English explanation of this HIPAA scan finding.

Organisation: ${a.company_name}
Finding: ${c.name}
Severity: ${c.severity}
Status: ${c.status}
Rule: 45 CFR §${c.ruleSection}
Scanner detail: ${c.detail}

Write 2–4 sentences. Address the reader directly ("your site", "you"). Explain what was found without technical jargon. Be direct; don't hedge. No filler phrases like "it is important to note". Don't describe what HIPAA is — the reader already knows. Max 90 words.`
  const out = (await groq(prompt, { max_tokens: 250 })).trim()
  if (out) return out
  // Deterministic fallback — useful text, not an empty string.
  return `${c.name}: ${c.detail || 'This finding needs attention.'} The scanner classified it as ${c.severity} under 45 CFR §${c.ruleSection}.`
}

async function writeWhyItFails(a: AssessmentRow, c: RawCheck): Promise<string> {
  const prompt = `Explain why a HIPAA auditor would flag this finding.

Finding: ${c.name}
Severity: ${c.severity}
Rule: 45 CFR §${c.ruleSection}
Current rule status: ${c.currentRule}

Write ONE paragraph (3–5 sentences). Cite the rule section by name. Reference OCR enforcement patterns where relevant. No hedging. Max 100 words.`
  const out = (await groq(prompt, { max_tokens: 280 })).trim()
  if (out) return out
  return `Under 45 CFR §${c.ruleSection}, covered entities are expected to address "${c.name}". OCR has historically pursued enforcement on similar ${c.severity}-severity gaps, especially when left unresolved across audits.`
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
  const prompt = `You are a senior full-stack engineer writing production-grade remediation steps for a HIPAA finding. Output STRICT JSON only. No prose before or after the JSON.

Organisation: ${a.company_name}
Site:         ${a.public_url}
Finding:      ${c.name}
Severity:     ${c.severity}
Rule:         45 CFR §${c.ruleSection}
Scanner detail: ${c.detail}
Scanner-suggested remediation: ${c.remediation || '(not specified)'}

Return exactly this JSON shape (no extra keys, no explanation):
{
  "stackDetected":  "best-guess tech stack, e.g. 'Next.js on Vercel' or 'Apache / PHP on shared hosting'",
  "steps": [
    { "index": 1, "title": "Short imperative title", "body": "markdown with fenced code blocks (\\\`\\\`\\\`ts, \\\`\\\`\\\`bash, \\\`\\\`\\\`nginx, etc.) and real file paths" }
  ],
  "verificationCommand": "exact shell command a developer can paste to verify the fix",
  "expectedOutput":      "what a successful run prints (one line is fine)",
  "estimatedMinutes":    30
}

Rules:
- EXACTLY 3 to 5 steps. NEVER 1 or 2. If the fix is simple, break it into setup / change / verify.
- Every step's "body" MUST include at least one fenced code block with directly pasteable code.
- Prefer real file paths: next.config.mjs, middleware.ts, .htaccess, nginx.conf, docker-compose.yml.
- "verificationCommand" must be a real command (curl -I, openssl, grep, etc.) — not placeholder text.
- No pseudo-code, no "do X". Show the actual code.`

  // GROQ ONLY. One call; retry loop + backoff are inside groq().
  const raw = await groq(prompt, { max_tokens: 2500, json: true })
  const parsed = safeParse<DeveloperFix>(raw)
  // "Usable" means: >=1 step AND at least one step has a fenced code block.
  const usable = (p: DeveloperFix | null) =>
    !!p && Array.isArray(p.steps) && p.steps.length >= 1 &&
    p.steps.some((s) => /```/.test(s.body || ''))
  if (usable(parsed) && parsed) {
    // Pad out to 3 steps if the model returned 1-2 — tack on a verification
    // step using its own verificationCommand so the reader always gets a
    // review → fix → verify arc.
    const steps = parsed.steps.slice()
    if (steps.length < 3 && parsed.verificationCommand) {
      steps.push({
        index: steps.length + 1,
        title: 'Verify the fix',
        body: `Run the command below to confirm the change is in place.\n\n\`\`\`bash\n${parsed.verificationCommand}\n\`\`\`${parsed.expectedOutput ? `\n\nExpected output:\n\n\`\`\`\n${parsed.expectedOutput}\n\`\`\`` : ''}`,
      })
    }
    parsed.steps = steps.map((s, i) => ({ index: i + 1, title: s.title || `Step ${i + 1}`, body: s.body || '' }))
    return parsed
  }

  // Last-resort structured fallback — at least 3 steps with the scanner's
  // remediation text plus a real verify command. Never return a single
  // placeholder step.
  const remediation = c.remediation || `Address the "${c.name}" finding per 45 CFR §${c.ruleSection}.`
  return {
    stackDetected: 'Unknown',
    steps: [
      { index: 1, title: 'Review the finding', body: `**Finding:** ${c.name}\n\n**Scanner detail:** ${c.detail}\n\n**Severity:** ${c.severity}` },
      { index: 2, title: 'Apply the remediation', body: `${remediation}\n\n\`\`\`bash\n# Replace with the real fix for your stack\n\`\`\`` },
      { index: 3, title: 'Verify the fix', body: `Re-run the HIPAA scan or use the verification command below.\n\n\`\`\`bash\ncurl -I ${a.public_url}\n\`\`\`` },
    ],
    verificationCommand: `curl -I ${a.public_url}`,
    expectedOutput: 'HTTP response headers showing the remediation in place.',
    estimatedMinutes: 60,
  }
}

// ---------------------------------------------------------------------------
// LLM wrappers
// ---------------------------------------------------------------------------
async function groq(prompt: string, opts: { max_tokens?: number; json?: boolean } = {}): Promise<string> {
  if (!GROQ_KEY) { console.warn('[HIPAA] groq: missing GROQ_API_KEY'); return '' }
  // One attempt + one quick retry on 429/5xx. The serialized-by-finding loop
  // (14 findings × 4 parallel calls) already spreads the load over time; deep
  // retries here only push us past Vercel's 300s function ceiling.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
          temperature: 0.2,
          max_tokens: opts.max_tokens || 600,
          response_format: opts.json ? { type: 'json_object' } : undefined,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(20000),
      })
      if (!r.ok) {
        const err = await r.text().catch(() => '')
        const retryAfter = Number(r.headers.get('retry-after') || 0)
        console.warn(`[HIPAA] groq ${r.status} (attempt ${attempt + 1}):`, err.slice(0, 200))
        if (r.status >= 500 || r.status === 429) {
          const wait = retryAfter > 0 ? Math.min(retryAfter * 1000, 1500) : 800
          await new Promise((res) => setTimeout(res, wait))
          continue
        }
        return ''
      }
      const j = await r.json()
      const content = j?.choices?.[0]?.message?.content || ''
      return opts.json ? stripOuterCodeFence(content) : content
    } catch (e) {
      console.warn('[HIPAA] groq attempt', attempt, 'exception:', (e as Error).message)
    }
  }
  return ''
}

/**
 * Strip markdown code fences **only when they wrap the entire response**.
 * The old regex was greedy and would eat inner fences inside JSON string
 * fields (e.g. `"body": "... \`\`\`bash ... \`\`\`"`), which broke parsing
 * when a model returned clean JSON containing embedded code blocks.
 */
function stripOuterCodeFence(raw: string): string {
  const s = raw.trim()
  if (!s.startsWith('```')) return s
  // Remove leading ```json or ```
  const withoutLead = s.replace(/^```(?:json)?\s*/, '')
  // Remove trailing ``` if present
  return withoutLead.replace(/\s*```\s*$/, '').trim()
}

function safeParse<T>(raw: string): T | null {
  if (!raw) return null
  const cleaned = raw.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Fallback: try to extract the first balanced JSON object in the string.
    // Useful when a model prepends "Here is the JSON:" or trailing commentary.
    const first = cleaned.indexOf('{')
    const last = cleaned.lastIndexOf('}')
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1)) as T
      } catch { /* fall through */ }
    }
    return null
  }
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
