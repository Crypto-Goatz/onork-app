/**
 * LeadScout's discovery half — real local businesses from Google, via SerpApi.
 *
 * WHY SERPAPI AND NOT A NEW PROVIDER. SERP_API_KEY is already set in production
 * and rocketopp-live already wraps this exact service. Adding a second search
 * vendor for the same job would mean a second key, a second bill and a second
 * thing to be broken. The engine differs — `google_local` rather than `google` —
 * because we want businesses, not pages about businesses.
 *
 * NOTHING HERE IS INVENTED. Every field comes back from the API or is left
 * empty. A lead sheet with a plausible-looking phone number that nobody
 * verified is worse than a blank column: someone dials it in front of a client.
 */

const SERP_BASE = 'https://serpapi.com/search.json'

export interface Lead {
  /** Stable within a result set, used for selection. */
  key: string
  name: string
  address?: string
  phone?: string
  website?: string
  /** The business's own domain, lowercased and de-www'd — the dedupe key. */
  domain?: string
  rating?: number
  reviews?: number
  category?: string
  /** Why this one is worth a call, derived only from returned facts. */
  signal?: string
}

export interface SearchInput {
  /** What kind of business, e.g. "dentists", "roofing contractors". */
  trade: string
  /** Where, e.g. "Pittsburgh, Pennsylvania". */
  where: string
  limit?: number
}

function domainOf(url?: string): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return undefined
  }
}

/**
 * The one line that makes a lead worth calling.
 *
 * Derived ONLY from what came back. "No website" and "rated 4.8 from 12
 * reviews" are facts; "probably needs marketing help" is a guess, and a guess
 * printed next to a stranger's business name is how outreach gets embarrassing.
 */
function signalFor(l: Omit<Lead, 'key' | 'signal'>): string | undefined {
  if (!l.website) return 'No website listed — the opening writes itself.'
  if (typeof l.reviews === 'number' && l.reviews < 15) {
    return `Only ${l.reviews} review${l.reviews === 1 ? '' : 's'} — reputation work is an easy first win.`
  }
  if (typeof l.rating === 'number' && l.rating < 4) {
    return `Rated ${l.rating} — they already know something is wrong.`
  }
  return undefined
}

export async function findLocalLeads(
  input: SearchInput,
): Promise<{ ok: true; leads: Lead[] } | { ok: false; error: string }> {
  const key = process.env.SERP_API_KEY
  if (!key) {
    // Named, not generic. "Search is unavailable" sends someone into the code;
    // naming the variable sends them to the dashboard.
    return { ok: false, error: 'SERP_API_KEY is not set on this deployment, so lead discovery cannot run.' }
  }
  const trade = input.trade.trim()
  const where = input.where.trim()
  if (!trade || !where) return { ok: false, error: 'Say what kind of business, and where.' }

  const params = new URLSearchParams({
    engine: 'google_local',
    q: `${trade} in ${where}`,
    api_key: key,
    hl: 'en',
    gl: 'us',
  })

  let data: Record<string, unknown>
  try {
    const res = await fetch(`${SERP_BASE}?${params}`, { headers: { accept: 'application/json' }, cache: 'no-store' })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      // A quota message and a bad-key message need completely different fixes
      // and both arrive as a non-200, so the two are separated by hand. Out of
      // credit is an account state, not a fault — saying "search failed" here
      // sends someone into the code to look for a bug that is not there.
      if (res.status === 429 || /run out of searches/i.test(body)) {
        return { ok: false, error: 'The search plan is out of credit for this month, so no new leads can be pulled right now. Everything already found still saves normally.' }
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: false, error: 'The search provider rejected our key. This is a configuration problem on our side, not yours.' }
      }
      return { ok: false, error: `Search provider ${res.status}: ${body.slice(0, 180)}` }
    }
    data = (await res.json()) as Record<string, unknown>
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }

  if (typeof data.error === 'string') return { ok: false, error: data.error }

  const rows = (data.local_results as Record<string, unknown>[] | undefined) ?? []
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 40)

  const leads: Lead[] = rows.slice(0, limit).map((r, i) => {
    const website = typeof r.website === 'string' ? r.website : undefined
    const base = {
      name: String(r.title ?? '').trim(),
      address: typeof r.address === 'string' ? r.address : undefined,
      phone: typeof r.phone === 'string' ? r.phone : undefined,
      website,
      domain: domainOf(website),
      rating: typeof r.rating === 'number' ? r.rating : undefined,
      reviews: typeof r.reviews === 'number' ? r.reviews : undefined,
      category: typeof r.type === 'string' ? r.type : undefined,
    }
    return { key: `${i}-${base.name}`.slice(0, 80), ...base, signal: signalFor(base) }
  })

  return { ok: true, leads: leads.filter((l) => l.name) }
}
