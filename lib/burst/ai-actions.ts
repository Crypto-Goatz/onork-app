import { crmGet, crmPostRaw } from '@/lib/crm'

/**
 * The AI-side workflow actions — draft and score.
 *
 * These have no CRM capability of their own: they read the contact, ask a model,
 * and hand a value back for the NEXT step in the agency's own workflow to use.
 * That is the whole point of them. The agency keeps the automation; we supply
 * the judgement inside it.
 *
 * GROQ, per the house rule — never Anthropic or OpenAI in a production path.
 *
 * A FAILURE RETURNS A USABLE VALUE, NOT AN ERROR. These run mid-workflow, on a
 * real contact, in a customer's live automation. A thrown error strands that
 * contact between steps; a neutral answer lets the workflow continue and the
 * agency see what happened in the receipt.
 */

const GROQ = 'https://api.groq.com/openai/v1/chat/completions'

async function ask(system: string, user: string, json = false): Promise<string | null> {
  const key = process.env.GROQ_API_KEY
  if (!key) return null
  try {
    const r = await fetch(GROQ, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.4,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
      signal: AbortSignal.timeout(20000),
    })
    if (!r.ok) return null
    const j = await r.json()
    return j?.choices?.[0]?.message?.content ?? null
  } catch {
    return null
  }
}

export interface ContactContext { name: string; email?: string; phone?: string; tags: string[] }

/** Read just enough about the contact to write to them like a person. */
export async function loadContact(locationId: string, contactId: string): Promise<ContactContext | null> {
  try {
    const res = await crmGet(`/contacts/${contactId}`, locationId)
    if (!res.ok) return null
    const j = (await res.json()) as { contact?: { contactName?: string; firstName?: string; email?: string; phone?: string; tags?: string[] } }
    const c = j.contact ?? {}
    return {
      name: c.contactName || c.firstName || 'there',
      email: c.email, phone: c.phone,
      tags: Array.isArray(c.tags) ? c.tags : [],
    }
  } catch { return null }
}

/** A2 — write a message for this contact. Returns the text for a later step. */
export async function draftMessage(args: {
  locationId: string; contactId?: string
  purpose: string; tone?: string
}): Promise<{ draft: string; note: string }> {
  const contact = args.contactId ? await loadContact(args.locationId, args.contactId) : null
  const who = contact ? `${contact.name}${contact.tags.length ? ` (tagged: ${contact.tags.slice(0, 6).join(', ')})` : ''}` : 'this contact'

  const text = await ask(
    [
      'You write short business messages that get replies.',
      `Tone: ${args.tone || 'friendly and direct'}.`,
      'RULES: no subject line, no placeholders like [Name] — use the real name given.',
      'Two short paragraphs at most. No emoji. Plain text.',
    ].join('\n'),
    `Write a message to ${who}. Purpose: ${args.purpose}`,
  )

  const draft = text?.trim() || ''
  return {
    draft,
    note: draft ? `Drafted a message for ${contact?.name ?? 'the contact'}.` : 'Could not draft a message.',
  }
}

export type Branch = 'hot' | 'warm' | 'cold'

/** A5 — score the contact and return a branch value the workflow can switch on. */
export async function scoreAndRoute(args: {
  locationId: string; contactId?: string; criteria: string
}): Promise<{ score: number; branch: Branch; reason: string }> {
  const contact = args.contactId ? await loadContact(args.locationId, args.contactId) : null

  const raw = await ask(
    [
      'You score a sales contact from 0 to 100 against the criteria given.',
      'Reply as JSON only: {"score":number,"reason":string}',
      'Be conservative: with little information, score low rather than guessing high.',
    ].join('\n'),
    `Criteria: ${args.criteria}\nContact: ${contact ? JSON.stringify(contact) : 'no details available'}`,
    true,
  )

  let score = 0
  let reason = 'Not enough information to score.'
  try {
    const p = JSON.parse(raw || '{}') as { score?: number; reason?: string }
    if (typeof p.score === 'number' && Number.isFinite(p.score)) score = Math.min(100, Math.max(0, Math.round(p.score)))
    if (typeof p.reason === 'string') reason = p.reason.slice(0, 240)
  } catch { /* neutral default already set */ }

  // Fixed thresholds so a workflow's if/else keeps meaning the same thing over
  // time. A model-chosen boundary would silently re-route live automations.
  const branch: Branch = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold'
  return { score, branch, reason }
}

/** Leave a trace on the contact, so the agency sees what the AI did and why. */
export async function noteOnContact(locationId: string, contactId: string, body: string): Promise<void> {
  try {
    await crmPostRaw(`/contacts/${contactId}/notes`, locationId, { body: body.slice(0, 2000) })
  } catch { /* a missing note must never fail the action */ }
}
