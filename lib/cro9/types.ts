/**
 * CRO9 Neuro Engine — shared types
 */

export type Bucket =
  | 'CTR_FIX'
  | 'RELEVANCE_REBUILD'
  | 'POSITION_CLIMB'
  | 'SCHEMA_UPGRADE'
  | 'THIN_CONTENT'
  | 'INTERNAL_LINKING'

export type PriorityAction =
  | 'REWRITE_META_AND_INTRO'
  | 'COMPREHENSIVE_REWRITE'
  | 'ADD_SCHEMA'
  | 'EXPAND_CONTENT'
  | 'ADD_INTERNAL_LINKS'
  | 'OPTIMIZE_FOR_INTENT'

export type Factor = 'impressions' | 'position' | 'ctrGap' | 'conversions' | 'freshness'

export type TaskStatus =
  | 'pending'
  | 'briefed'
  | 'applied'
  | 'measuring'
  | 'improved'
  | 'flat'
  | 'regressed'
  | 'archived'

export type ApplyMode = 'briefs_only' | 'snippet' | 'wordpress'
export type SiteStatus = 'trial' | 'active' | 'paused' | 'canceled' | 'expired'

/** GSC row as returned by our normaliser */
export interface GscPageRow {
  url: string
  query?: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export interface SerpResult {
  position: number
  url: string
  title: string
  snippet?: string
  domain?: string
  featured?: boolean
}

export interface SerpSnapshot {
  keyword: string
  topResults: SerpResult[]
  features?: {
    paa?: string[]
    answerBox?: string
    knowledgeGraph?: boolean
  }
}

export interface ContentBrief {
  target_words: number
  word_range: [number, number]
  h2_count: [number, number]
  primary_keyword: string
  secondary_keywords: string[]
  keyword_density_target: [number, number]  // percents
  keyword_usage_count: [number, number]
  required_placements: string[]
  schema_stack: string[]
  entities_to_cover: string[]
  serp_gap_notes: string[]
  intent: 'informational' | 'commercial' | 'navigational' | 'transactional'
}

export interface ScoreComponents {
  impressions: number
  position: number
  ctrGap: number
  conversions: number
  freshness: number
  weighted: number
}

export interface TaskInput {
  url: string
  primaryKeyword: string
  clicks: number
  impressions: number
  position: number
  ctr: number
  expectedCtr: number
  ctrGap: number
}

export interface TaskOutput extends TaskInput {
  bucket: Bucket
  priorityAction: PriorityAction
  score: number
  scoreComponents: ScoreComponents
  pageType?: 'cluster' | 'landing' | 'article' | 'other'
}
