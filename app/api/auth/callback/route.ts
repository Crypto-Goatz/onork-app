import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const user = data?.session?.user
      let redirectTo = '/console'

      if (user) {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete, provisioned_at')
          .eq('id', user.id)
          .single()

        // Trigger provisioning if not yet provisioned
        if (!profile?.provisioned_at) {
          fetch(`${origin}/api/provision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: user.id,
              email: user.email || '',
              name: user.user_metadata?.full_name || '',
            }),
          }).catch(() => {})
        }

        // New users go to welcome, returning users go to console
        if (!profile?.onboarding_complete) {
          redirectTo = '/console/welcome'
        }
      }

      return NextResponse.redirect(`${origin}${redirectTo}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
