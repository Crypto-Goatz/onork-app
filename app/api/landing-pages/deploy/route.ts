import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const VERCEL_API = 'https://api.vercel.com'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(req: NextRequest) {
  try {
    const server = await createServerClient()
    const { data: { session } } = await server.auth.getSession()
  const user = session?.user ?? null
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json()
    const html = body.html as string
    const name = (body.name as string) || `landing-${Date.now()}`
    const customDomain = body.custom_domain as string | undefined

    if (!html) return NextResponse.json({ error: 'html required' }, { status: 400 })

    const token = process.env.VERCEL_TOKEN
    const teamId = process.env.VERCEL_TEAM_ID
    if (!token) return NextResponse.json({ error: 'VERCEL_TOKEN not configured' }, { status: 500 })

    const projectName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)
    const teamQuery = teamId ? `?teamId=${teamId}` : ''

    const deployRes = await fetch(`${VERCEL_API}/v13/deployments${teamQuery}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: projectName,
        target: 'production',
        files: [{ file: 'index.html', data: html }],
        projectSettings: { framework: null },
      }),
    })

    const deployData = await deployRes.json()
    if (!deployRes.ok) {
      return NextResponse.json({
        error: 'Vercel deploy failed',
        detail: deployData,
      }, { status: 500 })
    }

    let alias: unknown = null
    if (customDomain && deployData.id) {
      const aliasRes = await fetch(`${VERCEL_API}/v2/deployments/${deployData.id}/aliases${teamQuery}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: customDomain }),
      })
      alias = await aliasRes.json()
    }

    // Persist deployment record (best-effort — don't fail the request)
    const admin = getAdmin()
    await admin.from('landing_page_deployments').insert({
      user_id: user.id,
      project_name: projectName,
      vercel_deployment_id: deployData.id,
      vercel_url: deployData.url ? `https://${deployData.url}` : null,
      custom_domain: customDomain || null,
      html_size_bytes: html.length,
    }).then(() => {}, () => {})

    return NextResponse.json({
      ok: true,
      deployment_id: deployData.id,
      url: deployData.url ? `https://${deployData.url}` : null,
      inspector_url: deployData.inspectorUrl,
      custom_domain: customDomain ? alias : null,
      state: deployData.readyState || 'PENDING',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deploy error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
