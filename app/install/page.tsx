import type { Metadata } from 'next'
import { InstallHub } from '../(install)/_components/InstallHub'
import SiteFooter from '@/components/SiteFooter'

export const metadata: Metadata = {
  title: 'Install 0nCore',
  description:
    'Install 0n on every tool you already use. One page, every integration — Claude, ChatGPT, Slack, Chrome, WordPress, ROCKET CRM, and more.',
  alternates: { canonical: 'https://www.0ncore.com/install' },
  openGraph: {
    title: 'Install 0nCore — One page, every integration',
    description:
      'Set up 0nCore on every tool you use. Claude, ChatGPT, Slack, Chrome, WordPress, ROCKET CRM, TickTick, ClickUp, Monday.',
    url: 'https://www.0ncore.com/install',
  },
}

export default function PublicInstallPage() {
  return (
    <>
      <InstallHub mode="public" />
      <SiteFooter />
    </>
  )
}
