import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '0n Lead Magnet',
  robots: 'index,follow',
}

export default function LeadLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-zinc-50 text-zinc-900">{children}</div>
}
