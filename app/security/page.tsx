import type { Metadata } from 'next'
import { Lock, ScrollText, ShieldCheck, KeyRound, ServerCog, EyeOff } from 'lucide-react'
import ProductPage from '@/components/marketing/ProductPage'

export const metadata: Metadata = {
  title: 'Security & Data Handling | 0nCORE',
  description:
    'How 0nCORE handles your credentials and your clients\' data: encrypted at rest, never in the browser, human approval before anything runs, and a receipt for every action.',
  alternates: { canonical: 'https://www.0ncore.com/security' },
  openGraph: {
    title: 'Your credentials, encrypted. Your actions, logged. — 0nCORE',
    description: 'No credential ever reaches the browser. Nothing runs without your approval.',
    url: 'https://www.0ncore.com/security',
    type: 'website',
  },
}

export default function Page() {
  return (
    <ProductPage
      canonical="https://www.0ncore.com/security"
      eyebrow="Security"
      status="live"
      h1="Your credentials, encrypted. Your actions, logged. Your control, absolute."
      intro="You are handing us access to your clients' accounts, which is not a small thing to ask. Here is exactly how that access is held, what can use it, and what stops it being used without you."
      bullets={[
        'No credential is ever sent to the browser',
        'Nothing writes to a client account without your explicit approval',
        'Every action is recorded before it runs, not after it succeeds',
      ]}
      sections={[
        {
          icon: Lock,
          h2: 'Credentials encrypted at rest',
          body: 'Tokens and keys are sealed with AES-256-GCM before they are stored. GCM is authenticated, so a value that has been altered in storage fails to open rather than decrypting into something usable.',
        },
        {
          icon: EyeOff,
          h2: 'Nothing sensitive reaches the browser',
          body: 'The dashboard holds one short-lived session token and nothing else. Every call to your CRM happens on our servers. If someone opens developer tools on the dashboard, the worst thing there is their own session.',
        },
        {
          icon: ShieldCheck,
          h2: 'Approval is the only route to a write',
          body: 'There is no automatic execution path. 0nCORE produces a plan; you approve it. The plan you approve is cryptographically signed, so what runs is exactly what you were shown — not a version of it edited in between.',
        },
        {
          icon: ScrollText,
          h2: 'A receipt for everything',
          body: 'Receipts are written before the call goes out, not after it returns, so an action that times out mid-flight still leaves a record. Approving the same plan twice is refused rather than run twice.',
        },
        {
          icon: KeyRound,
          h2: 'Scoped, revocable access',
          body: 'Each agency gets its own keys, scoped to what it has switched on, and every request is bound to the agency that made it. Uninstall and the access goes with it.',
        },
        {
          icon: ServerCog,
          h2: 'Blast radius has a limit',
          body: 'A bulk action large enough to trigger your automations is refused, with the number, rather than attempted. Tags start workflows in your CRM — a wide tag is a wide send, and that is a decision you should make deliberately.',
        },
      ]}
      faq={[
        {
          q: 'Can 0nCORE act on my clients without me?',
          a: 'No. Every state-changing action requires you to approve a plan first. AI agents you connect are held to the same rule: anything that writes or costs money asks you before it runs, unless you deliberately change that setting for that tool.',
        },
        {
          q: 'What happens when I uninstall?',
          a: 'The access token is revoked with the install, so 0nCORE can no longer reach your accounts. Your receipt history stays available to you as a record of what was done.',
        },
        {
          q: 'Do you store my clients\' contact data?',
          a: 'No. Contact records stay in your CRM. We store what we did and to which account — the receipt — not a copy of your clients\' databases.',
        },
        {
          q: 'Is my single sign-on session safe inside the iframe?',
          a: 'The context your CRM hands the dashboard is encrypted with a secret only we and the platform hold, and it is only ever opened on our servers. A forged one cannot produce a session.',
        },
      ]}
      cta={{ label: 'Install in your CRM', href: '/agencies' }}
      secondaryCta={{ label: 'Read the privacy policy', href: '/privacy' }}
      related={[
        { label: 'For agencies', href: '/agencies' },
        { label: 'Client management', href: '/client-management' },
        { label: 'Pricing', href: '/pricing' },
      ]}
    />
  )
}
