/**
 * Service Packager — brain entry. handleThink owns the think + record loop.
 * This route's executor delegates to existing handlers (generate, list, export).
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

const SLUG = 'service_packager'

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) {
        headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET
      }

      const tool = decision.tool

      if (tool === 'package_from_url' || tool === 'package_from_prompt' || tool === 'package_from_mcp') {
        const mode = tool === 'package_from_url' ? 'url'
                   : tool === 'package_from_prompt' ? 'prompt'
                   : 'mcp_registry'
        const r = await fetch(`${baseUrl}/api/service-packager/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ mode, ...decision.params }),
        })
        const data = await r.json().catch(() => ({}))
        return { output: data, success: r.ok }
      }

      if (tool === 'list_packages') {
        const r = await fetch(`${baseUrl}/api/service-packager/packages`, { headers })
        const data = await r.json().catch(() => ({}))
        return { output: data, success: r.ok }
      }

      if (tool === 'export_for_platform') {
        const id = (decision.params.package_id as string) ?? ''
        const format = (decision.params.format as string) ?? 'fiverr'
        if (!id) return { output: { error: 'package_id required' }, success: false }
        const r = await fetch(`${baseUrl}/api/service-packager/packages/${id}/export?format=${format}`, { headers })
        const text = await r.text()
        return { output: { format, length: text.length, content: text.slice(0, 50000) }, success: r.ok }
      }

      if (tool === 'ask_clarification') {
        return { output: { question: decision.params.question ?? 'Tell me more.' }, success: true }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
