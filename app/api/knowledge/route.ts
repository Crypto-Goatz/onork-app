import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * This route used to hardcode `https://yaehbwimocvvnnlojkxe.supabase.co` — a
 * Supabase project that no longer exists (its DNS does not resolve; two sibling
 * projects answer 401 on the same probe, so it is gone, not blocked). The
 * service-role key it paired with was always the right key for the WRONG host.
 *
 * It never reported that. The query destructured `{ data }` and dropped `error`
 * on the floor, so a dead host became `data = null` became `data || []` became
 * `total: 0` — HTTP 200. The `?format=text` path was worse: it served
 * `content-length: 0` as an attachment named `0nai-knowledge-base.txt`, the file
 * this endpoint documents as the thing you upload into the CRM Knowledge Base.
 * An operator downloading a blank KB and uploading it could not have known.
 *
 * That emptiness was indistinguishable from the truth, and the truth happened to
 * agree: `council_knowledge` on the live project is also empty (0 rows, measured
 * 2026-08-28). The output was accidentally correct, which is exactly why nothing
 * ever surfaced it.
 *
 * So: read the URL from the environment like every other client in this app,
 * read the error, and refuse to hand anyone an empty file.
 */
function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return { err: `knowledge store is not configured: missing ${!url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY'}` as string, db: null }
  }
  return { err: null, db: createClient(url, key) }
}

/**
 * GET /api/knowledge
 * Returns all accumulated AI knowledge as structured Q&A.
 * Used by agents to access trained knowledge.
 * Also serves as downloadable content for CRM Knowledge Base upload.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') || 'json'
  const category = searchParams.get('category')
  const minConf = parseFloat(searchParams.get('minConfidence') || '0.7')

  const { err, db } = client()
  if (err || !db) {
    return NextResponse.json({ error: err }, { status: 503 })
  }

  // Column names are the live schema's, not the dead project's: the surviving
  // table stores `synthesis`/`domain`/`composite_score` where this route once
  // asked for `synthesized_answer`/`category`/`confidence_score`. Repointing the
  // host alone would have traded a silent empty for a hard 400.
  let query = db
    .from('council_knowledge')
    .select('question, synthesis, domain, composite_score')
    .gte('composite_score', minConf)
    .order('composite_score', { ascending: false })
    .limit(200)

  if (category) query = query.eq('domain', category)

  const { data, error } = await query

  // Say the platform's own words. A generic string here is how the last outage hid.
  if (error) {
    console.error('[knowledge] query failed:', error.message, error.details)
    return NextResponse.json(
      { error: `knowledge store unreachable: ${error.message}` },
      { status: 503 }
    )
  }

  const entries = (data || []).map(d => ({
    question: d.question,
    synthesized_answer: d.synthesis,
    category: d.domain,
    confidence_score: d.composite_score,
  }))

  if (format === 'text') {
    // Refuse to serve a blank knowledge base. An empty .txt that downloads
    // successfully is the one output nobody inspects before uploading it.
    if (entries.length === 0) {
      return new NextResponse(
        `No knowledge entries at or above confidence ${minConf}${category ? ` in category "${category}"` : ''}. Nothing to download.`,
        { status: 404, headers: { 'Content-Type': 'text/plain' } }
      )
    }

    const text = entries.map(d =>
      `Q: ${d.question}\nA: ${d.synthesized_answer}\nCategory: ${d.category} | Confidence: ${((d.confidence_score || 0) * 100).toFixed(0)}%\n`
    ).join('\n---\n\n')

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': 'attachment; filename="0nai-knowledge-base.txt"' }
    })
  }

  return NextResponse.json({
    entries,
    total: entries.length,
    avgConfidence: entries.reduce((s, d) => s + (d.confidence_score || 0), 0) / (entries.length || 1),
  })
}
