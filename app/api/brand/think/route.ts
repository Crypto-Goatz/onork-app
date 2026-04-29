/**
 * Brand Builder — brain entry. handleThink owns the think + record loop.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'
import { groqJSON } from '@/lib/service-packager/groq'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SLUG = 'brand_builder'

interface Palette { primary: string; accent: string; bg: string; text: string; muted: string }
interface Voice   { tone: string; personality: string[]; sample_taglines: string[] }

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET

      const tool = decision.tool

      if (tool === 'extract_from_url') {
        const r = await fetch(`${baseUrl}/api/brand/extract`, {
          method: 'POST', headers,
          body: JSON.stringify({ url: decision.params.url }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'generate_palette') {
        const palette = await groqJSON<Palette>(
          'You generate brand color palettes. Return ONLY valid JSON.',
          `Industry: ${decision.params.industry ?? 'general'}\nVibe: ${decision.params.vibe ?? 'modern'}\n\nReturn { "primary": "#hex", "accent": "#hex", "bg": "#hex", "text": "#hex", "muted": "#hex" }`,
          { temperature: 0.7 }
        )
        return { output: { palette }, success: true }
      }

      if (tool === 'generate_voice') {
        const voice = await groqJSON<Voice>(
          'You generate brand voice profiles. Return ONLY valid JSON.',
          `Tone: ${decision.params.tone ?? 'confident'}\nAudience: ${decision.params.audience ?? 'professionals'}\n\nReturn { "tone": "...", "personality": ["..."], "sample_taglines": ["..."] }`,
          { temperature: 0.7 }
        )
        return { output: { voice }, success: true }
      }

      if (tool === 'export_brand_kit') {
        return {
          output: {
            brand_id: decision.params.brand_id,
            format: decision.params.format ?? 'json',
            note: 'Use /dashboard/brand to download the kit. Brain has captured your preferences.',
          },
          success: true,
        }
      }

      if (tool === 'ask_clarification') {
        return { output: { question: decision.params.question ?? 'Tell me about the brand vibe.' }, success: true }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
