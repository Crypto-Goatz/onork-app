/**
 * POST /api/webhooks/wordpress — WordPress plugin webhook handler
 *
 * Handles incoming messages from the 0nCore WordPress plugin.
 * WordPress sites authenticate with a 0n token stored in wp_options.
 * Messages route through bridge/message pipeline.
 *
 * Body: { token, site_url, action, data }
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateToken } from '@/lib/0n-token'
import { authenticateChannel, resolveChannelSession } from '@/lib/channel-adapter'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, site_url, action, data } = body

    if (!token || !site_url) {
      return NextResponse.json({ error: 'Missing token and site_url' }, { status: 400 })
    }

    // Validate token
    const ctx = await validateToken(token)
    if (!ctx) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Ensure channel session exists
    let session = await resolveChannelSession('wordpress', site_url)
    if (!session) {
      session = await authenticateChannel(token, 'wordpress', site_url)
      if (!session) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
      }
    }

    switch (action) {
      case 'ping': {
        return NextResponse.json({
          status: 'connected',
          userId: ctx.userId,
          channel: 'wordpress',
          siteUrl: site_url,
          permissions: ctx.scopes,
        })
      }

      case 'message': {
        const text = data?.text || data?.message
        if (!text) return NextResponse.json({ error: 'Missing message text' }, { status: 400 })

        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://0ncore.com'
        const bridgeRes = await fetch(`${baseUrl}/api/bridge/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel: 'wordpress', channelIdentity: site_url, text }),
        })
        const result = await bridgeRes.json()

        const admin = getAdmin()
        await admin.from('channel_sessions').update({
          last_message_at: new Date().toISOString(),
          message_count: (session.messageCount || 0) + 1,
        }).eq('id', session.id)

        return NextResponse.json(result)
      }

      case 'sync_contacts': {
        const contacts = data?.contacts || []
        if (!Array.isArray(contacts) || contacts.length === 0) {
          return NextResponse.json({ error: 'No contacts to sync' }, { status: 400 })
        }

        const admin = getAdmin()
        const { data: profile } = await admin.from('profiles').select('crm_location_id').eq('id', ctx.userId).single()
        if (!profile?.crm_location_id) {
          return NextResponse.json({ error: 'CRM not connected' }, { status: 400 })
        }

        const { crmPost } = await import('@/lib/crm')
        const results = []
        for (const contact of contacts.slice(0, 50)) {
          const res = await crmPost('/contacts/', profile.crm_location_id, {
            firstName: contact.first_name || contact.name?.split(' ')[0] || '',
            lastName: contact.last_name || contact.name?.split(' ').slice(1).join(' ') || '',
            email: contact.email || '',
            phone: contact.phone || '',
            source: 'WordPress',
            tags: ['wordpress-sync'],
          })
          results.push({ email: contact.email, status: res.ok ? 'synced' : 'failed' })
        }

        return NextResponse.json({ synced: results.filter(r => r.status === 'synced').length, total: results.length, results })
      }

      case 'form_submission': {
        const admin = getAdmin()
        const { data: profile } = await admin.from('profiles').select('crm_location_id').eq('id', ctx.userId).single()
        if (!profile?.crm_location_id) {
          return NextResponse.json({ error: 'CRM not connected' }, { status: 400 })
        }

        const { crmPost } = await import('@/lib/crm')
        const res = await crmPost('/contacts/', profile.crm_location_id, {
          firstName: data.first_name || data.name?.split(' ')[0] || '',
          lastName: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
          email: data.email || '',
          phone: data.phone || '',
          source: 'WordPress Form',
          tags: ['wordpress-form', data.form_name || 'contact-form'],
        })
        const contact = await res.json()
        return NextResponse.json({ status: res.ok ? 'created' : 'failed', contact })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[wordpress webhook]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
