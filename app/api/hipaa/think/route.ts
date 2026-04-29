/**
 * HIPAA Scanner — brain entry. handleThink owns the think + record loop.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

const SLUG = 'hipaa_scanner'

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET

      const tool = decision.tool

      if (tool === 'scan_organization') {
        const r = await fetch(`${baseUrl}/api/hipaa/scan`, {
          method: 'POST', headers,
          body: JSON.stringify({
            url: decision.params.url ?? decision.params.org_url,
            depth: decision.params.depth ?? 'standard',
          }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'generate_report') {
        const r = await fetch(`${baseUrl}/api/hipaa/report`, {
          method: 'POST', headers,
          body: JSON.stringify({
            scan_id: decision.params.scan_id,
            format: decision.params.format ?? 'pdf',
          }),
        })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'explain_finding') {
        // Lightweight inline — the existing scan output already has explanations.
        return {
          output: {
            finding_id: decision.params.finding_id,
            note: 'Open the scan detail for the full explanation. Each finding row carries its own remediation.',
          },
          success: true,
        }
      }

      if (tool === 'ask_clarification') {
        return { output: { question: decision.params.question ?? 'Which org should I scan?' }, success: true }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
