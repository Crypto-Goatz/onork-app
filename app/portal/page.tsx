import type { Metadata } from 'next'

/**
 * app.0ncore.com/portal — the hosted membership portal.
 *
 * The SAME widget the agency drops into their own site, on a page we host. That
 * matters: an agency who has not built a members area yet can send the link
 * today, and the one who has drops the element into their own page and gets an
 * identical experience. One implementation, two front doors — a second one
 * would drift and members would see different fields depending which they hit.
 */
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-14">
      <div id="oncore-portal" />
      {/* Loads the same runtime the builder element uses. */}
      <script async src="/widgets/oncore_member_profile/embed.js?location=hosted" />
    </main>
  )
}
