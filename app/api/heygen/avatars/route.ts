/**
 * GET /api/heygen/avatars
 *
 * Lists available HeyGen avatars.
 */

import { NextResponse } from 'next/server'
import { listAvatars } from '@/lib/heygen/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const avatars = await listAvatars()

    return NextResponse.json({
      success: true,
      count: avatars.length,
      avatars: avatars.map((a) => ({
        avatarId: a.avatar_id,
        name: a.avatar_name,
        gender: a.gender,
        previewImage: a.preview_image_url,
        previewVideo: a.preview_video_url ?? null,
      })),
    })
  } catch (err) {
    console.error('[api/heygen/avatars] error:', err)
    return NextResponse.json(
      {
        error: 'Failed to list avatars',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
