/**
 * GET /api/heygen/status/[videoId]
 *
 * Proxies the HeyGen video status endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getVideoStatus } from '@/lib/heygen/client'

export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  try {
    const status = await getVideoStatus(videoId)

    return NextResponse.json({
      success: true,
      videoId: status.video_id,
      status: status.status,
      videoUrl: status.video_url ?? null,
      thumbnailUrl: status.thumbnail_url ?? null,
      duration: status.duration ?? null,
      error: status.error ?? null,
    })
  } catch (err) {
    console.error('[api/heygen/status] error:', err)
    return NextResponse.json(
      {
        error: 'Failed to fetch video status',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
