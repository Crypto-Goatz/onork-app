/**
 * Engine Context Builder — assembles the complete K-layer context
 * for a given location/user so the 0nAI Engine has full awareness.
 */

import { createClient } from '@supabase/supabase-js'
import { crmGet, getAuthForLocation } from '../crm'
import { trustState } from '../security/score'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EngineContext {
  // K1: Platform
  platformCapabilities: string[]

  // K2: Brand
  brandName: string
  brandVoice: string
  brandColors: string
  brandTone: string

  // K3: Company
  companyName: string
  industry: string
  services: string[]
  hours: string
  phone: string
  website: string
  faqs: string[]

  // K4: Security
  trustScore: number
  trustState: string
  securityLevel: 'low' | 'default' | 'strict'

  // Location data
  locationId: string
  connectedPlatforms: string[]
  pipelineStages: string[]
  contactCount: number
  recentActivity: string[]
}

// ---------------------------------------------------------------------------
// K1: Platform Capabilities
// ---------------------------------------------------------------------------

const PLATFORM_CAPABILITIES = [
  'Create automations / workflows',
  'Build websites and landing pages',
  'Manage contacts and pipelines',
  'Send emails and SMS',
  'Post to social media',
  'Configure voice AI agents',
  'Build forms and surveys',
  'Create funnels and sales pages',
  'Set up email sequences and drip campaigns',
  'Manage calendars and appointments',
  'Create invoices and process payments',
  'Set up reputation management',
  'Configure chatbots and live chat',
  'Build courses and memberships',
  'Manage domains and DNS',
  'Set up tracking and analytics',
  'Create WordPress sites',
  'Import/export data',
  'Connect third-party integrations (1,554 tools via 0nMCP)',
]

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export async function buildEngineContext(
  locationId: string,
  userId: string
): Promise<EngineContext> {
  const admin = getAdmin()

  // Fetch profile, security score, and recent activity in parallel
  const [profileResult, scoreResult, activityResult] = await Promise.all([
    admin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single(),
    admin
      .from('security_sessions')
      .select('trust_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from('bridge_executions')
      .select('action, intent, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const profile = profileResult.data || {}

  // Extract brand board data (stored in profile JSON fields)
  const brandBoard = profile.brand_board || {}
  const companyInfo = profile.company_info || {}

  // K2: Brand
  const brandName = brandBoard.name || companyInfo.company_name || profile.company_name || ''
  const brandVoice = brandBoard.voice || 'professional and helpful'
  const brandColors = brandBoard.colors
    ? (Array.isArray(brandBoard.colors) ? brandBoard.colors.join(', ') : brandBoard.colors)
    : '#7ed957'
  const brandTone = brandBoard.tone || 'friendly'

  // K3: Company
  const companyName = companyInfo.company_name || profile.company_name || brandName || 'Your Business'
  const industry = companyInfo.industry || profile.industry || 'general'
  const services: string[] = companyInfo.services || profile.services || []
  const hours = companyInfo.hours || profile.business_hours || ''
  const phone = companyInfo.phone || profile.phone || ''
  const website = companyInfo.website || profile.website || ''
  const faqs: string[] = companyInfo.faqs || []

  // K4: Security
  const rawScore = scoreResult.data?.trust_score ?? 100
  const currentTrustState = trustState(rawScore)

  // Determine security level from settings or default
  const { data: settings } = await admin
    .from('engine_settings')
    .select('security_level')
    .eq('user_id', userId)
    .maybeSingle()

  const securityLevel = (settings?.security_level as 'low' | 'default' | 'strict') || 'default'

  // CRM data — fetch connected platforms and pipeline info
  let connectedPlatforms: string[] = []
  let pipelineStages: string[] = []
  let contactCount = 0

  if (locationId) {
    try {
      const [pipelinesRes, contactsRes, socialRes] = await Promise.allSettled([
        crmGet(`/opportunities/pipelines?locationId=${locationId}`, locationId).then(r => r.ok ? r.json() : null),
        crmGet(`/contacts/?locationId=${locationId}&limit=1`, locationId).then(r => r.ok ? r.json() : null),
        crmGet(`/social-media-posting/${locationId}/accounts`, locationId).then(r => r.ok ? r.json() : null),
      ])

      // Pipeline stages
      if (pipelinesRes.status === 'fulfilled' && pipelinesRes.value?.pipelines) {
        const pipelines = pipelinesRes.value.pipelines
        for (const p of pipelines) {
          if (p.stages) {
            pipelineStages.push(...p.stages.map((s: { name: string }) => s.name))
          }
        }
      }

      // Contact count
      if (contactsRes.status === 'fulfilled' && contactsRes.value?.meta) {
        contactCount = contactsRes.value.meta.total || 0
      }

      // Connected social accounts
      if (socialRes.status === 'fulfilled' && socialRes.value?.accounts) {
        connectedPlatforms = socialRes.value.accounts.map(
          (a: { platform: string }) => a.platform
        )
      }
    } catch {
      // CRM may not be connected — that's fine
    }

    // Add CRM itself as a connected platform
    try {
      await getAuthForLocation(locationId)
      connectedPlatforms.unshift('CRM')
    } catch {
      // No CRM connection
    }
  }

  // Google integration — check if user has connected Google OAuth
  const googleTokens = profile.google_tokens as Record<string, string> | null
  if (googleTokens?.access_token || googleTokens?.refresh_token) {
    const googleServices = ['Google Analytics', 'Gmail', 'Google Drive', 'Google Sheets', 'Google Calendar', 'Google Docs', 'Search Console', 'Google Tasks']
    connectedPlatforms.push(...googleServices)
  }

  // Service account — adds Analytics + Search Console
  const saKey = profile.google_sa_key as Record<string, string> | null
  if (saKey?.client_email && !googleTokens?.access_token) {
    connectedPlatforms.push('Google Analytics (SA)', 'Search Console (SA)')
  }

  // Recent activity
  const recentActivity: string[] = (activityResult.data || []).map(
    (row: { action: string; intent: string; created_at: string }) =>
      `${row.action}: ${row.intent?.slice(0, 80) || 'no details'}`
  )

  return {
    platformCapabilities: PLATFORM_CAPABILITIES,
    brandName,
    brandVoice,
    brandColors,
    brandTone,
    companyName,
    industry,
    services,
    hours,
    phone,
    website,
    faqs,
    trustScore: rawScore,
    trustState: currentTrustState,
    securityLevel,
    locationId,
    connectedPlatforms,
    pipelineStages,
    contactCount,
    recentActivity,
  }
}
