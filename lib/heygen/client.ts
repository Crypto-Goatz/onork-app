/**
 * HeyGen API Client — V1/V2/V3 endpoints
 *
 * Wraps the HeyGen REST API for avatar video creation,
 * status polling, and resource listing.
 */

import type {
  HeyGenVideoStatusData,
  HeyGenAvatar,
  HeyGenVoice,
} from './types'

const HEYGEN_API_KEY = () => {
  const key = process.env.HEYGEN_API_KEY
  if (!key) throw new Error('HEYGEN_API_KEY is not set')
  return key
}

const V1 = 'https://api.heygen.com/v1'
const V2 = 'https://api.heygen.com/v2'

// ── Helpers ──────────────────────────────────────────────────────

async function heygenFetch<T>(
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'X-Api-Key': HEYGEN_API_KEY(),
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HeyGen ${res.status}: ${body}`)
  }

  const json = await res.json()
  return json.data ?? json
}

// ── Video creation (V2) ──────────────────────────────────────────

interface CreateVideoPayload {
  video_inputs: Array<{
    character: {
      type: 'avatar'
      avatar_id: string
      avatar_style?: string
    }
    voice: {
      type: 'text'
      input_text: string
      voice_id: string
      speed?: number
    }
    background?: {
      type: 'color'
      value: string
    }
  }>
  dimension?: { width: number; height: number }
  aspect_ratio?: string
  test?: boolean
}

interface CreateVideoResponse {
  video_id: string
}

export async function createAvatarVideo(opts: {
  avatarId: string
  voiceId: string
  script: string
  backgroundColour?: string
  test?: boolean
}): Promise<string> {
  const payload: CreateVideoPayload = {
    video_inputs: [
      {
        character: {
          type: 'avatar',
          avatar_id: opts.avatarId,
          avatar_style: 'normal',
        },
        voice: {
          type: 'text',
          input_text: opts.script,
          voice_id: opts.voiceId,
          speed: 1.0,
        },
        background: {
          type: 'color',
          value: opts.backgroundColour ?? '#080B0F',
        },
      },
    ],
    dimension: { width: 1920, height: 1080 },
    test: opts.test ?? false,
  }

  const data = await heygenFetch<CreateVideoResponse>(
    `${V2}/video/generate`,
    { method: 'POST', body: JSON.stringify(payload) }
  )
  return data.video_id
}

// ── Interactive Video Agent (V2) ────────────────────────────────

interface CreateAgentPayload {
  avatar_id: string
  voice_id: string
  knowledge_base?: string
  language?: string
}

interface CreateAgentResponse {
  agent_id: string
}

export async function createVideoAgent(opts: {
  avatarId: string
  voiceId: string
  knowledgeBase?: string
}): Promise<string> {
  const payload: CreateAgentPayload = {
    avatar_id: opts.avatarId,
    voice_id: opts.voiceId,
    knowledge_base: opts.knowledgeBase,
    language: 'en',
  }

  const data = await heygenFetch<CreateAgentResponse>(
    `${V2}/video_agent/create`,
    { method: 'POST', body: JSON.stringify(payload) }
  )
  return data.agent_id
}

// ── Video status (V1) ───────────────────────────────────────────

export async function getVideoStatus(
  videoId: string
): Promise<HeyGenVideoStatusData> {
  return heygenFetch<HeyGenVideoStatusData>(
    `${V1}/video_status.get?video_id=${encodeURIComponent(videoId)}`
  )
}

// ── List avatars (V2) ───────────────────────────────────────────

interface ListAvatarsResponse {
  avatars: HeyGenAvatar[]
}

export async function listAvatars(): Promise<HeyGenAvatar[]> {
  const data = await heygenFetch<ListAvatarsResponse>(`${V2}/avatars`)
  return data.avatars ?? []
}

// ── List voices (V2) ────────────────────────────────────────────

interface ListVoicesResponse {
  voices: HeyGenVoice[]
}

export async function listVoices(): Promise<HeyGenVoice[]> {
  const data = await heygenFetch<ListVoicesResponse>(`${V2}/voices`)
  return data.voices ?? []
}

// ── Poll until complete ─────────────────────────────────────────

export async function pollUntilComplete(
  videoId: string,
  opts?: {
    intervalMs?: number
    timeoutMs?: number
    onStatus?: (status: HeyGenVideoStatusData) => void
  }
): Promise<HeyGenVideoStatusData> {
  const interval = opts?.intervalMs ?? 5_000
  const timeout = opts?.timeoutMs ?? 300_000
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const status = await getVideoStatus(videoId)
    opts?.onStatus?.(status)

    if (status.status === 'completed' || status.status === 'failed') {
      return status
    }

    await new Promise((r) => setTimeout(r, interval))
  }

  throw new Error(`HeyGen video ${videoId} timed out after ${timeout}ms`)
}
