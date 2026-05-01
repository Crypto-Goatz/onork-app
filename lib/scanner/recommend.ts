/**
 * Stack scanner recommendation engine — Groq-backed.
 *
 * Given the detected stack + categories with no hits, return a ranked
 * list of 0nMCP services that would close the gap, each with a one-line
 * "why".
 */
// Direct Groq fetch — no SDK dep needed.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SERVICE_CATALOG: Record<string, { id: string; name: string; rationale_seed: string }> = {
  'analytics-stack': {
    id: 'cro9_engine',
    name: 'CRO9 SEO',
    rationale_seed:
      'No analytics or tag manager detected — install GA4 + GTM via the 0nCore CRO9 engine to start measuring traffic and intent.',
  },
  'crm-stack': {
    id: 'crm_setup',
    name: 'CRM Setup',
    rationale_seed:
      'No CRM detected — provision a CRM sub-account so leads from this site flow into one pipeline.',
  },
  'email-stack': {
    id: 'email_paste',
    name: 'Email Engine',
    rationale_seed:
      'No marketing email detected — wire AI-drafted nurture emails on top of the existing tools.',
  },
  'chat-stack': {
    id: 'voice_ai',
    name: 'Voice / Chat AI',
    rationale_seed:
      'No live chat — launch a Voice AI agent that handles 24/7 inquiries on the site.',
  },
  'security-stack': {
    id: 'hipaa_scanner',
    name: 'HIPAA Scanner',
    rationale_seed:
      'Compliance gap — run a HIPAA scan to baseline risk and surface the fix list.',
  },
  'payments-stack': {
    id: 'service_packager',
    name: 'Service Packager',
    rationale_seed:
      'No checkout detected — package services with the Service Packager to start selling.',
  },
}

interface ScannerInput {
  detected: Record<string, Array<{ name: string }>>
  gaps: string[]
  hostname: string
}

interface Recommendation {
  service_id: string
  why: string
  score: number
}

export async function recommendForGaps(input: ScannerInput): Promise<Recommendation[]> {
  const groqKey = process.env.GROQ_API_KEY
  // Seed recommendations from gap → service map. AI rewrites the "why".
  const seeds: Recommendation[] = input.gaps
    .map((g, i) => {
      const seed = SERVICE_CATALOG[`${g}-stack`]
      if (!seed) return null
      return {
        service_id: seed.id,
        why: seed.rationale_seed,
        score: 100 - i * 8,
      }
    })
    .filter(Boolean) as Recommendation[]

  if (!groqKey || seeds.length === 0) return seeds

  const detectedNames = Object.entries(input.detected)
    .flatMap(([cat, hits]) => hits.map((h) => `${cat}:${h.name}`))
    .join(', ') || 'nothing detected'

  const sys = `You are a compliance + revenue ops consultant reviewing a website's marketing stack. The site at ${input.hostname} is currently running: ${detectedNames}. Categories with NO tooling: ${input.gaps.join(', ')}. For each recommendation below, rewrite the 'why' as ONE concrete sentence that names the gap and the business outcome. Output JSON: {"recs":[{"service_id":"...","why":"..."}, ...]} — same service_id, no extras, no markdown.`

  const user = JSON.stringify({ recs: seeds.map((s) => ({ service_id: s.service_id, why: s.why })) })

  try {
    const r = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    })
    if (!r.ok) throw new Error(`Groq ${r.status}`)
    const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> }
    const text = data.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(text) as { recs?: Array<{ service_id: string; why: string }> }
    if (!parsed.recs) return seeds
    return seeds.map((s) => {
      const better = parsed.recs!.find((r) => r.service_id === s.service_id)
      return { ...s, why: better?.why || s.why }
    })
  } catch (e) {
    console.warn('[scanner_recommend] Groq fallback to seeds:', (e as Error).message)
    return seeds
  }
}
