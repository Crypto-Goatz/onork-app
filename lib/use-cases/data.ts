/**
 * The use-case read model — the one place that knows the real shape of `use_cases`.
 *
 * The table did not exist at all until supabase/migrations/20260819_use_cases.sql.
 * Three surfaces addressed it — the index, the detail page and the daily Groq
 * generator — PostgREST answered PGRST205, supabase-js left `data` null, and the
 * index's `useCases || []` turned a missing table into "no use cases". Same
 * silent shape as the blog defect in cb8b3e3, which is why this module exists:
 * one select, one column list, one place to fix if the schema moves again.
 *
 * The sitemap reads from here too. That is the point — /use-cases/[slug] was held
 * out of the sitemap by hand because nobody could say which slugs resolved, and a
 * hand-maintained list of URLs is the second source of truth that causes the next
 * outage. It now lists exactly the rows that will render.
 */

import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/** Columns the index card needs. Verified against the migration. */
const LIST_COLUMNS =
  'id, slug, title, subtitle, category, description, metrics, featured, created_at, updated_at'

export interface UseCaseMetric {
  value: string
  label: string
  detail?: string
}

export interface UseCaseStep {
  step: number
  title: string
  description: string
}

export interface UseCaseFeature {
  title: string
  description: string
}

export interface UseCaseTestimonial {
  quote: string
  author: string
  role: string
}

/** What the index renders. */
export interface UseCaseSummary {
  id: string
  slug: string
  title: string
  subtitle: string | null
  category: string
  description: string
  metrics: UseCaseMetric[]
  featured: boolean
  createdAt: string
  /** `updated_at` when present, else `created_at`, normalized to ISO-8601 `Z`. */
  lastModified: string
}

/** What the detail page renders. */
export interface UseCase extends UseCaseSummary {
  problem: string
  solution: string
  howItWorks: UseCaseStep[]
  features: UseCaseFeature[]
  testimonial: UseCaseTestimonial | null
  metaTitle: string | null
  metaDescription: string | null
  keywords: string[]
  ctaText: string
  ctaUrl: string
}

/**
 * Postgres hands timestamps back as `+00:00` with microseconds. The sitemap mixes
 * these with git-derived dates, and one format across every entry is one fewer
 * thing for a crawler to disagree with us about.
 */
function iso(value: string | null | undefined, fallback: string): string {
  const raw = value || fallback
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? new Date(fallback).toISOString() : d.toISOString()
}

function summarize(row: Record<string, unknown>): UseCaseSummary {
  const createdAt = iso(row.created_at as string, new Date(0).toISOString())
  return {
    id: row.id as string,
    slug: row.slug as string,
    title: row.title as string,
    subtitle: (row.subtitle as string) ?? null,
    category: row.category as string,
    description: row.description as string,
    metrics: (row.metrics as UseCaseMetric[]) || [],
    featured: Boolean(row.featured),
    createdAt,
    lastModified: iso(row.updated_at as string, createdAt),
  }
}

/**
 * Every published use case, featured first then `sort_order`.
 *
 * A failure here must not read as an empty catalogue, so it logs PostgREST's own
 * words. Callers still get [] — a marketing index that throws is worse than one
 * that is briefly short — but the build log says why.
 */
export const getPublishedUseCases = cache(async (): Promise<UseCaseSummary[]> => {
  const { data, error } = await admin
    .from('use_cases')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[use-cases] use_cases query failed:', error.code, error.message, error.details ?? '')
    return []
  }
  return (data || []).filter(r => r.slug && r.title).map(summarize)
})

/** One published use case by slug, or null. Null is what makes the page 404. */
export const getUseCase = cache(async (slug: string): Promise<UseCase | null> => {
  const { data, error } = await admin
    .from('use_cases')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    console.error('[use-cases] use_cases detail query failed:', error.code, error.message, error.details ?? '')
    return null
  }
  if (!data) return null

  return {
    ...summarize(data),
    problem: data.problem,
    solution: data.solution,
    howItWorks: (data.how_it_works as UseCaseStep[]) || [],
    features: (data.features as UseCaseFeature[]) || [],
    testimonial: (data.testimonial as UseCaseTestimonial) ?? null,
    metaTitle: data.meta_title ?? null,
    metaDescription: data.meta_description ?? null,
    keywords: (data.keywords as string[]) || [],
    ctaText: data.cta_text || 'Get Started',
    ctaUrl: data.cta_url || '/login',
  }
})
