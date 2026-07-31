import type { Metadata } from 'next'
import ProfileClient from './ProfileClient'

export const metadata: Metadata = {
  title: 'Business Profile — 0nCore',
  description:
    'One place for your company facts, brand and people. Every 0n app reads from it, and it writes your LinkedIn profile, company page and boilerplate for you.',
}

export const dynamic = 'force-dynamic'

export default function ProfilePage() {
  return <ProfileClient />
}
