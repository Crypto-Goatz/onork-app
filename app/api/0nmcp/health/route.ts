import { NextResponse } from 'next/server'

export async function GET() {
  // 0nMCP runs as a tool inside Claude/Slack, not as a persistent server.
  // The "health" check verifies that the CRM connection works and Supabase is reachable.
  const checks = {
    supabase: false,
    crm: false,
    groq: false,
  }

  // Check Supabase
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
    })
    checks.supabase = res.ok || res.status === 200
  } catch { checks.supabase = false }

  // Check CRM
  try {
    const pit = process.env.CRM_PIT_ROCKETOPP || process.env.CRM_PIT_RAW || process.env.CRM_PIT
    if (pit) {
      const res = await fetch('https://services.leadconnectorhq.com/contacts/?locationId=6MSqx0trfxgLxeHBJE1k&limit=1', {
        headers: {
          'Authorization': `Bearer ${pit}`,
          'Version': '2021-07-28',
        },
      })
      checks.crm = res.ok
    }
  } catch { checks.crm = false }

  // Check Groq
  try {
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { 'Authorization': `Bearer ${groqKey}` },
      })
      checks.groq = res.ok
    }
  } catch { checks.groq = false }

  const allOnline = checks.supabase || checks.crm
  const servicesOnline = Object.values(checks).filter(Boolean).length

  return NextResponse.json({
    status: allOnline ? 'online' : 'offline',
    version: '3.2.2',
    services: servicesOnline,
    checks,
    mode: 'cloud',
  })
}
