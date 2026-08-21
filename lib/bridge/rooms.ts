/**
 * WHICH ROOM DOES THIS KEY BELONG IN?
 *
 * The bridge tables have always had a `room` column and every query pinned it
 * to the literal '0n'. That was right while the only tenants were Cece, Dex and
 * Gemini on one Mac. It is wrong the moment an agency pays for a seat: their
 * agents would join the same room as every other customer's, read each other's
 * traffic, and collide on names.
 *
 * THE ROOM IS DERIVED FROM THE KEY, NEVER TAKEN FROM THE CALLER. A `room`
 * parameter selects among the rooms the key already resolves to; it cannot
 * name a new one. This is the whole isolation guarantee, so it lives in one
 * function rather than being re-checked at each call site.
 *
 * WHY THE AGENCY AND NOT THE LOCATION. Mike's model is that a contact holds
 * many locations and permission comes from the agency level — so the natural
 * boundary for "these are MY agents" is the agency. It is also the only one
 * that works today: `api_tokens.location_id` is the empty string on every row
 * in the live database (measured 2026-08-21, 15/15 rows), so a location-keyed
 * room would put every customer back in one room under a different name. The
 * agency comes from `crm_installations.company_id` — the same column
 * lib/workspaces/resolve.ts reads, so the two surfaces cannot disagree about
 * who an account belongs to. See `companiesForUser` for the one place they
 * deliberately differ, and why.
 *
 * MINTED ON DEMAND. An agency with no room gets one the first time it joins.
 * There is no provisioning step to forget, which matters because the failure
 * mode of forgetting is a paying customer whose agents have nowhere to stand.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import type { TokenContext } from '@/lib/0n-token'

export interface BridgeRoom {
  slug: string
  name: string | null
  companyId: string | null
}

type Db = NonNullable<ReturnType<typeof createServiceClient>>

/**
 * Every CRM agency behind a 0n key.
 *
 * ALL OF THEM, not the most recent one. lib/workspaces/resolve.ts takes a
 * single company because it is choosing which agency to ASK the platform
 * about, and asking twice would double the API calls. This is a different
 * question — which rooms may this key enter — and truncating it would show an
 * operator who runs two agencies only one of their two rooms, in the feature
 * whose entire purpose is that an agency's agents are its own.
 */
