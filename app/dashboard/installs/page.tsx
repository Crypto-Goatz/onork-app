import type { Metadata } from 'next'
import { InstallHub } from '../../(install)/_components/InstallHub'

export const metadata: Metadata = {
  title: 'Installs',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ install?: string }>
}

export default async function DashboardInstallsPage({ searchParams }: PageProps) {
  const params = await searchParams
  return <InstallHub mode="dashboard" initialInstallId={params.install} />
}
