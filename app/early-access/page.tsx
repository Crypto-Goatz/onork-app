import { redirect } from 'next/navigation'

// 0nCore is live. The early-access registration is closed; redirect to signup.
export const metadata = {
  title: '0nCore is live — Sign up',
  description: '0nCore is publicly available. Sign up free and start building with 1,640+ tools.',
}

export default function EarlyAccessPage() {
  redirect('/signup')
}
