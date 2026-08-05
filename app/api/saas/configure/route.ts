import { NextResponse } from 'next/server'
import { CATALOGUE, configuratorBrief, planFromProposal, pricePlan } from '@/lib/saas/configure'

/**
 * Propose a SaaS plan from a description of the business.
 *
 * Writes nothing and creates nothing — it returns a priced proposal. The buyer
 * changes whatever they want and the plan reprices locally, which is why
 * `pricePlan` is exported and this route is not the only way to get a number.
 *
 * GROQ, per the house rule: no Anthropic or OpenAI SDK in a production path.
 * If the key is absent the route still answers — with the catalogue and an
 * honest note — rather than 500ing. A pricing page that breaks when a model is
 * unavailable is worse than one that falls back to a checklist.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

/** Long enough to describe an agency, short enough that abuse is pointless. */
const MAX_DESCRIPTION = 1500

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be JSON.' }, { status: 400 })
  }

  const description = String(body?.description ?? '').trim().slice(0, MAX_DESCRIPTION)
  if (description.length < 20) {
    return NextResponse.json(
      { error: 'Tell us a little about the business — a couple of sentences is enough to work from.' },
      { status: 400 }
    )
  }

  const budget = Number.isFinite(Number(body?.budget)) && Number(body.budget) > 0
    ? Math.round(Number(body.budget))
    : undefined

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      plan: pricePlan([]),
      catalogue: CATALOGUE,
      degraded: true,
      note: 'The recommender is not configured, so nothing has been pre-selected. Everything below can still be chosen by hand.',
    })
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You size software plans for marketing agencies. You are candid about what someone does NOT need — recommending less is how you get believed. Output JSON only.',
          },
          { role: 'user', content: configuratorBrief(description, budget) },
        ],
      }),
    })

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200)
      // Degrade to the manual catalogue rather than failing the page.
      return NextResponse.json({
        plan: pricePlan([]),
        catalogue: CATALOGUE,
        degraded: true,
        note: 'Could not build a recommendation just now. Everything below can still be chosen by hand.',
        detail,
      })
    }

    const data: any = await res.json()
    const raw = data?.choices?.[0]?.message?.content ?? '{}'
    let proposal: any
    try {
      proposal = JSON.parse(raw)
    } catch {
      proposal = {}
    }

    // planFromProposal re-prices from the catalogue and drops anything invented,
    // so a malformed or creative response degrades to a smaller honest plan
    // rather than a wrong number.
    const plan = planFromProposal(proposal)

    if (budget && plan.monthlyTotal > budget) {
      plan.notes.push(
        `This comes to $${plan.monthlyTotal}/month, which is over the $${budget} you mentioned. Removing any line reprices immediately.`
      )
    }

    return NextResponse.json({ plan, catalogue: CATALOGUE, degraded: false })
  } catch (err: any) {
    console.error('[saas/configure]', err)
    return NextResponse.json({
      plan: pricePlan([]),
      catalogue: CATALOGUE,
      degraded: true,
      note: 'Could not build a recommendation just now. Everything below can still be chosen by hand.',
    })
  }
}

/** The catalogue on its own, for a page that wants to render the checklist first. */
export async function GET() {
  return NextResponse.json({ catalogue: CATALOGUE })
}
