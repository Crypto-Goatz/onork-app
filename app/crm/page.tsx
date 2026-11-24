import { redirect } from 'next/navigation'
import AgencyDashboard from './AgencyDashboard'

export const metadata = {
  title: '0nCORE',
  robots: { index: false, follow: false },
}

/**
 * Home = Contacts (2026-11-24 SDK re-scope). A bare visit goes to the SDK;
 * a visit carrying query parameters (an install result, a view switch, a
 * command) still renders the agency dashboard that reads them, so nothing
 * that links here with state breaks. The dashboard itself lives on at /crm/command.
 */
export default async function CrmAppPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  if (Object.keys(sp).length === 0) redirect('/crm/contacts')
  return <AgencyDashboard />
}
