import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crmGet, crmPost } from '@/lib/crm'

/**
 * Documents/Contracts API — CRM documents management
 * GET  /api/crm/documents                    — list documents + templates
 * POST /api/crm/documents { action: 'send' } — send document link
 * POST /api/crm/documents { action: 'sendTemplate' } — send template link
 */

async function resolveLocation(supabase: any, userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', userId)
    .single()
  return profile?.crm_location_id || process.env.CRM_LOCATION_ID || ''
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(supabase, user.id)
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'

    const results: Record<string, unknown> = { locationId }

    // Fetch documents
    if (type === 'all' || type === 'documents') {
      const docRes = await crmGet('/documents_contracts/list', locationId)
      if (docRes.ok) {
        const docData = await docRes.json()
        results.documents = docData.documents || docData || []
      } else {
        results.documents = []
        results.documentsError = `CRM error: ${docRes.status}`
      }
    }

    // Fetch templates
    if (type === 'all' || type === 'templates') {
      const tplRes = await crmGet('/documents_contracts_template/list', locationId)
      if (tplRes.ok) {
        const tplData = await tplRes.json()
        results.templates = tplData.templates || tplData || []
      } else {
        results.templates = []
        results.templatesError = `CRM error: ${tplRes.status}`
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const locationId = await resolveLocation(supabase, user.id)
  if (!locationId) return NextResponse.json({ error: 'CRM not configured' }, { status: 500 })

  try {
    const body = await request.json()
    const action = body.action || 'send'

    if (action === 'sendTemplate') {
      const { templateId, contactId, email, name } = body
      if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 })

      const sendBody: Record<string, unknown> = { locationId }
      if (contactId) sendBody.contactId = contactId
      if (email) sendBody.email = email
      if (name) sendBody.name = name
      sendBody.templateId = templateId

      const res = await crmPost('/documents_contracts_template/sendLink', locationId, sendBody)
      if (!res.ok) {
        const text = await res.text()
        return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ sent: true, data })
    }

    // Send document link
    const { documentId, contactId, email, name } = body
    if (!documentId) return NextResponse.json({ error: 'documentId required' }, { status: 400 })

    const sendBody: Record<string, unknown> = { locationId, documentId }
    if (contactId) sendBody.contactId = contactId
    if (email) sendBody.email = email
    if (name) sendBody.name = name

    const res = await crmPost('/documents_contracts/sendLink', locationId, sendBody)
    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `CRM error: ${res.status}`, details: text }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json({ sent: true, data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'CRM request failed' }, { status: 502 })
  }
}
