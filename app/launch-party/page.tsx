import { redirect } from 'next/navigation'

// Launch happened May 1, 2026. Page redirects to signup.
export const metadata = {
  title: '0nCore is live — Sign up',
  description: '0nCore launched May 1, 2026. Sign up free.',
}

export default function LaunchPartyPage() {
  redirect('/signup')
}
