import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import {
  runBlogToSocialWorkflow,
  extractWorkflowInput,
  type WorkflowInput,
} from '@/lib/workflows/blog-to-social'

function getAdmin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Authenticate the request. Supports:
 * 1. Bearer token (dashboard session)
 * 2. x-webhook-secret header (CRM Agent Studio)
 * 3. x-crm-pit header (CRM PIT token)
 */
async function authenticate(
  req: NextRequest
): Promise<{ userId?: string; locationId?: string; authorized: boolean }> {
  const authHeader = req.headers.get('authorization')
  const webhookSecret = req.headers.get('x-webhook-secret')
  const crmPit = req.headers.get('x-crm-pit')

  // 1. Webhook secret for CRM Agent Studio
  const expectedSecret = process.env.WORKFLOW_WEBHOOK_SECRET
  if (webhookSecret && expectedSecret && webhookSecret === expectedSecret) {
    return { authorized: true }
  }

  // 2. CRM PIT token
  const knownPits = [
    process.env.CRM_PIT_RAW,
    process.env.CRM_PIT_ROCKETOPP,
    process.env.CRM_PIT,
    process.env.CRM_AGENCY_PIT_NEW,
  ].filter(Boolean)

  if (crmPit && knownPits.includes(crmPit)) {
    return { authorized: true }
  }

  // 3. Bearer token (Supabase session)
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const supabase = await createClient()
      const user = (await supabase.auth.getSession()).data.session?.user ?? null
      if (user) {
        // Get user's location
        const { data: profile } = await getAdmin()
          .from('profiles')
          .select('crm_location_id')
          .eq('id', user.id)
          .single()

        return {
          authorized: true,
          userId: user.id,
          locationId: profile?.crm_location_id || undefined,
        }
      }
    } catch {
      // Fall through
    }
  }

  return { authorized: false }
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Resolve locationId: from body, from auth profile, or from header
  const locationId =
    (body.locationId as string) ||
    auth.locationId ||
    req.headers.get('x-location-id') ||
    ''

  if (!locationId) {
    return NextResponse.json(
      { error: 'locationId is required (body, profile, or x-location-id header)' },
      { status: 400 }
    )
  }

  // Build workflow input
  let workflowInput: WorkflowInput

  if (body.topic) {
    // Structured input
    workflowInput = {
      topic: body.topic as string,
      tone: (body.tone as WorkflowInput['tone']) || 'professional',
      platforms: (body.platforms as string[]) || ['linkedin', 'twitter', 'facebook'],
      emailSegment: (body.emailSegment as string) || 'all',
      emailSubject: (body.emailSubject as string) || undefined,
      locationId,
      userId: auth.userId || (body.userId as string) || undefined,
      conversationId: (body.conversationId as string) || undefined,
    }
  } else if (body.message) {
    // Free-text from CRM Agent Studio -- extract params with AI
    try {
      const extracted = await extractWorkflowInput(body.message as string)
      workflowInput = {
        topic: extracted.topic || (body.message as string),
        tone: extracted.tone || 'professional',
        platforms: extracted.platforms || ['linkedin', 'twitter', 'facebook'],
        emailSegment: extracted.emailSegment || 'all',
        emailSubject: extracted.emailSubject || undefined,
        locationId,
        userId: auth.userId || (body.userId as string) || undefined,
        conversationId: (body.conversationId as string) || undefined,
      }
    } catch {
      // Fallback: use the raw message as the topic
      workflowInput = {
        topic: body.message as string,
        tone: 'professional',
        platforms: ['linkedin', 'twitter', 'facebook'],
        emailSegment: 'all',
        locationId,
        userId: auth.userId || undefined,
        conversationId: (body.conversationId as string) || undefined,
      }
    }
  } else {
    return NextResponse.json(
      { error: 'Provide either "topic" (structured) or "message" (free-text)' },
      { status: 400 }
    )
  }

  // Run the workflow
  try {
    const result = await runBlogToSocialWorkflow(workflowInput)

    const totalSteps = result.steps.length
    const completedSteps = result.steps.filter(s => s.status === 'completed').length
    const totalDuration = result.steps.reduce((sum, s) => sum + s.duration_ms, 0)

    return NextResponse.json({
      success: true,
      summary: {
        blogTitle: result.blogPost.title,
        socialPosted: result.socialPosts.filter(p => p.posted).length,
        socialTotal: result.socialPosts.length,
        emailsSent: result.emailCampaign.sent,
        emailSegment: result.emailCampaign.segment,
        stepsCompleted: `${completedSteps}/${totalSteps}`,
        totalDuration_ms: totalDuration,
      },
      result,
    })
  } catch (err) {
    console.error('[blog-to-social] Workflow failed:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Workflow execution failed',
      },
      { status: 500 }
    )
  }
}
