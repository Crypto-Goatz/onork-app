# AEO Implementation Reference

> Companion to `SXO-CRO9-Master-Playbook.md`. This is the engineering manual.
> If you're shipping code that touches the SXO/AEO axis, read this first.

**Status:** v1.0 — shipped 2026-05-06.
**Owner:** RocketOpp / 0nMCP
**Canonical source files:** `src/lib/cro9/aeo-scorer.ts`, `src/lib/cro9/types.ts`

---

## TL;DR

AEO ("Answer Engine Optimization") is a **second adaptive scoring axis**
that runs alongside the existing SXO loop. Same daily cron, same blog
generator, same database — just two weight tables and two outcome
evaluators that adapt independently and feed a unified content brief.

Every post we generate is scored on both axes. Every weight drifts based
on observed outcomes. The marriage is in the brief: SXO says *"will it
surface,"* AEO says *"will an AI engine cite it once it does."*

---

## File map

| File | Lines | What it owns |
|------|-------|-------------|
| `src/lib/cro9/types.ts` | ~210 | `AEOFactors`, `AEOWeights`, `AEOOutcome`, `DEFAULT_AEO_WEIGHTS`, extends `ContentBrief` with `aeoRequirements`, extends `BlogPost` and `ScoredPage` with `aeoScore` + `aeoFactors` |
| `src/lib/cro9/aeo-scorer.ts` | ~280 | All 10 dimension detectors + `scoreAEO()` + `aeoGaps()` + `aeoRequirementsFromGaps()` |
| `src/lib/cro9/brief-generator.ts` | ~225 | `generateBrief()` populates `aeoRequirements` for new posts (defaults all-on; for rewrites driven by current factor gaps) |
| `src/lib/cro9/blog-generator.ts` | ~245 | `buildSystemPrompt()` writes the AEO-aware Groq prompt (BLUF, definition, procedure, FAQ, banned-fluff list) |
| `src/lib/cro9/publisher.ts` | ~190 | `scoreAndPersistAEO()` fires on every save/publish |
| `src/app/api/cron/blog-seo/route.ts` | ~280 | Daily cron — pulls Search Console, scores SXO, generates AEO-aware briefs, publishes top brief, drafts the rest |

---

## Database

### `aeo_weights`
Active row (where `active = true`) drives current scoring. Adjuster writes
a new row with `generation = parent.generation + 1` and `parent_id` set,
flips old row to `active = false`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `bluf` | float | Default 0.18 — highest |
| `definition` | float | 0.14 |
| `procedure` | float | 0.12 |
| `comparison` | float | 0.10 |
| `faq` | float | 0.10 |
| `author_eeat` | float | 0.08 |
| `freshness` | float | 0.08 |
| `schema_score` | float | 0.08 (renamed from `schema` to avoid postgres reserved word) |
| `information_gain` | float | 0.06 |
| `specificity` | float | 0.06 |
| `active` | bool | Only one active at a time |
| `generation` | int | Increments per adjustment cycle |
| `parent_id` | uuid | Lineage |
| `reason` | text | "engagement bump on bluf" / "seed v1" / etc |
| `created_at` | timestamptz | |

Weights sum to 1.00. The adjuster normalizes after each step.

### `blog_aeo_scores`
One row per blog post. Updated on save/publish/edit. Joined into the blog
admin dashboard.

| Column | Type | Notes |
|--------|------|-------|
| `post_id` | uuid PK → blog_posts | |
| `score` | int | 0-100 |
| `factors` | jsonb | The full `AEOFactors` object — per-dimension 0-1 |
| `scored_at` | timestamptz | |
| `weights_id` | uuid → aeo_weights | Which generation scored it |

### `aeo_outcomes`
The ledger. After N days post-publish, the outcome evaluator writes one
row per post with engagement delta + citation results (Phase 3) +
success boolean.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `post_id` | uuid → blog_posts | |
| `page_url` | text | |
| `factors_before` | jsonb | (for rewrites — null on first publish) |
| `factors_after` | jsonb | The post's AEO factors at publish time |
| `engagement_delta` | jsonb | `{avgScrollPct, avgTimeOnPage, bounceRate, conversionRate}` |
| `citation_results` | jsonb | Phase 3 — per-AI-engine cite booleans |
| `success` | bool | Computed by the evaluator |
| `evaluated_at` | timestamptz | |
| `weights_id` | uuid | Which weights gen the post was scored under |

