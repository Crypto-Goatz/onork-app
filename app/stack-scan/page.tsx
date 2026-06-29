import type { Metadata } from 'next'
import StackScanLanding from './StackScanLanding'

export const metadata: Metadata = {
  title: 'Bulk Website Stack & HIPAA Scan — $250 / 1,500 contacts | 0nCore',
  description:
    'Done-for-you bulk website fingerprinting. We scan your contact list for full tech stack, security headers, TLS posture, sensitive paths, and HIPAA compliance — 51 checks per URL. $250 per 1,500 contacts.',
  alternates: { canonical: 'https://www.0ncore.com/stack-scan' },
  openGraph: {
    title: 'Bulk Website Stack & HIPAA Scan — 51 checks per URL',
    description: 'Send your contact list. We fingerprint every site\'s tech stack + security + HIPAA posture. $250 per 1,500 contacts.',
    url: 'https://www.0ncore.com/stack-scan',
  },
}

export default function Page() {
  return <StackScanLanding />
}
