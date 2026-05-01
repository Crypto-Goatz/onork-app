import { Metadata } from 'next'
import ReportBuilderClient from './ReportBuilderClient'

export const metadata: Metadata = {
  title: 'Ultimate Report Builder · 0nCore',
  description: 'On-demand multi-scanner report builder. Run CRM stack, SXO, AI readiness, and more against any URL.',
}

export const dynamic = 'force-dynamic'

export default function ReportBuilderPage() {
  return <ReportBuilderClient />
}