### Companion (existing, SXO axis)
- `seo_weights` — same shape, 5 dimensions (impressions, position, ctr_gap, conversions, freshness)
- `seo_actions` — pending content actions
- `seo_pages` — daily Search Console snapshot

---

## The 10 detectors — what each one looks at

All in `src/lib/cro9/aeo-scorer.ts`. Each returns `0-1`.

### 1. `detectBLUF(markdown)` → 0-1
- First non-heading paragraph
- Word count between 15 and 100
- Sentence count between 1 and 4
- No fluff phrases (banned list: `leverage`, `synergy`, `cutting-edge`, `look no further`, `as we all know`, `in conclusion`, etc.)
- Bonus if it contains an answer-shaped verb cluster (`is/are/means/refers to/describes/works by/enables`)

### 2. `detectDefinition(markdown)` → 0-1
- Within first 200 words
- Bolded sentence matching `**X is/are/means/refers to Y.**`
- Partial credit for any bold-sentence pattern in the head

### 3. `detectProcedure(markdown)` → 0-1
- Numbered list of ≥3 items
- Score by imperative-verb-first ratio
- 60%+ imperatives = 1.0; 30-60% = 0.6; <30% = 0.4
- Imperative starters: Click, Select, Choose, Enter, Open, Run, Install, Configure, Set, Add, Remove, Edit, Delete, Save, Verify, Check, Create, Update, etc.

### 4. `detectComparison(markdown)` → 0-1
- Markdown table with ≥3 rows × ≥3 cols
- Bonus if it includes "Best for" / "When to choose" / "Pros" / "Cons" / "Use case"

### 5. `detectFAQ(markdown)` → 0-1
- `## FAQ` / `## Frequently Asked` heading present
- 5-7 `### Q:` or `**Q:**` items inside

### 6. `detectAuthorEEAT(markdown, opts)` → 0-1
- Author name present (0.5)
- Author title present (0.3)
- Body contains credential phrase: years/certified/founder/CEO/engineer/architect/PhD/MBA/MD (0.2)

### 7. `detectFreshness(markdown, opts)` → 0-1
- Inline "Updated <month/year>" marker
- `updated_at` recency (≤30 days = 1.0, ≤90 days = 0.7, ≤180 days = 0.4, older = 0.1)

### 8. `detectSchema(opts)` → 0-1
- Caller passes `{hasArticle, hasFAQ, hasHowTo, hasOrganization}`
- 0.4 / 0.25 / 0.25 / 0.10 weighting respectively

### 9. `detectInformationGain(markdown)` → 0-1
- Code block (0.3)
- Any markdown table (0.2)
- Inline citation (`according to [...]` / `per the [...]` / `cited in [...]`) (0.3)
- Mentions "case study" / "internal data" / "proprietary" (0.2)

### 10. `detectSpecificity(markdown)` → 0-1
- Density of numbers + dates + named entities per 100 words
- 5+/100 words = 1.0; capped

---

## Composite scoring

```ts
import { scoreAEO } from '@/lib/cro9/aeo-scorer'

const { score, factors } = scoreAEO({
  markdown: post.body,
  author: 'RocketOpp',
  authorTitle: '0nMCP team',
  updatedAt: post.updated_at,
  hasArticle: true,
  hasFAQ: /(\bFAQ\b|Frequently Asked)/i.test(post.body),
  hasHowTo: /^\s*\d+\.\s+/m.test(post.body),
  hasOrganization: true,
})

// score is 0-100, factors is the full AEOFactors object
```

Weights are pulled from `aeo_weights WHERE active = true` and passed into
`scoreAEO()` if you want to score against a specific generation. Default
omits the second arg → uses `DEFAULT_AEO_WEIGHTS`.

---

## How weights adapt — the AEO evaluator

> Status: **shipped.** Daily cron at `/api/cron/aeo-evaluate` (11:00 UTC).
> Implementation: `src/lib/cro9/aeo-evaluator.ts`. Phase 3 (real LLM citation
> probe → `aeo_outcomes.citation_results`) is the remaining sprint.

### The loop:

