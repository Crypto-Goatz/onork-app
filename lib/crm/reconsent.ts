/**
 * Re-consent on open — the permanent answer to token death.
 *
 * THE FAILURE THIS EXISTS FOR. A CRM OAuth install dies quietly. The access
 * token lasts a day; the refresh token is what keeps it alive, and when that is
 * missing or revoked the install works perfectly right up until it does not.
 * Thirty rows in this database reached that state and NOTHING told anybody —
 * not the customer, not the product. It surfaced from a support conversation.
 * A background worker cannot fix it, because the platform requires a HUMAN to
 * re-authorize. So the only reliable place to ask is the moment a person opens
 * the app and cares about the answer.
 *
 * WHY IT IS NOT AN EMAIL. An email reaches whoever owns the inbox, days later,
 * out of context, and asks them to go find a thing. Opening the app is already
 * the intent — the person is in front of the product, wants it to work, and one
 * click away from the consent screen. The email is a sweep for people who never
 * open it, not the mechanism.
 *
 * IT IS BUILT WITH NO USERS TO SHOW IT TO. Mike's ruling, and it is the right
 * one: this is hygiene that must exist BEFORE the first real install, because
 * the first person to hit token death is precisely the person you cannot afford
 * to lose. The 30 dead rows are test-era artifacts and are not being chased.
 *
 * THE ENTITLEMENT GATE AND THIS ARE DIFFERENT QUESTIONS, asked in this order:
 *   resolveEntitlement — "may this location open this add-on?"   (permission)
 *   resolveReconsent   — "can it actually reach the CRM if it does?" (capability)
 * A locked add-on never reaches here. An OPEN add-on with a dead install is the
 * exact case that used to render a Run button which then 401'd, and that button
 * is the thing this replaces. Permission granted over a dead connection is the
 * worst of the four combinations because it is the only one that looks fine.
 *
 * SEVERITY IS THREE-VALUED AND MAPS ONTO A BEHAVIOUR, not a colour:
 *   none   — say nothing. Do not decorate a working screen with reassurance.
 *   dying  — works today, cannot survive expiry. A banner ABOVE the working
 *            frame. Blocking here would take away a capability the customer
 *            still has, to warn them about losing it, which is absurd.
 *   dead   — cannot serve a call at all. The frame does not render; this does.
 *            Rendering the frame would be a Run button that 401s.
 *   absent — entitled, but this location has never connected. Same action,
 *            different sentence: "connect" is not "reconnect", and telling a
 *            new customer their connection expired is a bug report waiting to
 *            happen.
 *
 * IT NEVER DOWNGRADES ON ITS OWN FAILURE. If the read fails we return 'none'
 * and say we could not check. A prompt demanding re-authorization because a
 * query timed out would send a customer through a consent screen they did not
 * need, and re-consent is the one flow where a false positive costs trust.
 */
import { createServiceClient } from '@/lib/connect/service-client'
import { isRetiredCrmApp } from '@/lib/crm-apps'
import {
  verdictFor,
  isTerminal,
  isUsable,
  type InstallVerdict,
  type InstallVerdictRow,
} from '@/lib/crm/install-verdict'

export type ReconsentSeverity = 'none' | 'dying' | 'dead' | 'absent'

export interface ReconsentVerdict {
  /** True when something should be shown. `severity` says what kind. */
  needed: boolean
  severity: ReconsentSeverity
  /** True when the frame behind it must NOT render. Only ever set by 'dead'. */
  blocking: boolean
  /** A headline a customer reads, not a status code. */
  headline: string
  /** One paragraph: what happened, in their terms. */
  detail: string
  /** The single action that fixes it. Always present when needed. */
  actionLabel: string
  /** Where that action goes. Carries the app and the return path. */
  actionHref: string
  locationId: string
  appId: string | null
  /** The underlying row verdict, for logs and the operator surfaces. */
  verdict: InstallVerdict | null
  /** ISO expiry of the install this verdict came from, when known. */
  expiresAt: string | null
  /** Whole days until it stops working. Only meaningful for 'dying'. */
  daysLeft: number | null
  /**
   * false when a read failed. `needed` is false either way — see the note at
   * the top about false positives.
   */
  verified: boolean
}

const DAY_MS = 86_400_000

function none(locationId: string, appId: string | null, verified = true): ReconsentVerdict {
  return {
    needed: false, severity: 'none', blocking: false,
    headline: '', detail: '', actionLabel: '', actionHref: '',
    locationId, appId, verdict: null, expiresAt: null, daysLeft: null, verified,
  }
}

