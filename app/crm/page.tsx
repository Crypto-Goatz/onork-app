import AgencyDashboard from './AgencyDashboard'

/**
 * The app surface. Served at app.0ncore.com/ (rewritten from /) and reachable
 * at /crm on the marketing host while DNS for the app subdomain is pending —
 * so the dashboard is viewable today rather than blocked on a CNAME.
 *
 * This replaced a re-export of the old dashboard CRM page. That surface is
 * still there in full at /crm/contacts, /crm/pipeline and the rest; this is the
 * command centre that sits above it.
 */
export const metadata = {
  title: 'Agency Command — 0nCORE',
  robots: { index: false, follow: false },
}

export default function CrmAppPage() {
  return <AgencyDashboard />
}
