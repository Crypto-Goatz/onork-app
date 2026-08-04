import type { Metadata } from 'next'
import { Building2, PackageCheck, Bot, Rocket } from 'lucide-react'
import ProductPage from '@/components/marketing/ProductPage'

export const metadata: Metadata = {
  title: 'Vertical CRMs for B2B Service Companies | 0nCORE',
  description:
    'The 0nCORE engine, pre-configured per industry — snapshots, workflows, agents and playbooks out of the box. On the roadmap; register your industry.',
  alternates: { canonical: 'https://www.0ncore.com/verticals' },
  openGraph: {
    title: 'Purpose-built CRMs for B2B service businesses — coming soon',
    description: 'The same engine agencies already trust, pre-configured for your industry.',
    url: 'https://www.0ncore.com/verticals',
    type: 'website',
  },
}

export default function Page() {
  return (
    <ProductPage
      canonical="https://www.0ncore.com/verticals"
      eyebrow="Verticals"
      status="roadmap"
      h1="Purpose-built CRMs for B2B service businesses. Coming soon."
      intro="The same 0nCORE engine, pre-configured for a specific industry — the snapshots, workflows, agents and playbooks that industry actually needs, ready on day one instead of assembled over months. None of these are available yet; tell us your industry and it shapes which ships first."
      bullets={[
        'Not available yet — this is a roadmap page',
        'Built on the command centre agencies already run today',
        'Tell us your industry and we will come to you first',
      ]}
      sections={[
        {
          icon: PackageCheck,
          h2: 'Configured, not assembled',
          body: 'Each vertical ships with the pipelines, fields, automations and follow-up its industry runs on, so the first day looks like month three.',
          roadmap: true,
        },
        {
          icon: Bot,
          h2: 'Agents that know the work',
          body: 'The AI agent team arrives already briefed on how that industry sells, follows up and onboards — rather than a blank assistant you have to teach.',
          roadmap: true,
        },
        {
          icon: Building2,
          h2: 'Built for B2B service first',
          body: 'Professional services and B2B service companies are where this starts, because the shape of the work — long cycles, repeat clients, referral-led — is what the engine already handles best.',
          roadmap: true,
        },
        {
          icon: Rocket,
          h2: 'The same engine underneath',
          body: 'Nothing here is a separate product. It is 0nCORE with a head start, which is why it can ship per industry rather than being rebuilt each time.',
          roadmap: true,
        },
      ]}
      faq={[
        {
          q: 'Which verticals are available now?',
          a: 'None. This page describes work that has not shipped. If you need what 0nCORE does today, that is the agency command centre — client management, task lists and site building.',
        },
        {
          q: 'How do I get mine built first?',
          a: 'Tell us the industry and what your setup looks like. The verticals with real operators behind them get built ahead of the ones that only look good on a list.',
        },
      ]}
      cta={{ label: 'Register your industry', href: '/contact?ref=verticals' }}
      secondaryCta={{ label: 'See what is live now', href: '/agencies' }}
      related={[
        { label: 'For agencies', href: '/agencies' },
        { label: 'Client management', href: '/client-management' },
        { label: 'Pricing', href: '/pricing' },
      ]}
    />
  )
}
