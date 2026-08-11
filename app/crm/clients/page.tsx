import ClientsManager from '../ClientsManager'

export const metadata = { title: 'Clients — 0nCORE', robots: { index: false, follow: false } }

/**
 * /crm/clients — the connected-client list.
 *
 * Previously rendered AgencyDashboard's "clients" view, which lists what exists
 * in the CRM rather than what 0nCORE is actually connected to. Those are
 * different questions, and only the second one explains why a command failed.
 */
export default function Page() { return <ClientsManager /> }
