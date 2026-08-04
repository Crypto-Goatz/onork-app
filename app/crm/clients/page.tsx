import AgencyDashboard from '../AgencyDashboard'
export const metadata = { title: 'Clients — 0nCORE', robots: { index: false, follow: false } }
export default function Page() {
  return <AgencyDashboard initialView="clients" />
}
