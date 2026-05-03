import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'RocketOpp Admin',
  description: 'Mobile-first CRM admin — dashboard, actions, campaigns, and Jaxx AI.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RocketOpp',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d1117',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-admin-root className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
      {children}
    </div>
  )
}