```
1. For each post published > N days ago (default 14) without an aeo_outcomes row:
2.   Pull cro9_events for that page over the measurement window
3.   Compute engagement deltas vs the 28-day baseline for that bucket:
       avgScrollPct, avgTimeOnPage, bounceRate, conversionRate
4.   Pull the blog_aeo_scores row for the post → factors_after
5.   Insert aeo_outcomes row
6.   Bucket outcomes by dimension:
       "posts where bluf > 0.7" → mean engagement delta
       "posts where bluf < 0.3" → mean engagement delta
       Difference → signal strength of bluf
7.   For each dimension with positive signal: weight *= 1.05 (capped at 0.30 single-dim)
     For each with negative or null signal: weight *= 0.97
8.   Normalize so sum(weights) === 1.0
9.   Insert new aeo_weights row with generation = parent + 1, mark old inactive
```

Phase 3 — when the AI-citation simulator ships — `citation_results` becomes
the dominant signal. A post that gets cited by 2+ engines counts as a
strong success regardless of engagement.

---

## Where it plugs in

### Daily cron (`/api/cron/blog-seo`)
Already runs every day at 6 AM UTC. Now also:
- Generates posts with AEO-aware system prompts
- Saves AEO factors + score on every publish
- Publishes top brief, drafts the rest (one-a-day rhythm)

### WP-SXO plugin (Crypto-Goatz/0nwp v2.0 — building)
- Same 10 detectors ported to PHP
- Real-time score in the Gutenberg sidebar
- Pulls active weights from `aeo_weights` via a small REST endpoint exposed
  by the customer's wpsxo.com license check (license key → site → most
  recent active weights)

### CRO9 browser embed
Already collecting `cro9_events` (pageview, scroll, click, time-on-page,
exit, conversion). These are the engagement signal source for the AEO
weight adjuster.

---

## Quick recipes

### Score an arbitrary markdown string
```ts
import { scoreAEO, aeoGaps } from '@/lib/cro9/aeo-scorer'

const { score, factors } = scoreAEO({ markdown: someText })
const gaps = aeoGaps(factors, 0.5) // dimensions below 0.5 → need work
```

### Re-score every existing post
```sql
-- Run this from the admin dashboard or a one-off script after weight changes
SELECT id, body FROM blog_posts WHERE status = 'published';
-- For each row, call scoreAEO() and upsert into blog_aeo_scores
```

### Override default weights
```ts
import { scoreAEO, type AEOWeights } from '@/lib/cro9/aeo-scorer'

const customWeights: AEOWeights = { ...DEFAULT_AEO_WEIGHTS, bluf: 0.30, faq: 0.04 }
const result = scoreAEO({ markdown }, customWeights)
```

---

## Why this works (intuition)

The current state of AI search citation (Q1 2026):
- ChatGPT cites the **first cite-able sentence** (BLUF)
- Claude prefers **definition blocks** for "What is X" queries
- Perplexity favors **comparison tables** for evaluations
- Google AI Overview heavily weights **E-E-A-T** + **freshness**
- All four extract numbered procedures verbatim for HowTo queries

These behaviors are observed but not officially documented. They drift.
The whole point of the dual-loop is: **we don't have to know which
dimensions matter most — the engine figures it out from outcomes.**

If Claude starts preferring FAQ blocks more strongly in 2027, our `faq`
weight will adapt. If Google AI Overview weakens its freshness penalty,
our `freshness` weight will decay. The system is observably correct
without us re-reading every AI search blog post.

---

## Cross-product impact

| Surface | What gets the AEO upgrade |
|---------|---------------------------|
| 0nmcp.com daily blog | ✅ Live (this commit) |
| WP-SXO plugin (`Crypto-Goatz/0nwp`) | 🚧 Building — v2.0 ports the 10 detectors to PHP |
| sxowebsite.com SXO scanner | 🚧 Will adopt — new "AEO score" alongside existing SXO score |
| 0nCore Detect & Refine dashboard | 🚧 Will surface AEO score per page on the live traffic dashboard |
| rocketopp.com / verifiedsxo.com / cro9.com | All public pages should hit AEO ≥ 75 by end of Q2 |

The marriage is canonical. New pages on any 0n-family site are scored on
both axes from launch.
