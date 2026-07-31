import { redirect } from 'next/navigation'

// Adaptive Siphon folded into the CRO9 Analytics dashboard as a tab.
export default function SiphonRedirect() {
  redirect('/dashboard/analytics?tab=siphon')
}
