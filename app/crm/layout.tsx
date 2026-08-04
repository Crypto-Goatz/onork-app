import { headers } from 'next/headers'
import LegacyCrmChrome from './LegacyCrmChrome'

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
export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const isAppHost = (await headers()).get('host') === 'app.0ncore.com'
  if (isAppHost) return <>{children}</>
  return <LegacyCrmChrome>{children}</LegacyCrmChrome>
}
