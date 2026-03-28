import { NextResponse } from 'next/server'
import { getAuthorizationUrl, generateState } from '@/lib/crm-oauth'

export async function GET() {
  try {
    const state = generateState()
    const url = getAuthorizationUrl(state)

    const response = NextResponse.redirect(url)
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
    })

    return response
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'OAuth not configured' },
      { status: 500 }
    )
  }
}
