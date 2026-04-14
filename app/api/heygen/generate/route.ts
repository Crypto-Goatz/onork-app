/**
 * POST /api/heygen/generate
 *
 * Accepts a ProfessionalProfile, runs the PACG pipeline,
 * returns the execution receipt.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runPACGVideoPipeline } from '@/lib/heygen/pacg-video-pipeline'
import type { ProfessionalProfile } from '@/lib/heygen/types'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      profile,
      testMode,
      forceVariantId,
      avatarIdOverride,
      voiceIdOverride,
    } = body as {
      profile: ProfessionalProfile
      testMode?: boolean
      forceVariantId?: string
      avatarIdOverride?: string
      voiceIdOverride?: string
    }

    if (!profile?.name || !profile?.title || !profile?.company || !profile?.industry) {
      return NextResponse.json(
        { error: 'Missing required profile fields: name, title, company, industry' },
        { status: 400 }
      )
    }

    const result = await runPACGVideoPipeline(profile, {
      testMode,
      forceVariantId,
      avatarIdOverride,
      voiceIdOverride,
    })

    return NextResponse.json({
      success: true,
      executionId: result.executionId,
      videoId: result.videoId,
      status: result.status,
      variant: {
        id: result.variant.id,
        label: result.variant.label,
        durationSeconds: result.variant.durationSeconds,
      },
      seniorityTier: result.seniorityTier,
      orgSizeTier: result.orgSizeTier,
      activatedLayers: result.activatedLayers,
      personalizedScript: result.personalizedScript,
      pipelineMs: result.pipelineMs,
      createdAt: result.createdAt,
    })
  } catch (err) {
    console.error('[api/heygen/generate] error:', err)
    return NextResponse.json(
      {
        error: 'Pipeline execution failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