async function companiesForUser(db: Db, userId: string): Promise<string[]> {
  const { data } = await db
    .from('crm_installations')
    .select('company_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .not('company_id', 'is', null)
    .order('updated_at', { ascending: false })

  const seen = new Set<string>()
  for (const r of data ?? []) {
    const id = (r.company_id as string | null) ?? ''
    // An empty string is what this column holds when the install never reported
    // a company. Dropped, because '' would otherwise become one room slug that
    // every unattributed install shares — the exact bug being fixed.
    if (id.trim()) seen.add(id)
  }
  // Most-recently-updated first, so the primary agency leads any list we print.
  return [...seen]
}

/** The agency a NEW room is minted under: the key's most recent install. */
function primaryCompany(companies: string[]): string | null {
  return companies[0] ?? null
}

/**
 * Every room this key may act in.
 *
 * A room is reachable two ways, and they are deliberately independent:
 *   · `owner_user_id` — a direct grant. This is what keeps '0n' resolving for
 *     the account whose agents already stand in it, transcript intact.
 *   · `company_id`    — the agency. This is what a sold seat resolves through,
 *     and it is why a second person at the same agency joins the same room
 *     rather than a private one of their own.
 */
export async function roomsForToken(
  db: Db,
  ctx: Pick<TokenContext, 'userId'>,
): Promise<{ rooms: BridgeRoom[]; companies: string[] }> {
  const companies = await companiesForUser(db, ctx.userId)

  /**
   * TWO QUERIES, NOT ONE `.or()`.
   *
   * The one-query version interpolates the company id into a PostgREST filter
   * string — `company_id.eq.${id}`. That id comes from the CRM, not from us,
   * and a comma or a parenthesis in it would not error: it would be PARSED AS
   * FILTER SYNTAX and change which rooms match. On the one function that
   * decides which tenant a caller can read, a silent widening is the worst
   * available failure, and two round trips on a low-traffic route is nothing.
   * (`.in()` below quotes its values, so the list form is safe.)
   */
  const [byOwner, byCompany] = await Promise.all([
    db.from('bridge_rooms').select('slug, name, company_id, created_at')
      .eq('owner_user_id', ctx.userId),
    companies.length
      ? db.from('bridge_rooms').select('slug, name, company_id, created_at')
          .in('company_id', companies)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
  ])

  // A room reachable both ways — '0n' is exactly that — must appear once.
  const bySlug = new Map<string, BridgeRoom & { createdAt: string }>()
  for (const r of [...(byOwner.data ?? []), ...(byCompany.data ?? [])]) {
    const slug = r.slug as string
    if (!slug || bySlug.has(slug)) continue
    bySlug.set(slug, {
      slug,
      name: (r.name as string | null) ?? null,
      companyId: (r.company_id as string | null) ?? null,
      createdAt: String(r.created_at ?? ''),
    })
  }

  // Oldest first, so "the single room a key holds" is stable across calls and
  // an error message lists them in the same order every time.
  const rooms: BridgeRoom[] = [...bySlug.values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(({ slug, name, companyId: c }) => ({ slug, name, companyId: c }))

  return { rooms, companies }
}

/**
 * Mint this agency's room. Idempotent under concurrency.
 *
 * Two agents joining at the same second would both see no room and both insert.
 * `bridge_rooms_company_key` turns the loser's insert into a conflict, and the
 * re-read below hands it the winner's room — so a race produces one room and
 * two members, not two rooms with one member each.
 */
async function createRoomForCompany(db: Db, companyId: string): Promise<BridgeRoom | null> {
  // Prefixed rather than bare, so a room slug can never be mistaken for a
  // location id or collide with a hand-made slug like '0n'.
  const slug = `agency_${companyId}`
  await db
    .from('bridge_rooms')
    .insert({ slug, company_id: companyId })
    .select('slug')
    .maybeSingle()

  const { data } = await db
    .from('bridge_rooms')
    .select('slug, name, company_id')
    .eq('company_id', companyId)
    .maybeSingle()

  if (!data) return null
  return {
    slug: data.slug as string,
    name: (data.name as string | null) ?? null,
    companyId: (data.company_id as string | null) ?? null,
  }
}

export type RoomResolution =
  | { ok: true; room: BridgeRoom; rooms: BridgeRoom[] }
  | { ok: false; why: string; status: 400 | 403 }

/**
 * Pick the one room this request is about.
 *
 * @param asked  the caller's `room` parameter, if any
 * @param create mint the agency's room when none exists yet. True on join —
 *               the act that is allowed to bring a room into being — and false
 *               on read and post, so a typo cannot conjure an empty room and
 *               then report success into it.
 *
 * The three outcomes mirror how this route already disambiguates a peer name:
 * exactly one is implicit, several must be named, and a name the key does not
 * hold is refused rather than quietly honoured.
 */
export async function resolveRoom(
  db: Db,
  ctx: Pick<TokenContext, 'userId'>,
  asked: string | null | undefined,
  opts: { create?: boolean } = {},
): Promise<RoomResolution> {
  let { rooms, companies } = await roomsForToken(db, ctx)

  // Minted under the primary agency only. A key that holds two agencies and no
  // room yet gets ONE room on join, not two empty ones — the second is created
  // when an agent actually joins it.
  const primary = primaryCompany(companies)
  if (!rooms.length && opts.create && primary) {
    const made = await createRoomForCompany(db, primary)
    if (made) rooms = [made]
  }

  const want = asked?.trim()
  if (want) {
    const hit = rooms.find((r) => r.slug === want)
    // 403 and not 404: saying "no such room" would let a caller probe for which
    // agency slugs exist by watching the status code change.
    if (!hit) {
      return {
        ok: false,
        status: 403,
        why: rooms.length
          ? `This key does not hold a room called "${want}". It holds: ${rooms.map((r) => r.slug).join(', ')}.`
          : `This key does not hold a room called "${want}".`,
      }
    }
    return { ok: true, room: hit, rooms }
  }

  if (rooms.length === 1) return { ok: true, room: rooms[0], rooms }

  if (rooms.length > 1) {
    return {
      ok: false,
      status: 400,
      why: `This key holds several rooms — say which one with "room". It holds: ${rooms.map((r) => r.slug).join(', ')}.`,
    }
  }

  return {
    ok: false,
    status: 403,
    why: primary
      ? 'This key has no room yet. POST /api/bridge/room with {"join":"<YourName>"} to open your agency\'s room.'
      : 'This key is not linked to an agency yet, so it has no room. Install the app in your CRM account first — the room is created from that install.',
  }
}
