import type { Metadata } from 'next'
import { Globe, LayoutGrid, Server, Sparkles } from 'lucide-react'
import ProductPage from '@/components/marketing/ProductPage'

export const metadata: Metadata = {
  title: 'AI Website Management for Agencies — Build & Manage Client Sites | 0nCORE',
  description:
    'Build, deploy and manage every client website from one dashboard. AI site building by command, hosted today, native-builder import where supported.',
  alternates: { canonical: 'https://www.0ncore.com/website-management' },
  openGraph: {
    title: 'Build and manage every client site from one place — 0nCORE',
    description: 'Describe the site; it is built and deployed. Every client site in one dashboard.',
    url: 'https://www.0ncore.com/website-management',
    type: 'website',
  },
}

export default function Page() {
  return (
    <ProductPage
      canonical="https://www.0ncore.com/website-management"
      eyebrow="Website management"
      status="partial"
      h1="Build and manage every client site from one place."
      intro="Client sites end up scattered across builders, hosts and logins, and the person who knows where each one lives is a bottleneck. 0nCORE brings site building into your command centre — describe the site and it is built and deployed."
      bullets={[
        'One request becomes a deployed site with pages, forms and a calendar',
        'Hosted sites are live today at your 0nCORE URL',
        'You see the price before it builds, and a failed build is never billed',
      ]}
      sections={[
        {
          icon: Sparkles,
          h2: 'Build by command',
          body: 'Say what the site is for and who it is for. 0nCORE plans it, prices it, and builds it once you approve — the same gate as every other action.',
        },
        {
          icon: LayoutGrid,
          h2: 'Manage in one place',
          body: 'Every client site in one dashboard, so updating one does not mean remembering which builder and which login it lives behind.',
        },
        {
          icon: Server,
          h2: 'Hosted today, native where supported',
          body: 'Hosted sites go live immediately at your 0nCORE URL. Landing a page inside your CRM\'s own Sites area — so the client sees it there — depends on import fidelity we are still proving, and we will not claim it until it holds.',
          roadmap: true,
        },
        {
          icon: Globe,
          h2: 'Powered by web0n',
          body: 'The same site engine behind web0n, wired into your agency workflow rather than sitting in a separate tool.',
        },
      ]}
      faq={[
        {
          q: 'Where does the site actually live?',
          a: 'Today it is hosted by us at your 0nCORE URL, and the link is written back to the client record. It does not appear in your CRM\'s native Sites area — we say that plainly rather than letting the difference come as a surprise.',
        },
        {
          q: 'What does a site build cost?',
          a: 'A site build is $10. You see the price in the plan before anything runs, and a build that fails is not billed. Most agencies mark it up and resell it.',
        },
        {
          q: 'Can I edit it afterwards?',
          a: 'Yes — the editor is ours, so there is no API limit on what you can change.',
        },
      ]}
      cta={{ label: 'Install in your CRM', href: '/agencies' }}
      secondaryCta={{ label: 'See pricing', href: '/pricing' }}
      related={[
        { label: 'For agencies', href: '/agencies' },
        { label: 'Client management', href: '/client-management' },
        { label: 'Course building', href: '/course-builder' },
        { label: 'Security', href: '/security' },
      ]}
    />
  )
}
