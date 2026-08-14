import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import SetupAlert from './SetupAlert'

/**
 * Everything under /crm — the agency app, with one home and one chrome.
 *
 * This layout used to branch on the host: app.0ncore.com rendered the product
 * bare, and anything else wrapped it in a legacy dark sidebar. Signing in at
 * 0ncore.com therefore landed on www.0ncore.com/crm and produced the new white
 * product inside the old chrome, with nothing in the URL to explain it.
 *
 * The branch is gone. Public hosts redirect here; there is no second rendering
 * of this product to keep in sync.
 *
 * WHAT WAS REMOVED WITH IT: the legacy sidebar and ten routes beneath it —
 * contacts, conversations, calendar, invoices, payments, social, workflows,
 * products, forms, tags. Every one was a single line re-exporting a
 * /dashboard/crm/* page, none was linked from anywhere in the current product,
 * and the pages themselves still exist. The one thing in that chrome worth
 * keeping was Proof of Life, which now sits at the top of Setup & Keys.
 *
 * Server component on purpose — the decision is made before anything renders,
 * so the wrong chrome never flashes.
 */
const PUBLIC_HOSTS = new Set(['www.0ncore.com', '0ncore.com'])

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const host = (await headers()).get('host') || ''
  if (PUBLIC_HOSTS.has(host)) redirect('https://app.0ncore.com/crm')

  // The setup alert rides above every CRM surface. Unfinished setup is the
  // difference between "broken product" and "one step left", so it must be
  // visible everywhere rather than only on /connect.
  return (
    <>
      <SetupAlert />
      {children}
    </>
  )
}
