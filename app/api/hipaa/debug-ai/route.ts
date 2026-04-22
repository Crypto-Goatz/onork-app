/**
 * POST /api/hipaa/debug-ai — diagnostic endpoint. Calls Groq + Sonnet
 * with the exact devFix prompt so we can see why generation is falling
 * through to the deterministic fallback.
 *
 * Auth: webhook secret. DELETE THIS ROUTE once diagnosed.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const WEBHOOK_SECRET = process.env.HIPAA_WEBHOOK_SECRET || ''
const GROQ_KEY = process.env.GROQ_API_KEY || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''

export async function POST(req: NextRequest) {
  const wh = req.headers.get('x-hipaa-webhook-secret') || ''
  if (!WEBHOOK_SECRET || wh !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorised' }, { status: 401 })
  }

  const prompt = `You are a senior full-stack engineer writing production-grade remediation steps for a HIPAA finding. Output STRICT JSON only. No prose before or after the JSON.

Organisation: RocketOpp
Site:         https://rocketopp.com
Finding:      No exposed /phpinfo.php
Severity:     critical
Rule:         45 CFR §164.312(a)(1)
Scanner detail: /phpinfo.php returned 403 (may exist but is blocked).

Return exactly this JSON shape:
{
  "stackDetected": "best-guess tech stack",
  "steps": [
    { "index": 1, "title": "title", "body": "markdown with fenced code blocks" }
  ],
  "verificationCommand": "real shell command",
  "expectedOutput": "what success looks like",
  "estimatedMinutes": 30
}

Rules:
- EXACTLY 3 to 5 steps.
- Every step's body MUST include at least one fenced code block.
- Real commands only, no pseudo-code.`

  const out: Record<string, unknown> = {
    groqKey: GROQ_KEY ? `${GROQ_KEY.slice(0, 8)}... (${GROQ_KEY.length} chars)` : 'MISSING',
    anthropicKey: ANTHROPIC_KEY ? `${ANTHROPIC_KEY.slice(0, 12)}... (${ANTHROPIC_KEY.length} chars)` : 'MISSING',
  }

  // Groq
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { authorization: `Bearer ${GROQ_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 2500,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    })
    const text = await r.text()
    out.groq = {
      status: r.status,
      bodyLen: text.length,
      bodyHead: text.slice(0, 400),
      bodyTail: text.slice(-200),
    }
    if (r.ok) {
      try {
        const parsed = JSON.parse(text)
        const content = parsed?.choices?.[0]?.message?.content || ''
        ;(out.groq as Record<string, unknown>).contentLen = content.length
        ;(out.groq as Record<string, unknown>).contentHead = content.slice(0, 400)
        try {
          const obj = JSON.parse(content)
          ;(out.groq as Record<string, unknown>).parsedSteps = Array.isArray(obj?.steps) ? obj.steps.length : 'not array'
          ;(out.groq as Record<string, unknown>).firstStep = obj?.steps?.[0] || null
        } catch (pe) {
          ;(out.groq as Record<string, unknown>).parseError = String(pe)
        }
      } catch {}
    }
  } catch (e) {
    out.groq = { error: String(e) }
  }

  // Sonnet
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 1800,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(45000),
    })
    const text = await r.text()
    out.sonnet = { status: r.status, bodyLen: text.length, bodyHead: text.slice(0, 400) }
  } catch (e) {
    out.sonnet = { error: String(e) }
  }

  return NextResponse.json(out)
}