/**
 * Where "Reconnect" goes.
 *
 * `next` is carried so the person lands back on the add-on they were opening
 * rather than on a dashboard, and `app` names which marketplace app to
 * re-authorize so the callback does not have to guess — guessing is what spent
 * single-use codes against the wrong client and reported it as bad credentials.
 */
export function reconsentHref(opts: { appId?: string | null; next?: string | null }): string {
  const p = new URLSearchParams()
  if (opts.appId) p.set('app', opts.appId)
  // Only ever an internal path. An open redirect on the end of an OAuth flow is
  // a credential-harvesting hole, so anything that is not a same-site path is
  // dropped rather than sanitised into something that looks close enough.
  const next = opts.next ?? ''
  if (next.startsWith('/') && !next.startsWith('//')) p.set('next', next)
  const qs = p.toString()
  return qs ? `/api/oauth/reauth?${qs}` : '/api/oauth/reauth'
}

/** Rank for choosing the best row when a location holds several installs. */
function rank(v: InstallVerdict): number {
  if (isUsable(v) && v !== 'dying') return 3
  if (v === 'dying') return 2
  if (v === 'expired-refreshable' || v === 'unknown-expiry') return 1
  return 0
}

const GONE = ['archived', 'uninstalled', 'removed']

/**
 * Tie-break, because a location legitimately holds several installs and ranking
 * alone leaves the choice to sort order.
 *
 * A real one: nphConTwfHcVE1oA0uep holds a revoked sub-account install AND a
 * four-month-old legacy row that never got a token. Both are terminal, so the
 * severity is the same either way — but the row we pick names the app in the
 * reconnect link, and pointing someone at the wrong app's consent screen
 * completes a flow that fixes nothing. Prefer a still-installed row, then the
 * most recent, so the link names the app they actually use.
 */
function tieBreak(a: Row, b: Row): number {
  const goneA = GONE.includes(String(a.status ?? '').toLowerCase()) ? 1 : 0
  const goneB = GONE.includes(String(b.status ?? '').toLowerCase()) ? 1 : 0
  if (goneA !== goneB) return goneA - goneB

  const tA = new Date(a.updated_at ?? 0).getTime()
  const tB = new Date(b.updated_at ?? 0).getTime()
  if (tA !== tB) return tB - tA

  /**
   * Equal timestamps are not hypothetical: both of that location's rows carry
   * the SAME updated_at, because one administrative pass archived them
   * together. Falling through to database order then picked the legacy row that
   * never held a token at all over the sub-account app that actually served
   * this location — and named the wrong app in the reconnect link.
   *
   * A row that once held a token is the app they used. A row that never did is
   * an install that failed at the exchange years ago and is not what anyone is
   * trying to get back.
   */
  return (b.access_token ? 1 : 0) - (a.access_token ? 1 : 0)
}

interface Row extends InstallVerdictRow {
  location_id: string
  app_id: string | null
  status: string | null
  updated_at: string | null
}

