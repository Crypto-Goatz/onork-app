import type { Metadata } from 'next'
import { Layers, Eye, Zap, Receipt } from 'lucide-react'
import ProductPage from '@/components/marketing/ProductPage'

export const metadata: Metadata = {
  title: 'AI Client Management CRM for Agencies | 0nCORE',
  description:
    'Manage every client account from one AI dashboard. Bulk actions across sub-accounts, instant provisioning, and one command surface for your whole book of business.',
  alternates: { canonical: 'https://www.0ncore.com/client-management' },
  openGraph: {
    title: 'Manage every client account from one screen — 0nCORE',
    description: 'Bulk actions across every sub-account, cross-client visibility, and a receipt for everything that runs.',
    url: 'https://www.0ncore.com/client-management',
    type: 'website',
  },
}

export default function Page() {
  return (
    <ProductPage
      canonical="https://www.0ncore.com/client-management"
      eyebrow="Client management"
      status="live"
      h1="Manage every client account from one screen."
      intro="Agencies managing ten, thirty, a hundred clients hit the same wall: your CRM gives each client an account, but nothing to command them together. 0nCORE is that layer — one surface that acts across every account you manage."
      bullets={[
        'One request runs across every client you choose, at once',
        'Nothing touches an account until you see the plan and approve it',
        'Every action leaves a receipt against the right client',
      ]}
      sections={[
        {
          icon: Layers,
          h2: 'One command, every account',
          body: 'Tag, message, move deals or add notes across all of your clients in a single request. You describe the outcome; 0nCORE splits it per account and runs the parts in order.',
        },
        {
          icon: Eye,
          h2: 'Cross-client visibility',
          body: 'Ask one question and get an answer covering your whole book — which clients have gone quiet, where the work is piling up. It also tells you which accounts it could not read, so a partial answer never poses as a complete one.',
        },
        {
          icon: Zap,
          h2: 'Instant provisioning',
          body: 'Describe a new client in a paragraph and the account assembles itself — your snapshot applied at creation, pipelines and fields set, onboarding started.',
          roadmap: true,
        },
        {
          icon: Receipt,
          h2: 'Everything accountable',
          body: 'Every action is written down before it runs and settled after, so nothing is silent. A step that fails is never billed, and a bulk action large enough to trigger your automations is refused rather than guessed at.',
        },
      ]}
      faq={[
        {
          q: 'Does it change anything without asking me?',
          a: 'No. There is no automatic path to a live write. 0nCORE produces a plan with a price, and only your approval runs it — the plan you approve is signed, so what executes is exactly what you saw.',
        },
        {
          q: 'What happens with a very large bulk action?',
          a: 'It stops and tells you the number. Tags can trigger automations in your CRM, so a wide tag is a wide send; above a safe threshold 0nCORE refuses and asks you to narrow it or do it deliberately in your CRM.',
        },
        {
          q: 'Do I need to give up my existing setup?',
          a: 'No. 0nCORE works on the accounts you already have. It reads and acts through your CRM rather than replacing it.',
        },
      ]}
      cta={{ label: 'Install in your CRM', href: '/agencies' }}
      secondaryCta={{ label: 'See pricing', href: '/pricing' }}
      related={[
        { label: 'For agencies', href: '/agencies' },
        { label: 'AI task lists', href: '/ai-task-lists' },
        { label: 'Website management', href: '/website-management' },
        { label: 'Security', href: '/security' },
      ]}
    />
  )
}
