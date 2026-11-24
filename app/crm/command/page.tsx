import AgencyDashboard from '../AgencyDashboard'

export const metadata = { title: 'Agency Command — 0nCORE', robots: { index: false, follow: false } }

/** The old /crm home, kept reachable after the 2026-11-24 SDK re-scope (it is in HIDDEN_NAV). */
export default function Page() { return <AgencyDashboard /> }