export async function resolveReconsent(args: {
  locationId: string | null | undefined
  /** Restrict to one marketplace app. null = any app's install serves this. */
  appId?: string | null
  /** Where to return after re-authorizing. Must be an internal path. */
  next?: string | null
  /** Name of the thing being opened, for copy. */
  appName?: string
  now?: Date
}): Promise<ReconsentVerdict> {
  const now = (args.now ?? new Date()).getTime()
  const locationId = (args.locationId ?? '').trim()
  const appId = args.appId ?? null
  const what = args.appName ? `“${args.appName}”` : 'this add-on'
  const href = reconsentHref({ appId, next: args.next })

  // No location is not a token problem. The entitlement gate already says
  // "connect a CRM location" for this case, and two screens saying different
  // things about the same missing fact is worse than one.
  if (!locationId) return none('', appId)

  const db = createServiceClient()
  if (!db) return none(locationId, appId, false)

  let q = db
    .from('crm_installations')
    .select('location_id, app_id, access_token, refresh_token, expires_at, status, updated_at, health_status')
    .eq('location_id', locationId)
    .order('updated_at', { ascending: false })
    .limit(50)
  if (appId) q = q.eq('app_id', appId)

  const { data, error } = await q
  if (error) return none(locationId, appId, false)

  // A retired app's rows are history, not capability — the same rule the
  // entitlement gate applies. Matching is by prefix because one retired
  // registration is only known by its prefix.
  const rows = ((data ?? []) as Row[]).filter((r) => !isRetiredCrmApp(String(r.app_id ?? '')))

  if (rows.length === 0) {
    return {
      needed: true, severity: 'absent', blocking: false,
      headline: 'This location is not connected to your CRM yet',
      detail:
        `${what} runs against your CRM, and no app has been installed for this location. ` +
        `Connecting takes one approval screen and brings you straight back here.`,
      actionLabel: 'Connect your CRM',
      actionHref: href,
      locationId, appId, verdict: null, expiresAt: null, daysLeft: null, verified: true,
    }
  }

  const judged = rows
    .map((r) => ({ row: r, ...verdictFor(r, now) }))
    .sort((a, b) => rank(b.verdict) - rank(a.verdict) || tieBreak(a.row, b.row))

  const best = judged[0]

  // Something at this location still works. Nothing to say.
  if (isUsable(best.verdict) && best.verdict !== 'dying') return none(locationId, appId)

  const expiresAt = best.row.expires_at ?? null

  /**
   * THE LINK NAMES THE APP THAT ACTUALLY DIED, not the caller's filter.
   *
   * Most add-ons ride whatever install the location has, so they ask with
   * appId=null — and a null app id sends the customer to the DEFAULT
   * sub-account consent screen. If their install belongs to the agency app or
   * the Course Builder app, that flow completes, writes a row for an app they
   * do not use, and leaves the dead install exactly as dead. The row we just
   * judged knows which app it is; use it.
   */
  const deadAppId = appId ?? (best.row.app_id ? String(best.row.app_id) : null)
  const fixHref = reconsentHref({ appId: deadAppId, next: args.next })

  if (best.verdict === 'dying') {
    const msLeft = expiresAt ? new Date(expiresAt).getTime() - now : 0
    const daysLeft = Math.max(0, Math.ceil(msLeft / DAY_MS))
    return {
      needed: true, severity: 'dying', blocking: false,
      headline: 'Your CRM connection stops working soon',
      detail:
        `${what} still works right now. But this location’s connection was set up without the ` +
        `credential that lets us renew it in the background, so it stops ` +
        `${daysLeft <= 1 ? 'within a day' : `in about ${daysLeft} days`} and nothing we run can ` +
        `prevent that — only you can, by approving it again. It takes one screen.`,
      actionLabel: 'Reconnect now',
      actionHref: fixHref,
      locationId, appId: deadAppId, verdict: best.verdict, expiresAt, daysLeft, verified: true,
    }
  }

  // Recoverable-in-principle states are still DOWN at this instant — the worker
  // runs every six hours and the person is here now. Offer the fix without
  // taking the screen away, because the next cron run may well beat them to it.
  if (!isTerminal(best.verdict)) {
    return {
      needed: true, severity: 'dying', blocking: false,
      headline: 'Your CRM connection needs renewing',
      detail:
        `This location’s access token has expired. We renew these automatically and the next ` +
        `attempt may fix it on its own — but if ${what} reports an authorization error before ` +
        `then, approving access again clears it immediately.`,
      actionLabel: 'Reconnect now',
      actionHref: fixHref,
      locationId, appId: deadAppId, verdict: best.verdict, expiresAt, daysLeft: 0, verified: true,
    }
  }

  // Terminal. Nothing we run recovers this — say that plainly, and say it is
  // one screen to fix, because "contact support" for a self-service action is
  // how a thirty-second fix becomes a week.
  const uninstalled = ['archived', 'uninstalled', 'removed'].includes(
    String(best.row.status ?? '').toLowerCase(),
  )

  return {
    needed: true, severity: 'dead', blocking: true,
    headline: uninstalled
      ? 'The app is no longer installed on this location'
      : 'Your CRM connection has expired',
    detail: uninstalled
      ? `${what} needs an installed app on this location to reach your CRM, and this one has been ` +
        `removed. Reinstalling restores it — your settings and history are kept.`
      : `${what} cannot reach your CRM until you approve access again. This is not something we can ` +
        `renew for you: your CRM requires a person to authorize it. Nothing has been lost — your ` +
        `settings and history are exactly as you left them, and one approval screen brings them back.`,
    actionLabel: uninstalled ? 'Reinstall the app' : 'Reconnect your CRM',
    actionHref: fixHref,
    locationId, appId: deadAppId, verdict: best.verdict, expiresAt, daysLeft: 0, verified: true,
  }
}
