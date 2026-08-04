import type { Metadata } from 'next'
import { ListChecks, UserCog, Bot, Link2 } from 'lucide-react'
import ProductPage from '@/components/marketing/ProductPage'

export const metadata: Metadata = {
  title: 'AI Task Lists for Agencies — Humans + AI on One List | 0nCORE',
  description:
    'One shared task list where AI agents and your team work side by side. Every action from every client account, assigned, tracked, and accountable.',
  alternates: { canonical: 'https://www.0ncore.com/ai-task-lists' },
  openGraph: {
    title: 'Humans and AI on one accountable task list — 0nCORE',
    description: 'Most tools give AI its own silo. 0nCORE puts agents and your team on the same list.',
    url: 'https://www.0ncore.com/ai-task-lists',
    type: 'website',
  },
}

export default function Page() {
  return (
    <ProductPage
      canonical="https://www.0ncore.com/ai-task-lists"
      eyebrow="Task lists"
      status="partial"
      h1="Humans and AI on one accountable task list."
      intro="Most tools give AI its own silo, so you end up checking two lists and trusting neither. 0nCORE puts AI agents and your team on the same list with the same accountability — when a command runs, the work lands here whether a person or an agent did it."
      bullets={[
        'One list across every client account',
        'Agents log what they did, next to what your team did',
        'Every task carries its client, its source and its receipt',
      ]}
      sections={[
        {
          icon: ListChecks,
          h2: 'One list, every source',
          body: 'Tasks arrive from commands, from flows, and from people adding them by hand — across every client you manage, in one place rather than one list per account.',
        },
        {
          icon: UserCog,
          h2: 'Assign to anyone',
          body: 'Say "assign this to Sarah" and the task, its context and its receipt route to her. Team members resolve from your CRM, so you are assigning to real people, not a separate address book.',
          roadmap: true,
        },
        {
          icon: Bot,
          h2: 'Agents that report in',
          body: 'Give your AI agents 0nCORE tools and their work appears on the same list. Anything that changes an account or costs money needs your approval first by default — an agent runs unattended, and that is exactly when a silent write hurts.',
        },
        {
          icon: Link2,
          h2: 'Nothing falls through',
          body: 'Every task is tied to a client, a source and a receipt, so "did that actually happen?" has an answer rather than a guess.',
        },
      ]}
      faq={[
        {
          q: 'Can an AI agent act on a client account by itself?',
          a: 'Only if you allow it. Every tool that writes or costs money defaults to asking you first; reads default to allowed. You set the policy per tool, and you can block one outright.',
        },
        {
          q: 'Does this replace my task manager?',
          a: 'It is the list for agency work that touches client accounts. 0nTask is the standalone product if you want it for everything else.',
        },
      ]}
      cta={{ label: 'Start free', href: '/get-started' }}
      secondaryCta={{ label: 'See how agencies use it', href: '/agencies' }}
      related={[
        { label: 'Client management', href: '/client-management' },
        { label: 'For agencies', href: '/agencies' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Security', href: '/security' },
      ]}
    />
  )
}
