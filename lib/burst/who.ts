/**
 * "Which Mike?" — resolving a person's name to one contact, or to a question.
 *
 * THE PROBLEM THIS FIXES. Naming a person in a command used to plan happily and
 * then refuse at run time with `"Mike" matches 172172 contacts. Tell me which
 * one.` — a dead end wearing the clothes of a conversation. There was no way to
 * answer it: retyping "Mike" produces the same 172172, and the person asking has
 * no idea which Mike the system can even see.
 *
 * SO THE QUESTION COMES WITH ANSWERS, BEFORE APPROVAL. The same shape the
 * product already uses for ambiguous CLIENTS: candidates as buttons, one click
 * pins it, and the id — never the name — is what gets sent back. Names repeat;
 * that is the entire reason we are here.
 *
 * RANKED BY WHO YOU TOUCHED LAST. `dateUpdated` descending. An agency's list has
 * one Mike they spoke to yesterday and six they imported in 2019, and offering
 * those seven in database order is barely better than not asking. The CRM has no
 * lastActivity field on this endpoint — dateUpdated is the honest proxy, and it
 * moves whenever a contact is edited, tagged, or messaged.
 *
 * IT NEVER GUESSES. Not even at one strong candidate and six weak ones. Texting
 * the wrong customer cannot be undone, and "it picked the most recent" is not a
 * defence anyone wants to give a client.
 */
import { crmGet } from '@/lib/crm'

export interface Candidate {
  id: string
  name: string
  /** Shown beside the name so two people called Mike are told apart. */
  detail?: string
  /** ISO of the last change — the ranking key, surfaced so it can be checked. */
  lastTouched?: string
}

export interface WhoResult {
  /** Exactly one match — safe to proceed. */
  contact?: Candidate
  /** More than one. Ask, with these. */
  candidates?: Candidate[]
  /** How many matched in total, which may exceed the candidates shown. */
  total?: number
  /** Nothing matched, or the lookup failed. */
  error?: string
}

/** At most this many buttons. Past a handful it is a list, not a question. */
const SHOW = 6

interface Row {
  id?: string
  contactName?: string
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  dateUpdated?: string
  dateAdded?: string
  tags?: string[]
}

function label(c: Row): string {
  const name = (c.contactName || [c.firstName, c.lastName].filter(Boolean).join(' ')).trim()
  return name || c.email || c.phone || 'Unnamed contact'
}

/**
 * What makes this one different from the other six.
 *
 * Company first, because in an agency's list the company is usually the thing
 * that identifies a person. Then email, then phone. Never all three — the point
 * is to distinguish, and three lines of detail per button is a form.
 */
function detail(c: Row): string | undefined {
  return c.companyName?.trim() || c.email?.trim() || c.phone?.trim() || undefined
}

export async function whoIs(locationId: string, query: string): Promise<WhoResult> {
  const q = query.trim()
  if (!q) return { error: 'Tell me which person you mean.' }

  // No locationId in the path — crmGet appends it, and two of them is a 403
  // that reads like a scope problem.
  const qs = new URLSearchParams({ limit: '20', query: q })
  let res: Response
  try {
    res = await crmGet(`/contacts/?${qs.toString()}`, locationId)
  } catch (e) {
    return { error: (e as Error).message }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return { error: `Contact lookup failed (${res.status}). ${body.slice(0, 120)}` }
  }

  const json = (await res.json().catch(() => ({}))) as { contacts?: Row[]; meta?: { total?: number } }
  const rows = (json.contacts ?? []).filter((r) => r.id)
  // Never fall back to 0 — that reads as "nothing matched" and waves the
  // ambiguity check straight through.
  const total = typeof json.meta?.total === 'number' ? json.meta.total : rows.length

  if (total === 0 || rows.length === 0) return { total: 0, error: `Nobody in this account matches "${q}".` }

  const ranked = [...rows]
    .sort((a, b) => Date.parse(b.dateUpdated || b.dateAdded || '') - Date.parse(a.dateUpdated || a.dateAdded || ''))
    .map<Candidate>((r) => ({
      id: r.id!, name: label(r), detail: detail(r), lastTouched: r.dateUpdated || r.dateAdded,
    }))

  if (total === 1 && ranked.length === 1) return { contact: ranked[0], total: 1 }

  return { candidates: ranked.slice(0, SHOW), total }
}

/**
 * The sentence that goes with the buttons.
 *
 * Says the real total AND how many are being offered, because "which of these
 * six?" when there are two hundred is a question that hides its own scope.
 */
export function whoQuestion(query: string, total: number, shown: number): string {
  if (total <= shown) {
    return `Which ${query}? Pick one and I will use them.`
  }
  return `${total.toLocaleString()} people match "${query}". Here are the ${shown} you dealt with most recently — pick one, or narrow it down with a last name, email or company.`
}
