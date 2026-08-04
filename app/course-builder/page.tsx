import type { Metadata } from 'next'
import { BookOpen, Send, Workflow, RefreshCw } from 'lucide-react'
import ProductPage from '@/components/marketing/ProductPage'

export const metadata: Metadata = {
  title: 'Automated Course Builder for Agencies & Clients | 0nCORE',
  description:
    'Turn content into structured courses and deliver them to client accounts by command. On the 0nCORE roadmap — see what is built today and what is coming.',
  alternates: { canonical: 'https://www.0ncore.com/course-builder' },
  openGraph: {
    title: 'Build client courses by command — 0nCORE',
    description: 'Point 0nCORE at your material and it structures modules, lessons and delivery.',
    url: 'https://www.0ncore.com/course-builder',
    type: 'website',
  },
}

export default function Page() {
  return (
    <ProductPage
      canonical="https://www.0ncore.com/course-builder"
      eyebrow="Course building"
      // Honest-scope rule: this is not shipped, so the page says so in the
      // badge, in the copy, and by omitting the availability claim from schema.
      status="roadmap"
      h1="Build client courses by command."
      intro="Agencies sell courses, memberships and training, but building them is manual, slow, and lives in yet another tool. 0nCORE will build structured courses from your content and deploy them into your clients' accounts. This is on the roadmap — it is not something you can run today."
      bullets={[
        'Not available yet — this page describes what is being built',
        'The command surface and delivery engine it needs are already live',
        'Tell us how you sell courses and it shapes what ships',
      ]}
      sections={[
        {
          icon: BookOpen,
          h2: 'Content in, course out',
          body: 'Point 0nCORE at your material and it proposes the structure — modules, lessons and the order to teach them in — for you to edit before anything is created.',
          roadmap: true,
        },
        {
          icon: Send,
          h2: 'Deploy to any client',
          body: 'Push a finished course into a client account by command, the same way any other 0nCORE action runs: planned, priced, approved, receipted.',
          roadmap: true,
        },
        {
          icon: Workflow,
          h2: 'Onboarding built in',
          body: 'Wire course delivery into the onboarding a new client already gets, so enrolment is part of provisioning rather than a separate chore.',
          roadmap: true,
        },
        {
          icon: RefreshCw,
          h2: 'Update everywhere at once',
          body: 'Revise a course once and push the change to every client running it, instead of repeating the edit per account.',
          roadmap: true,
        },
      ]}
      faq={[
        {
          q: 'Can I use this today?',
          a: 'No. Course building is on the roadmap and nothing on this page is live yet. What is live today is the command centre, client management and site building — start there.',
        },
        {
          q: 'When will it ship?',
          a: 'We are not giving a date we cannot stand behind. The parts it depends on — the command surface, the approval gate and the receipt trail — are already built, which is why this is next rather than hypothetical.',
        },
      ]}
      cta={{ label: 'Tell us what you need', href: '/contact?ref=course-builder' }}
      secondaryCta={{ label: 'See what is live now', href: '/agencies' }}
      related={[
        { label: 'For agencies', href: '/agencies' },
        { label: 'Client management', href: '/client-management' },
        { label: 'Website management', href: '/website-management' },
        { label: 'Pricing', href: '/pricing' },
      ]}
    />
  )
}
