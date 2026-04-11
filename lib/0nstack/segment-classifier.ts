/**
 * 0nStack Segment Classifier
 * Classifies a domain detection result into a lead quality segment
 * with a priority score for outreach ordering.
 */

import type { DetectionResult } from './detection-engine'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SegmentResult {
  segment: SegmentName
  label: string
  score: number // 0-100 priority score (higher = better lead)
  reason: string
  suggestedAction: string
  detectedCRMs: string[]
  detectedAutomation: string[]
}

export type SegmentName =
  | 'no_crm'
  | 'hubspot'
  | 'salesforce'
  | 'active_campaign'
  | 'mailchimp'
  | 'zoho'
  | 'keap'
  | 'already_on_platform'
  | 'pipedrive'
  | 'other_crm'

// ---------------------------------------------------------------------------
// Segment definitions with base scores
// ---------------------------------------------------------------------------

interface SegmentDef {
  segment: SegmentName
  label: string
  score: number
  suggestedAction: string
}

const SEGMENTS: Record<SegmentName, SegmentDef> = {
  no_crm: {
    segment: 'no_crm',
    label: 'No CRM Detected',
    score: 95,
    suggestedAction:
      'Highest priority — no existing CRM investment. Pitch full platform value.',
  },
  hubspot: {
    segment: 'hubspot',
    label: 'HubSpot User',
    score: 80,
    suggestedAction:
      'Common switch target. Emphasize all-in-one simplicity vs HubSpot add-on costs.',
  },
  salesforce: {
    segment: 'salesforce',
    label: 'Salesforce User',
    score: 60,
    suggestedAction:
      'Enterprise lock-in. Focus on cost savings and ease of use for SMBs.',
  },
  active_campaign: {
    segment: 'active_campaign',
    label: 'ActiveCampaign User',
    score: 82,
    suggestedAction:
      'Strong automation user. Highlight superior automation + CRM in one platform.',
  },
  mailchimp: {
    segment: 'mailchimp',
    label: 'Mailchimp User',
    score: 85,
    suggestedAction:
      'Email-only tool. Position as upgrade path: email + CRM + automation + funnels.',
  },
  zoho: {
    segment: 'zoho',
    label: 'Zoho User',
    score: 78,
    suggestedAction:
      'Budget CRM user. Emphasize superior UX and integrated marketing tools.',
  },
  keap: {
    segment: 'keap',
    label: 'Keap (Infusionsoft) User',
    score: 90,
    suggestedAction:
      'High churn platform. Many Keap users actively looking for alternatives.',
  },
  already_on_platform: {
    segment: 'already_on_platform',
    label: 'Already On Platform',
    score: 70,
    suggestedAction:
      'Existing customer. Upsell additional features, integrations, or higher tier.',
  },
  pipedrive: {
    segment: 'pipedrive',
    label: 'Pipedrive User',
    score: 75,
    suggestedAction:
      'Sales-focused CRM. Pitch marketing automation gap that platform fills.',
  },
  other_crm: {
    segment: 'other_crm',
    label: 'Other CRM',
    score: 65,
    suggestedAction:
      'Non-major CRM detected. Assess switching cost and pain points.',
  },
}

// ---------------------------------------------------------------------------
// CRM name to segment mapping
// ---------------------------------------------------------------------------

const CRM_SEGMENT_MAP: Record<string, SegmentName> = {
  HubSpot: 'hubspot',
  Salesforce: 'salesforce',
  ActiveCampaign: 'active_campaign',
  Mailchimp: 'mailchimp',
  Zoho: 'zoho',
  Keap: 'keap',
  Pipedrive: 'pipedrive',
  'Rocket+': 'already_on_platform',
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a detection result into a segment with a priority score.
 */
export function classifySegment(detection: DetectionResult): SegmentResult {
  const crmTools = detection.tools.filter((t) => t.category === 'crm')
  const automationTools = detection.tools.filter(
    (t) => t.category === 'automation'
  )

  const detectedCRMs = crmTools.map((t) => t.name)
  const detectedAutomation = automationTools.map((t) => t.name)

  // No CRM detected — highest value lead
  if (crmTools.length === 0) {
    const def = SEGMENTS.no_crm

    // Bonus: if they also lack automation, even higher priority
    let score = def.score
    if (automationTools.length === 0) {
      score = Math.min(100, score + 3)
    }

    return {
      segment: def.segment,
      label: def.label,
      score,
      reason: 'No CRM or marketing platform detected on their website.',
      suggestedAction: def.suggestedAction,
      detectedCRMs,
      detectedAutomation,
    }
  }

  // Find the highest-confidence CRM
  const topCRM = crmTools.reduce((best, curr) =>
    curr.confidence > best.confidence ? curr : best
  )

  // Map to known segment or fall through to other_crm
  const segmentName: SegmentName =
    CRM_SEGMENT_MAP[topCRM.name] ?? 'other_crm'
  const def = SEGMENTS[segmentName]

  // Adjust score based on stack complexity
  let score = def.score
  // Multiple CRMs = messy stack = opportunity
  if (crmTools.length > 1) {
    score = Math.min(100, score + 5)
  }
  // Lots of automation = sophisticated user = harder sell
  if (automationTools.length > 3) {
    score = Math.max(0, score - 5)
  }

  const reason =
    segmentName === 'other_crm'
      ? `Detected ${topCRM.name} (${topCRM.confidence}% confidence). Not a major CRM.`
      : `Detected ${topCRM.name} (${topCRM.confidence}% confidence)${
          crmTools.length > 1
            ? ` + ${crmTools.length - 1} other CRM(s)`
            : ''
        }.`

  return {
    segment: segmentName,
    label: def.label,
    score,
    reason,
    suggestedAction: def.suggestedAction,
    detectedCRMs,
    detectedAutomation,
  }
}
