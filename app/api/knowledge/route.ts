import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = () => createClient(
  'https://yaehbwimocvvnnlojkxe.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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

  let query = supabase()
    .from('council_knowledge')
    .select('question, synthesized_answer, category, confidence_score')
    .gte('confidence_score', minConf)
    .order('confidence_score', { ascending: false })
    .limit(200)

  if (category) query = query.eq('category', category)

  const { data } = await query

  if (format === 'text') {
    // Plain text format for CRM KB upload
    const text = (data || []).map(d =>
      `Q: ${d.question}\nA: ${d.synthesized_answer}\nCategory: ${d.category} | Confidence: ${((d.confidence_score || 0) * 100).toFixed(0)}%\n`
    ).join('\n---\n\n')

    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain', 'Content-Disposition': 'attachment; filename="0nai-knowledge-base.txt"' }
    })
  }

  return NextResponse.json({
    entries: data || [],
    total: (data || []).length,
    avgConfidence: (data || []).reduce((s, d) => s + (d.confidence_score || 0), 0) / ((data || []).length || 1),
  })
}
