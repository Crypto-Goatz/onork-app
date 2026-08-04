import type { Metadata } from 'next'
import WelcomePage from '../WelcomePage'

/**
 * app.0ncore.com/dashboard — the welcome screen.
 *
 * Reached through the app-host rewrite in middleware, which maps every path on
 * app.0ncore.com into /crm. That is why this lives here rather than at
 * app/dashboard, which already serves a different product on www and must not
 * change.
 */
export const metadata: Metadata = {
  title: 'Your agency — 0nCORE',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <WelcomePage />
}
