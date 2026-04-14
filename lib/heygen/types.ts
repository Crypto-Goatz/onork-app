/**
 * HeyGen PACG Video Pipeline — Type Definitions
 *
 * All types for the Personalized Adaptive Content Generation pipeline:
 * video status, seniority/org tiers, professional profiles, LVOS variants,
 * pipeline results, and HeyGen API response shapes.
 */

// ── Video lifecycle ──────────────────────────────────────────────
export type VideoStatus =
  | 'queued'
  | 'generating'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'expired'

// ── Archetype classifiers ────────────────────────────────────────
export type SeniorityTier =
  | 'IC'          // Individual Contributor
  | 'Manager'
  | 'Director'
  | 'VP'
  | 'C-Suite'
  | 'Founder'

export type OrgSizeTier =
  | 'Solo'        // 1
  | 'Startup'     // 2-10
  | 'SMB'         // 11-200
  | 'Mid-Market'  // 201-2000
  | 'Enterprise'  // 2001+

// ── Professional profile (input to pipeline) ─────────────────────
export interface ProfessionalProfile {
  /** CRM contact ID */
  contactId?: string
  /** Full name */
  name: string
  /** Job title */
  title: string
  /** Company name */
  company: string
  /** Industry vertical */
  industry: string
  /** Company employee count (used to derive OrgSizeTier) */
  companySize?: number
  /** Years of experience (used to derive SeniorityTier) */
  yearsExperience?: number
  /** LinkedIn URL */
  linkedinUrl?: string
  /** Email */
  email?: string
  /** Known pain points / interests */
  painPoints?: string[]
  /** Tech stack they use */
  techStack?: string[]
  /** CRM location ID (for webhook sync) */
  locationId?: string
}

// ── LVOS (Layered Video Optimization Strategy) variant ───────────
export interface LVOSVariant {
  id: string
  /** Human label, e.g. "ROI-Focused 60s" */
  label: string
  /** Script template with {{placeholders}} */
  scriptTemplate: string
  /** HeyGen avatar ID */
  avatarId: string
  /** HeyGen voice ID */
  voiceId: string
  /** Target duration in seconds */
  durationSeconds: number
  /** Which seniority tiers this variant targets */
  seniorityTargets: SeniorityTier[]
  /** Which org-size tiers this variant targets */
  orgSizeTargets: OrgSizeTier[]
  /** Thompson Sampling: alpha (successes + 1) */
  alpha: number
  /** Thompson Sampling: beta (failures + 1) */
  beta: number
  /** Total times this variant was served */
  impressions: number
  /** Total conversions attributed */
  conversions: number
}

// ── Pipeline output ──────────────────────────────────────────────
export interface PACGVideoResult {
  /** Unique execution ID */
  executionId: string
  /** HeyGen video ID */
  videoId: string
  /** Current status */
  status: VideoStatus
  /** URL to the rendered video (available after completion) */
  videoUrl?: string
  /** URL to thumbnail */
  thumbnailUrl?: string
  /** The variant that was selected */
  variant: LVOSVariant
  /** Personalized script that was sent to HeyGen */
  personalizedScript: string
  /** Derived seniority tier */
  seniorityTier: SeniorityTier
  /** Derived org-size tier */
  orgSizeTier: OrgSizeTier
  /** Knowledge layers that were activated */
  activatedLayers: string[]
  /** Pipeline timing in ms */
  pipelineMs: number
  /** ISO timestamp */
  createdAt: string
}

// ── HeyGen API response shapes ──────────────────────────────────
export interface HeyGenVideoStatusData {
  video_id: string
  status: string
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: { code: string; message: string }
  created_at?: number
}

export interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  gender: string
  preview_image_url: string
  preview_video_url?: string
}

export interface HeyGenVoice {
  voice_id: string
  language: string
  gender: string
  name: string
  preview_audio: string
  support_pause: boolean
  emotion_support: boolean
}
