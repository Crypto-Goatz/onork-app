import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'stats'
  const admin = getAdmin()

  try {
    switch (action) {
      case 'stats': {
        const [sources, pairs, datasets, exports, runs, knowledge] = await Promise.all([
          admin.from('training_sources').select('id, source_type, status, token_count'),
          admin.from('training_pairs').select('id, domain, quality_score, approved, dataset_id'),
          admin.from('training_datasets').select('*'),
          admin.from('training_exports').select('id', { count: 'exact', head: true }),
          admin.from('training_runs').select('id', { count: 'exact', head: true }),
          admin.from('council_knowledge').select('id, composite_score'),
        ])

        const sourcesByType: Record<string, number> = {}
        for (const s of sources.data || []) {
          sourcesByType[s.source_type] = (sourcesByType[s.source_type] || 0) + 1
        }

        const pairsByDomain: Record<string, number> = {}
        let approvedCount = 0, scoredCount = 0, totalScore = 0
        for (const p of pairs.data || []) {
          pairsByDomain[p.domain || 'unset'] = (pairsByDomain[p.domain || 'unset'] || 0) + 1
          if (p.approved) approvedCount++
          if (p.quality_score) { scoredCount++; totalScore += Number(p.quality_score) }
        }

        const totalTokens = (sources.data || []).reduce((s, d) => s + (d.token_count || 0), 0)

        return NextResponse.json({
          training_center: {
            sources: { total: sources.data?.length || 0, by_type: sourcesByType, total_tokens: totalTokens },
            pairs: { total: pairs.data?.length || 0, by_domain: pairsByDomain, approved: approvedCount, scored: scoredCount, avg_quality: scoredCount > 0 ? Math.round(totalScore / scoredCount * 100) / 100 : 0 },
            datasets: { total: (datasets.data || []).length, list: (datasets.data || []).map(d => ({ id: d.id, name: d.name, pairs: d.pair_count, status: d.status })) },
            exports: { total: exports.count || 0 },
            council: { training_runs: runs.count || 0, knowledge_entries: (knowledge.data || []).length, avg_score: (knowledge.data || []).length > 0 ? Math.round((knowledge.data || []).reduce((s, k) => s + Number(k.composite_score || 0), 0) / knowledge.data!.length * 100) / 100 : 0 },
          },
        })
      }

      case 'sources': {
        const { data } = await admin.from('training_sources').select('id, title, source_type, status, token_count, tags, created_at').order('created_at', { ascending: false }).limit(50)
        return NextResponse.json({ sources: data || [] })
      }

      case 'pairs': {
        const { data } = await admin.from('training_pairs').select('id, user_input, assistant_output, domain, quality_score, approved, human_reviewed, created_at').order('created_at', { ascending: false }).limit(50)
        return NextResponse.json({ pairs: data || [] })
      }

      case 'datasets': {
        const { data } = await admin.from('training_datasets').select('*').order('created_at', { ascending: false })
        return NextResponse.json({ datasets: data || [] })
      }

      case 'search': {
        const query = searchParams.get('query') || ''
        const table = searchParams.get('table') || 'both'
        const results: { sources?: unknown[]; pairs?: unknown[] } = {}

        if (table !== 'pairs') {
          const { data } = await admin.from('training_sources').select('id, title, source_type, status, token_count, tags, created_at').textSearch('fts', query.split(' ').join(' & ')).limit(20)
          results.sources = data || []
        }
        if (table !== 'sources') {
          const { data } = await admin.from('training_pairs').select('id, user_input, assistant_output, domain, quality_score, approved, human_reviewed, created_at').textSearch('fts', query.split(' ').join(' & ')).limit(20)
          results.pairs = data || []
        }

        return NextResponse.json({ results })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const admin = getAdmin()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as string

  try {
    switch (action) {
      case 'add_pair': {
        const { data, error } = await admin.from('training_pairs').insert({
          user_input: body.user_input as string,
          assistant_output: body.assistant_output as string,
          domain: (body.domain as string) || 'general',
          difficulty: 'medium',
          system_prompt: null,
          tags: [],
          quality_score: null,
          human_reviewed: false,
          approved: false,
          metadata: { manually_created: true, created_via: '0ncore' },
        }).select('id').single()

        if (error) throw error
        return NextResponse.json({ status: 'created', id: data.id })
      }

      case 'approve': {
        const { error } = await admin.from('training_pairs').update({ approved: true, human_reviewed: true, updated_at: new Date().toISOString() }).eq('id', body.pair_id as string)
        if (error) throw error
        return NextResponse.json({ status: 'approved' })
      }

      case 'reject': {
        const { error } = await admin.from('training_pairs').update({ approved: false, human_reviewed: true, rejection_reason: (body.reason as string) || null, updated_at: new Date().toISOString() }).eq('id', body.pair_id as string)
        if (error) throw error
        return NextResponse.json({ status: 'rejected' })
      }

      case 'feed': {
        // Fetch from all sources — inline lightweight version
        const SOURCES = [
          { id: 'hn-ai', url: 'https://hn.algolia.com/api/v1/search_by_date?query=AI+LLM+MCP&tags=story&hitsPerPage=5', category: 'ai_industry', parser: 'hn' },
          { id: 'devto-ai', url: 'https://dev.to/api/articles?tag=ai&per_page=5&top=1', category: 'ai_industry', parser: 'devto' },
          { id: 'devto-mcp', url: 'https://dev.to/api/articles?tag=mcp&per_page=5&top=1', category: 'ai_industry', parser: 'devto' },
          { id: 'coingecko', url: 'https://api.coingecko.com/api/v3/global', category: 'crypto', parser: 'coingecko' },
        ]

        let ingested = 0
        const sourcesChecked = SOURCES.length

        for (const source of SOURCES) {
          try {
            const res = await fetch(source.url, { headers: { 'User-Agent': '0ncore/1.0' }, signal: AbortSignal.timeout(8000) })
            if (!res.ok) continue
            const raw = await res.json()

            let items: { title: string; content: string; url: string }[] = []

            if (source.parser === 'hn' && raw.hits) {
              items = raw.hits.map((h: { title: string; url: string; points: number; num_comments: number }) => ({
                title: h.title, content: `${h.title}. ${h.url || ''}. ${h.points} points, ${h.num_comments} comments.`, url: h.url || ''
              }))
            } else if (source.parser === 'devto' && Array.isArray(raw)) {
              items = raw.map((a: { title: string; description: string; url: string }) => ({
                title: a.title, content: `${a.title}. ${a.description || ''}`, url: a.url || ''
              }))
            } else if (source.parser === 'coingecko' && raw.data) {
              const d = raw.data
              items = [{ title: 'Crypto Market Stats', content: `Market cap: $${Math.round((d.total_market_cap?.usd || 0) / 1e9)}B. BTC: ${(d.market_cap_percentage?.btc || 0).toFixed(1)}%.`, url: '' }]
            }

            for (const item of items) {
              if (!item.title) continue
              const hash = Buffer.from(item.title + item.url).toString('base64').slice(0, 32)
              const { data: existing } = await admin.from('training_sources').select('id').eq('metadata->>content_hash', hash).limit(1)
              if (existing && existing.length > 0) continue

              await admin.from('training_sources').insert({
                source_type: 'feed', source_path: item.url, title: item.title.slice(0, 500),
                content: item.content.slice(0, 5000), token_count: Math.ceil(item.content.length / 4),
                tags: [source.category, source.id], status: 'raw',
                metadata: { feed_source: source.id, content_hash: hash, fetched_at: new Date().toISOString() },
              })
              ingested++
            }
          } catch { /* skip failed sources */ }
        }

        return NextResponse.json({ status: 'fetched', sources_checked: sourcesChecked, stats: { ingested } })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
