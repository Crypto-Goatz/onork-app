import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '0nLinkedIn — AI Social Domination Suite',
  description: 'Automated LinkedIn posting, commenting & engagement powered by VPIS AI. The LinkedIn AI that learns from every post.',
  openGraph: {
    title: '0nLinkedIn — AI Social Domination Suite',
    description: 'Automated LinkedIn posting & commenting powered by VPIS AI scoring. Self-improving formula. Human-approved by default.',
    type: 'website',
  },
}

export default function LinkedInSalesPage() {
  return (
    <iframe
      src="/linkedin-sales.html"
      className="w-full min-h-screen border-none"
      style={{ height: '100vh', width: '100%' }}
    />
  )
}
