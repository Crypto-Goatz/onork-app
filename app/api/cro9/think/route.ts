/**
 * CRO9 SEO — brain entry. handleThink owns the think + record loop.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

const SLUG = 'cro9_engine'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision, _body, userId) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (process.env.INTERNAL_DISPATCH_SECRET) headers['x-internal-secret'] = process.env.INTERNAL_DISPATCH_SECRET

      const tool = decision.tool

      if (tool === 'analyze_site') {
        const url = decision.params.url as string | undefined
        if (!url) return { output: { error: 'url required' }, success: false }
        // Find or create the site row, then trigger analyze
        const sb = admin()
        const { data: site } = await sb
          .from('cro9_sites')
          .select('id')
          .eq('user_id', userId)
          .eq('url', url)
          .maybeSingle()
        let siteId = site?.id
        if (!siteId) {
          const { data: created, error } = await sb
            .from('cro9_sites')
            .insert({ user_id: userId, url, name: url })
            .select('id')
            .single()
          if (error) return { output: { error: error.message }, success: false }
          siteId = created.id
        }
        const r = await fetch(`${baseUrl}/api/cro9/sites/${siteId}/analyze`, { method: 'POST', headers })
        return { output: { site_id: siteId, ...(await r.json().catch(() => ({}))) }, success: r.ok }
      }

      if (tool === 'track_keywords') {
        const sb = admin()
        const { error } = await sb.from('cro9_keywords').insert(
          ((decision.params.keywords as string[]) ?? []).map((kw: string) => ({
            site_id: decision.params.site_id,
            keyword: kw,
            user_id: userId,
          }))
        )
        if (error) return { output: { error: error.message }, success: false }
        return { output: { tracked: ((decision.params.keywords as string[]) ?? []).length }, success: true }
      }

      if (tool === 'suggest_fixes') {
        const r = await fetch(`${baseUrl}/api/cro9/sites/${decision.params.site_id}/tasks`, { headers })
        return { output: await r.json().catch(() => ({})), success: r.ok }
      }

      if (tool === 'ask_clarification') {
        return { output: { question: decision.params.question ?? 'Which site should I analyze?' }, success: true }
      }

      return { output: { error: `unknown tool: ${tool}` }, success: false }
    },
  })
}
