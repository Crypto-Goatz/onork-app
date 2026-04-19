/**
 * Agent Bridge API — POST /api/agent-bridge
 *
 * Accepts requests from:
 *   - CRM Agent Studio webhooks (x-webhook-secret header)
 *   - CRM PIT auth (x-crm-pit header)
 *   - Dashboard auth (Authorization: Bearer)
 *   - Internal calls (session cookie)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeBridge, type BridgeRequest, type BridgeResult } from '@/lib/agent-bridge'

const WEBHOOK_SECRET = process.env.CRM_WEBHOOK_SECRET || process.env.CRM_MARKETPLACE_SHARED_SECRET || ''

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // -----------------------------------------------------------------------
    // Auth: determine locationId and userId from headers or body
    // -----------------------------------------------------------------------
    let locationId: string | undefined
    let userId: string | undefined
    let conversationId: string | undefined
    let contactId: string | undefined
    let intent: string | undefined
    let action: string | undefined

    const webhookSecret = req.headers.get('x-webhook-secret')
    const crmPit = req.headers.get('x-crm-pit')
    const authHeader = req.headers.get('authorization')

    if (webhookSecret) {
      // CRM Agent Studio webhook format
      if (WEBHOOK_SECRET && webhookSecret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
      }

      // Handle CRM Agent Studio webhook body format
      if (body.type === 'webhook' && body.customData?.message) {
        locationId = body.locationId
        contactId = body.contactId
        conversationId = body.conversationId
        intent = body.customData.message
      } else {
        locationId = body.locationId
        contactId = body.contactId
        conversationId = body.conversationId
        intent = body.intent || body.customData?.message || body.message
        action = body.action
      }
    } else if (crmPit) {
      // PIT-based auth — locationId must be in body
      locationId = body.locationId
      intent = body.intent
      action = body.action
      contactId = body.contactId
      conversationId = body.conversationId
    } else if (authHeader?.startsWith('Bearer ')) {
      // Dashboard Bearer token auth
      const token = authHeader.slice(7)
      // Validate via Supabase
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id

      // Get user's locationId from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('crm_location_id')
        .eq('id', user.id)
        .single()

      locationId = body.locationId || profile?.crm_location_id
      intent = body.intent
      action = body.action
      contactId = body.contactId
      conversationId = body.conversationId
    } else {
      // Session cookie auth (dashboard internal calls)
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        userId = user.id
        const { data: profile } = await supabase
          .from('profiles')
          .select('crm_location_id')
          .eq('id', user.id)
          .single()
        locationId = body.locationId || profile?.crm_location_id
      }

      intent = body.intent
      action = body.action
      contactId = body.contactId
      conversationId = body.conversationId
    }

    // Validate required fields
    if (!intent) {
      return NextResponse.json(
        { error: 'Missing required field: intent' },
        { status: 400 }
      )
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Missing required field: locationId. Provide it in the body or link your CRM account.' },
        { status: 400 }
      )
    }

    // Build the bridge request
    const bridgeRequest: BridgeRequest = {
      action,
      intent,
      locationId,
      conversationId,
      contactId,
      userId,
    }

    // Execute
    const result: BridgeResult = await executeBridge(bridgeRequest)

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    })
  } catch (err) {
    console.error('[api/agent-bridge] error:', err)
    return NextResponse.json(
      {
        action: 'unknown',
        success: false,
        created: [],
        summary: 'Internal server error',
        errors: [err instanceof Error ? err.message : 'Unknown error'],
      },
      { status: 500 }
    )
  }
}
