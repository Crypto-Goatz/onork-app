/**
 * 0nStack Export Builder
 * Builds enriched CSV output by appending 18 0nStack_ prefixed columns
 * to the original CSV data with detection and classification results.
 */

import type { DetectionResult } from './detection-engine'
import type { SegmentResult } from './segment-classifier'
import type { ParsedContact } from './domain-parser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnrichmentData {
  originalRow: Record<string, string>
  contact: ParsedContact
  detection: DetectionResult | null
  segment: SegmentResult | null
}

// ---------------------------------------------------------------------------
// The 18 0nStack columns
// ---------------------------------------------------------------------------

const ONSTACK_COLUMNS = [
  '0nStack_domain',
  '0nStack_is_freemail',
  '0nStack_email_provider',
  '0nStack_scan_status',
  '0nStack_scan_date',
  '0nStack_segment',
  '0nStack_segment_label',
  '0nStack_segment_score',
  '0nStack_suggested_action',
  '0nStack_has_crm',
  '0nStack_crm_list',
  '0nStack_has_automation',
  '0nStack_automation_list',
  '0nStack_has_reviews',
  '0nStack_has_chat',
  '0nStack_has_scheduling',
  '0nStack_has_payments',
  '0nStack_has_analytics',
  '0nStack_tools_json',
] as const

// ---------------------------------------------------------------------------
// Row builder
// ---------------------------------------------------------------------------

function buildEnrichmentValues(data: EnrichmentData): Record<string, string> {
  const { contact, detection, segment } = data

  const crmList =
    detection?.tools
      .filter((t) => t.category === 'crm')
      .map((t) => `${t.name} (${t.confidence}%)`)
      .join('; ') ?? ''

  const automationList =
    detection?.tools
      .filter((t) => t.category === 'automation')
      .map((t) => `${t.name} (${t.confidence}%)`)
      .join('; ') ?? ''

  // Compact tools summary for JSON column (no rawHTML)
  const toolsSummary = detection?.tools.map((t) => ({
    cat: t.category,
    name: t.name,
    conf: t.confidence,
  })) ?? []

  return {
    '0nStack_domain': contact.domain ?? '',
    '0nStack_is_freemail': contact.isFreeMail ? 'true' : 'false',
    '0nStack_email_provider': contact.provider ?? '',
    '0nStack_scan_status': detection?.status ?? 'skipped',
    '0nStack_scan_date': detection?.scannedAt ?? '',
    '0nStack_segment': segment?.segment ?? '',
    '0nStack_segment_label': segment?.label ?? '',
    '0nStack_segment_score': segment?.score?.toString() ?? '',
    '0nStack_suggested_action': segment?.suggestedAction ?? '',
    '0nStack_has_crm': detection?.hasCRM ? 'true' : 'false',
    '0nStack_crm_list': crmList,
    '0nStack_has_automation': detection?.hasAutomation ? 'true' : 'false',
    '0nStack_automation_list': automationList,
    '0nStack_has_reviews': detection?.hasReviews ? 'true' : 'false',
    '0nStack_has_chat': detection?.hasChat ? 'true' : 'false',
    '0nStack_has_scheduling': detection?.hasScheduling ? 'true' : 'false',
    '0nStack_has_payments': detection?.hasPayments ? 'true' : 'false',
    '0nStack_has_analytics': detection?.hasAnalytics ? 'true' : 'false',
    '0nStack_tools_json': JSON.stringify(toolsSummary),
  }
}

// ---------------------------------------------------------------------------
// CSV escaping
// ---------------------------------------------------------------------------

function escapeCSVField(value: string): string {
  // If value contains comma, newline, or double quote, wrap in quotes
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build an enriched CSV string by appending 18 0nStack_ columns
 * to each row of the original data.
 *
 * @param originalHeaders - The original CSV headers
 * @param enrichedRows - Array of enrichment data for each row
 * @returns Complete CSV string with BOM for Excel compatibility
 */
export function buildEnrichedCSV(
  originalHeaders: string[],
  enrichedRows: EnrichmentData[]
): string {
  const allHeaders = [...originalHeaders, ...ONSTACK_COLUMNS]
  const lines: string[] = []

  // Header row
  lines.push(allHeaders.map(escapeCSVField).join(','))

  // Data rows
  for (const data of enrichedRows) {
    const enrichmentValues = buildEnrichmentValues(data)
    const fields: string[] = []

    // Original columns
    for (const header of originalHeaders) {
      fields.push(escapeCSVField(data.originalRow[header] ?? ''))
    }

    // 0nStack columns
    for (const col of ONSTACK_COLUMNS) {
      fields.push(escapeCSVField(enrichmentValues[col] ?? ''))
    }

    lines.push(fields.join(','))
  }

  // UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  return BOM + lines.join('\n')
}

/**
 * Get the list of 0nStack column names (for reference/display).
 */
export function getOnStackColumns(): readonly string[] {
  return ONSTACK_COLUMNS
}

/**
 * Build a summary report of the enrichment run.
 */
export function buildSummaryReport(enrichedRows: EnrichmentData[]): {
  totalRows: number
  scannedDomains: number
  cachedDomains: number
  errorDomains: number
  freemailSkipped: number
  segmentBreakdown: Record<string, number>
  topCRMs: { name: string; count: number }[]
  averageScore: number
} {
  let scannedDomains = 0
  let errorDomains = 0
  let freemailSkipped = 0
  const segmentCounts: Record<string, number> = {}
  const crmCounts: Record<string, number> = {}
  let totalScore = 0
  let scoredCount = 0

  for (const row of enrichedRows) {
    if (row.contact.isFreeMail) {
      freemailSkipped++
      continue
    }

    if (row.detection) {
      if (row.detection.status === 'success') {
        scannedDomains++
      } else {
        errorDomains++
      }

      for (const tool of row.detection.tools) {
        if (tool.category === 'crm') {
          crmCounts[tool.name] = (crmCounts[tool.name] ?? 0) + 1
        }
      }
    }

    if (row.segment) {
      const seg = row.segment.segment
      segmentCounts[seg] = (segmentCounts[seg] ?? 0) + 1
      totalScore += row.segment.score
      scoredCount++
    }
  }

  const topCRMs = Object.entries(crmCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalRows: enrichedRows.length,
    scannedDomains,
    cachedDomains: 0, // Caller should track this separately
    errorDomains,
    freemailSkipped,
    segmentBreakdown: segmentCounts,
    topCRMs,
    averageScore: scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0,
  }
}
