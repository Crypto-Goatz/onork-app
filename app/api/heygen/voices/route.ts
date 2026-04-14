/**
 * GET /api/heygen/voices
 *
 * Lists available HeyGen voices.
 */

import { NextResponse } from 'next/server'
import { listVoices } from '@/lib/heygen/client'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const voices = await listVoices()

    return NextResponse.json({
      success: true,
      count: voices.length,
      voices: voices.map((v) => ({
        voiceId: v.voice_id,
        name: v.name,
        language: v.language,
        gender: v.gender,
        previewAudio: v.preview_audio,
        supportsPause: v.support_pause,
        supportsEmotion: v.emotion_support,
      })),
    })
  } catch (err) {
    console.error('[api/heygen/voices] error:', err)
    return NextResponse.json(
      {
        error: 'Failed to list voices',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
