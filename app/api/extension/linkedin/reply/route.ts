/**
 * POST /api/extension/linkedin/reply — draft a reply, and pull the email out.
 *
 * DRAFTS. DOES NOT SEND. The reply comes back to the extension and a person
 * presses send. Automated sending from an unapproved tool is what gets a
 * LinkedIn account restricted, and the penalty lands on the agency's account
 * and their client's, not on us — so the send stays a human action and the
 * drafting, which is the slow part, is what gets automated.
 *
 * IT ASKS FOR THE EMAIL, ONCE, AND NATURALLY. The entire commercial point of a
 * LinkedIn conversation is moving it somewhere you own. A reply that asks for
 * an email in the first line reads like a bot and gets ignored; one that
 * answers the person first and then asks is a normal thing a human does.
 *
 * IT ALSO READS THE INBOUND MESSAGE FOR AN EMAIL ALREADY GIVEN. Half the time
 * the person has already put it in the thread, and asking again for something
 * they just told you is the fastest way to look automated.
 *
 * Groq only, per the production-AI rule.
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { groqChat } from '@/lib/groq'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

/** Deliberately conservative: a false positive here writes junk into a CRM. */
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g

function extractEmails(text: string): string[] {
  const hits = text.match(EMAIL_RE) ?? []
  return [...new Set(hits.map((e) => e.toLowerCase()))]
    // LinkedIn's own notification addresses are in a lot of threads and are
    // never the person you are talking to.
    .filter((e) => !/@(linkedin|bounce|noreply|no-reply)\./i.test(e))
}

export async function POST(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) {
    return NextResponse.json({ error: 'Connect this browser to 0nCORE first.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const message = String(body?.message ?? '').slice(0, 4000).trim()
  const name = String(body?.name ?? '').slice(0, 120).trim()
  const headline = String(body?.headline ?? '').slice(0, 300).trim()
  const profileUrl = String(body?.profileUrl ?? '').slice(0, 400).trim()
  const goal = String(body?.goal ?? '').slice(0, 300).trim()

  if (!message) {
    return NextResponse.json({ error: 'No message to reply to.' }, { status: 400 })
  }

  const known = extractEmails(message)

  const system = [
    'You write short LinkedIn replies for a busy agency owner.',
    'Rules, all of them hard:',
    '- 2 to 4 sentences. Never longer.',
    '- Sound like a person typing quickly, not like marketing copy.',
    '- Answer or acknowledge what they actually said FIRST.',
    known.length
      ? `- They have ALREADY given their email (${known[0]}). Do NOT ask for it again. Confirm you will follow up there.`
      : '- Then ask for their email once, casually, with a concrete reason to send something.',
    '- No emoji. No hashtags. No "I hope this finds you well". No exclamation marks.',
    '- Do not invent facts about them, their company, or any offer.',
    '- Output ONLY the reply text. No preamble, no quotes, no signature.',
  ].join('\n')

  const user = [
    name && `Their name: ${name}`,
    headline && `Their headline: ${headline}`,
    goal && `What I want from this conversation: ${goal}`,
    `Their message:\n${message}`,
  ].filter(Boolean).join('\n')

  try {
    const result = await groqChat({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      reasoning_effort: 'low',
      system,
      user,
      temperature: 0.6,
      max_tokens: 260,
    })

    const draft = (result.text || '').trim().replace(/^["']|["']$/g, '')
    if (!draft) {
      return NextResponse.json({ error: 'The draft came back empty. Try again.' }, { status: 502 })
    }

    return NextResponse.json({
      ok: true,
      draft,
      // What the extension needs to offer "add this person to the CRM" — the
      // write itself still goes through plan/approve/run, never from here.
      contact: {
        name: name || null,
        email: known[0] ?? null,
        headline: headline || null,
        profileUrl: profileUrl || null,
      },
      emailFound: known.length > 0,
    })
  } catch (err) {
    console.error('[extension/linkedin/reply]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Could not draft a reply.' },
      { status: 502 },
    )
  }
}
