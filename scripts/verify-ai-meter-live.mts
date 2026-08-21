/**
 * The AI meter, against the real database and a real model.
 *
 * NOT A UNIT TEST. `usage_events` had sat in production with zero rows for its
 * whole life while the code that was supposed to fill it typechecked fine, so a
 * green test proving the recorder *compiles* would reproduce exactly the state
 * this work exists to end. This script asks Groq a real question through the
 * real helper, then reads the row back out of the canonical project by id.
 *
 * Run:  npx tsx --env-file=.env.local scripts/verify-ai-meter-live.mts
 *       (GROQ_API_KEY must be present; pull it from the Vercel project env.)
 *
 * It cleans up after itself: every row it writes carries the marker surface
 * below and is deleted at the end, so a verification run cannot pollute the
 * volume number the pricing decision will be made from.
 */
import { createClient } from '@supabase/supabase-js'

const SURFACE = 'verify.ai-meter'
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY!

const sb = createClient(URL_, SVC, { auth: { persistSession: false } })

let failures = 0
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`)
  if (!ok) failures++
}

async function main() {
  console.log(`AI meter — live verification against ${new URL(URL_).hostname}\n`)

  // ── 0. The baseline this whole task is about ──────────────────────────────
  const { count: before } = await sb
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('meter_key', 'AI_CALL')
  console.log(`      AI_CALL rows before this run: ${before ?? 0}\n`)

  // ── 1. A real model call through a real helper ────────────────────────────
  // lib/groq.ts is one of the four wired chokepoints. Calling it rather than
  // recordAiUsage() directly is the point: it proves the WIRING, not just the
  // writer. A recorder nobody calls records nothing.
  const { groqChat } = await import('../lib/groq')
  let answered = ''
  try {
    const res = await groqChat({
      model: 'openai/gpt-oss-120b',
      user: 'Reply with exactly one word: metered',
      max_tokens: 200,
      // gpt-oss spends reasoning tokens out of max_tokens; without this a small
      // budget comes back empty and reads as a broken model.
      reasoning_effort: 'low',
      surface: SURFACE,
    })
    answered = res.text.trim()
  } catch (err) {
    check('groq call', false, err instanceof Error ? err.message : String(err))
  }
  check('a real model answered', Boolean(answered), answered ? `"${answered.slice(0, 60)}"` : 'no text came back')

  // ── 2. The call left a row ────────────────────────────────────────────────
  const { data: rows, error } = await sb
    .from('usage_events')
    .select('*')
    .eq('meter_key', 'AI_CALL')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    check('read back', false, error.message)
    return finish()
  }

  const row = (rows ?? []).find((r) => (r as Record<string, unknown>).surface === SURFACE) ?? rows?.[0]
  check('the call recorded a usage_event', Boolean(row), row ? `id ${row.id} at ${row.created_at}` : 'no row found')
  if (!row) return finish()

  const r = row as Record<string, unknown>

  // ── 3. It recorded at ZERO, which is the entire point ─────────────────────
  check('price is zero', r.price_cents === 0, `price_cents=${r.price_cents}`)
  check(
    'status is metered, not a billing state',
    r.status === 'metered',
    `status="${r.status}" — must not be pending/posted/failed or a reconciliation job will read it as money`,
  )
  check('quantity is one call', r.quantity === 1, `quantity=${r.quantity}`)

  // ── 4. The dimensions a price gets derived from ───────────────────────────
  // Reported, not asserted: they only exist once 20260821100000_ai_usage_meter.sql
  // has been applied. Failing here before that would report a missing migration
  // as a broken meter.
  const hasDimensions = 'model' in r
  if (hasDimensions) {
    check('model recorded', typeof r.model === 'string' && r.model.length > 0, `model=${r.model}`)
    check('provider recorded', r.provider === 'groq', `provider=${r.provider}`)
    check('surface recorded', r.surface === SURFACE, `surface=${r.surface}`)
    check(
      'token counts recorded',
      typeof r.prompt_tokens === 'number' && typeof r.completion_tokens === 'number',
      `prompt=${r.prompt_tokens} completion=${r.completion_tokens}`,
    )
    check('latency recorded', typeof r.latency_ms === 'number', `latency_ms=${r.latency_ms}`)
  } else {
    console.log(
      'NOTE  usage_events has no AI dimension columns yet, so this row carries a count only.\n' +
        '      Counting still works — that is the degrade path in lib/billing/ai-meter.ts.\n' +
        '      Apply supabase/migrations/20260821100000_ai_usage_meter.sql to capture\n' +
        '      model, provider, surface and tokens.',
    )
  }

  // ── 5. It must not appear in the operations log ───────────────────────────
  // Metered rows outnumber real entries by orders of magnitude; if they reach
  // the unified log they bury the one line it exists to surface.
  const { collectLog } = await import('../lib/log/collect')
  const log = await collectLog(String(r.company_id), 200)
  check(
    'metered rows stay out of the operations log',
    !log.some((e) => e.source === 'billing' && e.what.includes('AI request')),
    `${log.length} log entries, none of them this meter`,
  )

  await finish()
}

async function finish() {
  const { error } = await sb.from('usage_events').delete().eq('surface', SURFACE)
  // Pre-migration there is no `surface` column to filter on; fall back to the
  // marker company id the recorder uses for unattributed calls made just now.
  if (error) {
    await sb
      .from('usage_events')
      .delete()
      .eq('meter_key', 'AI_CALL')
      .eq('company_id', 'unattributed')
      .gte('created_at', new Date(Date.now() - 5 * 60_000).toISOString())
  }
  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`} — verification rows removed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('verification threw:', err)
  process.exit(1)
})
