/**
 * /signup — agency-styled cinematic signup.
 *
 * Three fields with staged reveal + full-screen provisioning takeover.
 * Replaces the prior AuthShell-based form. Drives the same
 * /api/auth/signup endpoint under the hood, so post-signup provisioning
 * (CRM contact, family-match, token mint) is unchanged.
 */

import { Suspense } from 'react'
import SignupCinematic from '@/components/signup/SignupCinematic'

export const dynamic = 'force-dynamic'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; email?: string }>
}) {
  const sp = await searchParams
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0d1117]" />}>
      <SignupCinematic refCode={sp.ref} initialEmail={sp.email} />
    </Suspense>
  )
}
