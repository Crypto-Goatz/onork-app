import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import LegacyCrmChrome from './LegacyCrmChrome'
import SetupAlert from './SetupAlert'

/**
 * Everything under /crm, with the right chrome for the host it is served on.
 *
 * app.0ncore.com IS the dashboard — the whole host is rewritten into /crm by
 * middleware, so every page here is the product and must render bare. The dark
 * sidebar in LegacyCrmChrome belongs to the older /crm/* tool pages on www and
 * has no business appearing around the agency dashboard.
 *
 * DECIDED BY HOST, NOT PATHNAME. The previous version bypassed the chrome only
 * when pathname === '/crm', which broke the moment the app grew a second page:
 * /dashboard, /clients and /automations all rewrite into /crm/* and got the dark
 * sidebar wrapped around a white app. usePathname() cannot see the rewrite, and
 * the host can.
 *
 * Server component on purpose — the decision is made before anything renders,
 * so the wrong chrome never flashes.
 */
/**
 * The /crm tree IS the agency app, wherever it is reached from.
 *
 * Signing in at 0ncore.com landed on www.0ncore.com/crm, which failed the
 * app-host check and wrapped the new white product in the legacy dark sidebar —
 * app content, wrong chrome, and no app. in the address bar to explain it.
 *
 * Rather than teach two hosts to render the same product differently, the
 * public hosts now send /crm to the app host and stop. One canonical home, one
 * chrome, and a URL that matches what is on screen. localhost and previews are
 * left alone so development is unaffected.
 */
const PUBLIC_HOSTS = new Set(['www.0ncore.com', '0ncore.com'])

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host') || ''
  if (PUBLIC_HOSTS.has(host)) redirect('https://app.0ncore.com/crm')

  const isAppHost = host === 'app.0ncore.com'
  // The setup alert rides above whichever chrome is used. Unfinished setup is
  // the difference between "broken product" and "one step left", so it must be
  // visible on every CRM surface, not only on /connect.
  if (isAppHost) return <><SetupAlert />{children}</>
  return <LegacyCrmChrome><SetupAlert />{children}</LegacyCrmChrome>
}
