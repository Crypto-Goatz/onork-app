/**
 * The distiller — the missing middle of the learning pipeline.
 *
 * WHY THIS IS THE WHOLE GAP. training_sources holds 371 rows and training_runs
 * holds 326, while training_pairs and council_knowledge hold ZERO. The system
 * ingests and it runs and it produces nothing. Everything upstream and
 * downstream of this file already exists; this is the step nobody wrote.
 *
 * IT PROPOSES, IT DOES NOT PROMOTE. Every fact lands as a `candidate`. Nothing
 * is written to a client's knowledge base here and nothing is treated as true.
 * An AI that silently teaches itself things about someone's business, from one
 * observation, and then repeats them to that business's customers, is a
 * liability wearing a feature's clothes.
 *
 * EVIDENCE IS THE UNIT, NOT THE FACT. Seeing the same thing twice raises
 * confidence on ONE row rather than creating a second row that disagrees with
 * the first. Confidence is a function of independent corroboration — never of
 * how certain the model sounded.
 *
 * PII NEVER BECOMES A FACT. A knowledge base answers "what are your hours",
 * not "who called on Tuesday". Emails, phones and long digit runs are stripped
 * before anything is stored.
 */
import { createServiceClient } from '@/lib/connect/service-client'

export type FactKind = 'qa' | 'business' | 'preference' | 'outcome' | 'contact_pattern'

export interface Candidate {
  kind: FactKind
  subject: string
  fact: string
  sourceType: 'receipt' | 'conversation' | 'crawl' | 'workflow' | 'course'
  sourceId: string
  excerpt: string
}

/** Identifiers out. A fact is about the business, never about a person. */
export function scrub(s: string): string {
  return s
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]')
    .replace(/\b\d{5}(?:-\d{4})?\b/g, '[postcode]')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Confidence from corroboration, capped below certainty.
 *
 * One observation is never more than 0.4 — enough to review, never enough to
 * promote. The ceiling of 0.95 is deliberate: nothing learned by inference
 * should ever claim to be certain.
 */
export function confidenceFor(evidenceCount: number): number {
  return Math.min(0.95, 0.4 + (evidenceCount - 1) * 0.18)
}

/**
 * Read what actually happened and propose what it implies.
 *
 * Deliberately rule-based rather than model-driven at this stage. A model asked
 * to "find facts" will produce fluent, plausible, unfalsifiable ones; rules
 * produce fewer facts that each point at a specific row. The model comes in
 * later to phrase promoted facts, not to decide which are true.
 */
export async function distilLocation(
  companyId: string,
  locationId: string | null,
  opts: { sinceDays?: number; limit?: number } = {},
): Promise<{ ok: true; candidates: number; stored: number } | { ok: false; error: string }> {
  const db = createServiceClient()
  if (!db) return { ok: false, error: 'Storage unavailable.' }

  const since = new Date(Date.now() - (opts.sinceDays ?? 30) * 86_400_000).toISOString()
  const limit = Math.min(opts.limit ?? 500, 2000)
  const found: Candidate[] = []

  // ── Receipts: what this agency actually does, and what fails ──────────────
  let q = db
    .from('burst_receipts')
    .select('id, capability, intent, status, detail, error, location_id, settled_at')
    .eq('company_id', companyId)
    .gte('settled_at', since)
    .order('settled_at', { ascending: false })
    .limit(limit)
  if (locationId) q = q.eq('location_id', locationId)
  const { data: receipts } = await q

  const capCount = new Map<string, number>()
  const failCount = new Map<string, { n: number; sample: string }>()

  for (const r of receipts ?? []) {
    const cap = String(r.capability || '')
    if (!cap) continue
    capCount.set(cap, (capCount.get(cap) ?? 0) + 1)
    if (r.status === 'failed') {
      const prev = failCount.get(cap) ?? { n: 0, sample: '' }
      failCount.set(cap, { n: prev.n + 1, sample: prev.sample || scrub(String(r.error || '')).slice(0, 200) })
    }
  }

  for (const [cap, n] of capCount) {
    // A capability used once is noise. Used repeatedly, it is how this agency works.
    if (n < 3) continue
    found.push({
      kind: 'outcome',
      subject: cap,
      fact: `This account uses "${cap}" regularly — ${n} runs in the last ${opts.sinceDays ?? 30} days.`,
      sourceType: 'receipt',
      sourceId: cap,
      excerpt: `${n} receipts`,
    })
  }

  for (const [cap, f] of failCount) {
    const total = capCount.get(cap) ?? f.n
    const rate = f.n / total
    // Only a pattern, not an incident. A single failure teaches nothing.
    if (f.n < 2 || rate < 0.3) continue
    found.push({
      kind: 'outcome',
      subject: cap,
      fact: `"${cap}" fails often here — ${f.n} of ${total} runs failed${f.sample ? ` (e.g. ${f.sample})` : ''}.`,
      sourceType: 'receipt',
      sourceId: `${cap}:fail`,
      excerpt: f.sample,
    })
  }

  // ── Crawls: verifiable facts about the business's own web presence ────────
  if (locationId) {
    const { data: sites } = await db
      .from('sxo_crawl_sites')
      .select('id, domain, score, pages_found, last_crawled_at')
      .eq('company_id', companyId)
      .eq('location_id', locationId)
      .limit(20)

    for (const s of sites ?? []) {
      if (s.score == null) continue
      found.push({
        kind: 'business',
        subject: s.domain,
        fact: `${s.domain} has ${s.pages_found} indexable pages and scores ${s.score}/100 on structure and answer-readiness.`,
        sourceType: 'crawl',
        sourceId: String(s.id),
        excerpt: `score ${s.score}, ${s.pages_found} pages`,
      })

      const { data: broken } = await db
        .from('sxo_crawl_pages')
        .select('path, issues')
        .eq('site_id', s.id)
        .eq('severity', 'red')
        .limit(10)
      if (broken?.length) {
        found.push({
          kind: 'business',
          subject: s.domain,
          fact: `${broken.length} page(s) on ${s.domain} have critical issues, including ${broken.slice(0, 3).map((b) => b.path).join(', ')}.`,
          sourceType: 'crawl',
          sourceId: `${s.id}:red`,
          excerpt: broken.slice(0, 3).map((b) => b.path).join(', '),
        })
      }
    }
  }

  // ── Store as candidates, merging on the fact itself ───────────────────────
  let stored = 0
  for (const c of found) {
    const fact = scrub(c.fact)
    const { data: existing } = await db
      .from('learning_facts')
      .select('id, evidence_count')
      .eq('company_id', companyId)
      .eq('kind', c.kind)
      .eq('fact', fact)
      .maybeSingle()

    let factId = existing?.id as string | undefined

    if (existing) {
      const n = (existing.evidence_count ?? 1) + 1
      await db.from('learning_facts').update({
        evidence_count: n, confidence: confidenceFor(n), last_seen: new Date().toISOString(),
      }).eq('id', existing.id)
    } else {
      const { data: ins } = await db.from('learning_facts').insert({
        company_id: companyId, location_id: locationId, kind: c.kind,
        subject: scrub(c.subject).slice(0, 200), fact,
        confidence: confidenceFor(1), evidence_count: 1, status: 'candidate',
      }).select('id').single()
      factId = ins?.id
      if (factId) stored++
    }

    if (factId) {
      await db.from('learning_evidence').insert({
        fact_id: factId, source_type: c.sourceType,
        source_id: c.sourceId.slice(0, 200), excerpt: scrub(c.excerpt).slice(0, 500),
      })
    }
  }

  return { ok: true, candidates: found.length, stored }
}
