import { crmPostRaw, crmGet } from '@/lib/crm'

/**
 * Putting 0nCORE surfaces into the CRM's own sidebar.
 *
 * WHY THIS IS THE ANSWER TO "how does an agent reach the builder". The platform
 * gives us no way to create a page inside a funnel, but it does let us add a
 * link to the left-hand menu — and `openMode: 'iframe'` renders our app INSIDE
 * the CRM chrome rather than throwing the user out to another tab. Combined
 * with the Custom Page SSO already shipped, an agent clicks "Website Builder"
 * in their sidebar and lands in our builder, signed in, without ever leaving
 * the product they paid for.
 *
 * This is a WRITE to the agency's navigation — every user of every selected
 * sub-account sees it. So it is exposed through the plan → approve → run gate
 * like anything else, and `showToAllLocations` defaults to false: turning a
 * menu on for every client at once is not a decision to make implicitly.
 */

export interface MenuLinkInput {
  title: string
  url: string
  /** Lucide-style name the CRM renders, e.g. 'layout-template'. */
  icon?: string
  /** Sub-accounts to show it in. Ignored when showToAllLocations is true. */
  locations?: string[]
  showToAllLocations?: boolean
  showOnCompany?: boolean
  showOnLocation?: boolean
  openMode?: 'iframe' | 'new_tab' | 'current_tab'
  userRole?: 'all' | 'admin' | 'user'
}

export interface MenuLinkResult {
  ok: boolean
  menuId?: string
  title?: string
  error?: string
  /** How many sub-accounts will see it — the blast radius, stated. */
  reach?: number | 'all'
}

async function readJson(res: Response): Promise<any> {
  const t = await res.text()
  try {
    return JSON.parse(t)
  } catch {
    return { _raw: t.slice(0, 300) }
  }
}

/** The menu links already installed, so we do not create a second identical one. */
export async function listMenuLinks(locationId: string): Promise<{ items: any[]; error?: string }> {
  const res = await crmGet('/custom-menus/', locationId)
  if (!res.ok) {
    const d = await readJson(res)
    return { items: [], error: `${res.status}: ${d?.message || d?._raw || 'could not list menus'}` }
  }
  const d = await readJson(res)
  return { items: d?.customMenus || d?.data || [] }
}

export async function createMenuLink(
  locationId: string,
  input: MenuLinkInput
): Promise<MenuLinkResult> {
  const title = input.title.trim().slice(0, 60)
  if (!title) return { ok: false, error: 'The menu link needs a title.' }
  if (!/^https?:\/\//i.test(input.url)) {
    // An iframe menu pointing at a relative path renders blank inside the CRM,
    // which looks like our app is broken rather than like a bad URL.
    return { ok: false, error: 'The URL must be absolute (https://…) — a relative path renders blank in the CRM iframe.' }
  }

  const showToAll = input.showToAllLocations === true
  const locations = showToAll ? [] : (input.locations ?? [locationId])

  if (!showToAll && locations.length === 0) {
    return { ok: false, error: 'Give at least one sub-account, or set showToAllLocations.' }
  }

  // Don't stack duplicates. Someone re-running a provisioning step should not
  // end up with three identical entries in a client's sidebar.
  const existing = await listMenuLinks(locationId)
  const dupe = existing.items.find(
    (m: any) => String(m?.title || '').trim().toLowerCase() === title.toLowerCase()
  )
  if (dupe) {
    return {
      ok: true,
      menuId: dupe._id || dupe.id,
      title,
      reach: showToAll ? 'all' : locations.length,
      error: undefined,
    }
  }

  const body = {
    title,
    url: input.url,
    icon: { name: input.icon || 'layout-template', fontFamily: 'fas' },
    showOnCompany: input.showOnCompany ?? false,
    showOnLocation: input.showOnLocation ?? true,
    showToAllLocations: showToAll,
    openMode: input.openMode || 'iframe',
    locations,
    userRole: input.userRole || 'all',
    // Only meaningful in iframe mode, and both default off: a builder does not
    // need the camera, and asking for permissions you never use erodes trust.
    allowCamera: false,
    allowMicrophone: false,
  }

  const res = await crmPostRaw('/custom-menus/', locationId, body)
  const data = await readJson(res)

  if (!res.ok) {
    return {
      ok: false,
      error: `${res.status}: ${data?.message || data?._raw || 'menu link rejected'}`,
    }
  }

  const menu = data?.customMenu || data?.data || data
  return {
    ok: true,
    menuId: menu?._id || menu?.id,
    title,
    reach: showToAll ? 'all' : locations.length,
  }
}

/**
 * The surfaces worth putting in a client's sidebar, and where they point.
 *
 * EVERY URL HERE IS FETCHED BEFORE IT SHIPS. Two of the three used to point at
 * routes that do not exist — `/builder` and `/store` both answered 404 on
 * app.0ncore.com, and a 404 loaded into the CRM's iframe is indistinguishable
 * from "0nCore is broken" to the agency's client. A tile that opens onto
 * nothing is worse than no tile, so a preset only earns its place once the URL
 * has been opened in a real cross-origin iframe and shown to render something.
 *
 * Checked 2026-08-19, framed cross-origin in headless Chrome:
 *   app.0ncore.com        200 — "Command · Tell 0n what to do across your clients"
 *   app.0ncore.com/crm/build 200 — "Build a site · Design it here, then send it into a client account"
 *   app.0ncore.com/builder   404 — REMOVED (the real path is /crm/build)
 *   app.0ncore.com/store     404 — REMOVED (no store surface exists on this host;
 *                                 do not re-add one until a route answers 200)
 */
export function builderMenuPresets(appHost = 'https://app.0ncore.com') {
  return [
    {
      key: 'site-builder',
      title: 'Website Builder',
      url: `${appHost}/crm/build`,
      icon: 'layout-template',
      blurb: 'Drag-and-drop page builder, opened inside the CRM.',
    },
    {
      key: 'command',
      title: '0nCORE',
      url: appHost,
      icon: 'bolt',
      blurb: 'The command centre — describe the work, approve the plan.',
    },
  ]
}
