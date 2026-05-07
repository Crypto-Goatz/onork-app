import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// name.com API — HTTP Basic Auth
const NAMECOM_API = 'https://api.name.com/v4'
const NAMECOM_USER = process.env.NAMECOM_USER || ''
const NAMECOM_TOKEN = process.env.NAMECOM_TOKEN || ''

function namecomHeaders(): HeadersInit {
  const creds = Buffer.from(`${NAMECOM_USER}:${NAMECOM_TOKEN}`).toString('base64')
  return {
    Authorization: `Basic ${creds}`,
    'Content-Type': 'application/json',
  }
}

// GET — Search for domain availability
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  if (!NAMECOM_USER || !NAMECOM_TOKEN) {
    return NextResponse.json({ error: 'Domain service not configured' }, { status: 500 })
  }

  try {
    // Check availability
    const res = await fetch(`${NAMECOM_API}/domains:checkAvailability`, {
      method: 'POST',
      headers: namecomHeaders(),
      body: JSON.stringify({
        domainNames: [domain],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `name.com error: ${res.status}` }, { status: res.status })
    }

    const data = await res.json()
    const results = (data.results || []).map((r: any) => ({
      domain: r.domainName,
      available: r.purchasable === true,
      price: r.purchasePrice ? parseFloat(r.purchasePrice) : null,
      premium: r.premium === true,
      renewalPrice: r.renewalPrice ? parseFloat(r.renewalPrice) : null,
    }))

    // Also get suggestions
    const suggestRes = await fetch(`${NAMECOM_API}/domains:suggest`, {
      method: 'POST',
      headers: namecomHeaders(),
      body: JSON.stringify({
        keywords: [domain.split('.')[0]],
        tlds: ['com', 'io', 'co', 'ai', 'dev', 'app', 'net', 'org'],
      }),
    }).catch(() => null)

    let suggestions: any[] = []
    if (suggestRes?.ok) {
      const suggestData = await suggestRes.json()
      suggestions = (suggestData.results || [])
        .filter((r: any) => r.purchasable)
        .slice(0, 8)
        .map((r: any) => ({
          domain: r.domainName,
          price: r.purchasePrice ? parseFloat(r.purchasePrice) : null,
        }))
    }

    return NextResponse.json({ results, suggestions })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

// POST — Register a domain
export async function POST(req: Request) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { domain, autoRenew } = await req.json()
  if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })

  if (!NAMECOM_USER || !NAMECOM_TOKEN) {
    return NextResponse.json({ error: 'Domain service not configured' }, { status: 500 })
  }

  try {
    // Register domain
    const res = await fetch(`${NAMECOM_API}/domains`, {
      method: 'POST',
      headers: namecomHeaders(),
      body: JSON.stringify({
        domain: { domainName: domain },
        purchasePrice: undefined, // Use current price
        years: 1,
        autoRenew: autoRenew !== false,
        privacyEnabled: true,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json({
        error: err.message || `Registration failed: ${res.status}`,
      }, { status: res.status })
    }

    const data = await res.json()

    // Auto-configure DNS
    await configureDNS(domain)

    // Enable WHOIS privacy
    await fetch(`${NAMECOM_API}/domains/${domain}:enableWhoisPrivacy`, {
      method: 'POST',
      headers: namecomHeaders(),
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      domain: data.domain?.domainName || domain,
      expires: data.domain?.expireDate,
      autoRenew: data.domain?.autorenewEnabled,
      privacy: true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 })
  }
}

async function configureDNS(domain: string) {
  // Set A record pointing to CRM funnel
  const records = [
    { host: domain, type: 'A', answer: '52.223.10.207', ttl: 300 },
    { host: `www.${domain}`, type: 'CNAME', answer: domain, ttl: 300 },
  ]

  for (const record of records) {
    await fetch(`${NAMECOM_API}/domains/${domain}/records`, {
      method: 'POST',
      headers: namecomHeaders(),
      body: JSON.stringify(record),
    }).catch(() => {})
  }
}
