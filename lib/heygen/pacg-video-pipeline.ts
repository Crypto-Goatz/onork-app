/**
 * PACG Video Pipeline — Personalized Adaptive Content Generation
 *
 * Knowledge Layers (K1-K7), archetype classifiers,
 * LVOS Thompson Sampling variant selection,
 * Supabase video record management, and the main pipeline runner.
 */

import { createClient } from '@supabase/supabase-js'
import { createAvatarVideo } from './client'
import type {
  VideoStatus,
  SeniorityTier,
  OrgSizeTier,
  ProfessionalProfile,
  LVOSVariant,
  PACGVideoResult,
} from './types'

// ── Supabase admin client ────────────────────────────────────────

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ── Knowledge Layers (K1-K7) ────────────────────────────────────

export const KNOWLEDGE_LAYERS = {
  K1_IDENTITY: {
    id: 'K1',
    label: 'Identity',
    description: 'Name, title, company — personalization anchors',
    extract: (p: ProfessionalProfile) => ({
      name: p.name,
      title: p.title,
      company: p.company,
    }),
  },
  K2_CONTEXT: {
    id: 'K2',
    label: 'Context',
    description: 'Industry, company size, seniority — archetype classifiers',
    extract: (p: ProfessionalProfile) => ({
      industry: p.industry,
      companySize: p.companySize,
      yearsExperience: p.yearsExperience,
    }),
  },
  K3_PAIN: {
    id: 'K3',
    label: 'Pain Points',
    description: 'Known challenges and bottlenecks',
    extract: (p: ProfessionalProfile) => ({
      painPoints: p.painPoints ?? [],
    }),
  },
  K4_STACK: {
    id: 'K4',
    label: 'Tech Stack',
    description: 'Current tools and integrations',
    extract: (p: ProfessionalProfile) => ({
      techStack: p.techStack ?? [],
    }),
  },
  K5_SOCIAL: {
    id: 'K5',
    label: 'Social Proof',
    description: 'LinkedIn presence, public signals',
    extract: (p: ProfessionalProfile) => ({
      linkedinUrl: p.linkedinUrl,
    }),
  },
  K6_TIMING: {
    id: 'K6',
    label: 'Timing',
    description: 'When the video is being sent — day/time context',
    extract: () => {
      const now = new Date()
      const hour = now.getUTCHours()
      const dayOfWeek = now.getUTCDay()
      return {
        hour,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
      }
    },
  },
  K7_HISTORY: {
    id: 'K7',
    label: 'History',
    description: 'Past video interactions and engagement',
    extract: async (p: ProfessionalProfile) => {
      if (!p.contactId) return { previousVideos: 0 }
      const { count } = await getAdmin()
        .from('heygen_videos')
        .select('*', { count: 'exact', head: true })
        .eq('contact_id', p.contactId)
      return { previousVideos: count ?? 0 }
    },
  },
} as const

// ── Archetype Classifiers ───────────────────────────────────────

export function classifySeniority(profile: ProfessionalProfile): SeniorityTier {
  const title = (profile.title ?? '').toLowerCase()
  const yoe = profile.yearsExperience ?? 0

  if (/\b(founder|co-founder|owner)\b/.test(title)) return 'Founder'
  if (/\b(ceo|cto|cfo|coo|cmo|cio|cpo|chief)\b/.test(title)) return 'C-Suite'
  if (/\b(vp|vice president|svp|evp)\b/.test(title)) return 'VP'
  if (/\b(director|head of)\b/.test(title)) return 'Director'
  if (/\b(manager|lead|supervisor|team lead)\b/.test(title)) return 'Manager'

  // Fallback by years of experience
  if (yoe >= 15) return 'Director'
  if (yoe >= 8) return 'Manager'
  return 'IC'
}

export function classifyOrgSize(profile: ProfessionalProfile): OrgSizeTier {
  const size = profile.companySize ?? 0
  if (size <= 1) return 'Solo'
  if (size <= 10) return 'Startup'
  if (size <= 200) return 'SMB'
  if (size <= 2000) return 'Mid-Market'
  return 'Enterprise'
}

// ── Default Variant Pool ────────────────────────────────────────

const DEFAULT_VARIANTS: LVOSVariant[] = [
  {
    id: 'roi-60',
    label: 'ROI-Focused 60s',
    scriptTemplate: `Hi {{name}}, I know that as {{title}} at {{company}}, driving measurable results in {{industry}} is everything. What if you could automate your entire workflow stack — and see ROI in the first week? That's exactly what 0nMCP delivers. Let me show you how.`,
    avatarId: 'default',
    voiceId: 'default',
    durationSeconds: 60,
    seniorityTargets: ['C-Suite', 'VP', 'Founder'],
    orgSizeTargets: ['SMB', 'Mid-Market', 'Enterprise'],
    alpha: 1,
    beta: 1,
    impressions: 0,
    conversions: 0,
  },
  {
    id: 'pain-45',
    label: 'Pain Point 45s',
    scriptTemplate: `Hey {{name}} — I noticed {{company}} is working with {{techStack}}. Most {{title}}s in {{industry}} tell us the same thing: too many tools, too much manual work. 0nMCP connects all of them with one command. Want to see it in action?`,
    avatarId: 'default',
    voiceId: 'default',
    durationSeconds: 45,
    seniorityTargets: ['Manager', 'Director', 'IC'],
    orgSizeTargets: ['Startup', 'SMB', 'Mid-Market'],
    alpha: 1,
    beta: 1,
    impressions: 0,
    conversions: 0,
  },
  {
    id: 'founder-30',
    label: 'Founder Quick Pitch 30s',
    scriptTemplate: `{{name}}, building {{company}} means wearing every hat. What if one tool handled your CRM, email, social, payments, and more — all orchestrated by AI? That's 0nMCP. 1,554 tools. One command. Let's talk.`,
    avatarId: 'default',
    voiceId: 'default',
    durationSeconds: 30,
    seniorityTargets: ['Founder', 'C-Suite'],
    orgSizeTargets: ['Solo', 'Startup'],
    alpha: 1,
    beta: 1,
    impressions: 0,
    conversions: 0,
  },
  {
    id: 'enterprise-90',
    label: 'Enterprise Deep Dive 90s',
    scriptTemplate: `Hello {{name}}. At {{company}}, with {{companySize}} employees across {{industry}}, you need infrastructure that scales — not another point solution. 0nMCP orchestrates 96 services through a single protocol. It's patent-pending, SOC2-ready, and already trusted by teams like yours. I'd love to walk you through the architecture.`,
    avatarId: 'default',
    voiceId: 'default',
    durationSeconds: 90,
    seniorityTargets: ['VP', 'C-Suite', 'Director'],
    orgSizeTargets: ['Mid-Market', 'Enterprise'],
    alpha: 1,
    beta: 1,
    impressions: 0,
    conversions: 0,
  },
]

// ── LVOS Thompson Sampling ──────────────────────────────────────

function sampleBeta(alpha: number, beta: number): number {
  // Jinka approximation for Beta distribution sampling
  const a = alpha - 1 / 3
  const b = beta - 1 / 3
  if (a <= 0 || b <= 0) return Math.random()

  // Use the ratio of gamma variates approach
  const gammaA = gammaVariate(alpha)
  const gammaB = gammaVariate(beta)
  return gammaA / (gammaA + gammaB)
}

function gammaVariate(shape: number): number {
  // Marsaglia and Tsang's method
  if (shape < 1) {
    return gammaVariate(shape + 1) * Math.pow(Math.random(), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let x: number, v: number
    do {
      x = normalVariate()
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

function normalVariate(): number {
  // Box-Muller transform
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

async function getVariantPool(
  seniority: SeniorityTier,
  orgSize: OrgSizeTier
): Promise<LVOSVariant[]> {
  // Try loading variants from Supabase
  try {
    const { data } = await getAdmin()
      .from('heygen_variants')
      .select('*')
      .eq('active', true)

    if (data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        label: row.label,
        scriptTemplate: row.script_template,
        avatarId: row.avatar_id,
        voiceId: row.voice_id,
        durationSeconds: row.duration_seconds,
        seniorityTargets: row.seniority_targets ?? [],
        orgSizeTargets: row.org_size_targets ?? [],
        alpha: row.alpha ?? 1,
        beta: row.beta ?? 1,
        impressions: row.impressions ?? 0,
        conversions: row.conversions ?? 0,
      }))
    }
  } catch {
    // Fall through to defaults
  }

  // Filter defaults by archetype match
  return DEFAULT_VARIANTS.filter(
    (v) =>
      v.seniorityTargets.includes(seniority) &&
      v.orgSizeTargets.includes(orgSize)
  )
}

function selectVariant(
  variants: LVOSVariant[],
  seniority: SeniorityTier,
  orgSize: OrgSizeTier
): LVOSVariant {
  if (variants.length === 0) {
    // No match — pick from full defaults
    return DEFAULT_VARIANTS[0]
  }

  // Filter to matching archetypes, then Thompson-sample
  const matching = variants.filter(
    (v) =>
      v.seniorityTargets.includes(seniority) &&
      v.orgSizeTargets.includes(orgSize)
  )

  const pool = matching.length > 0 ? matching : variants

  let best: LVOSVariant = pool[0]
  let bestScore = -1

  for (const variant of pool) {
    const score = sampleBeta(variant.alpha, variant.beta)
    if (score > bestScore) {
      bestScore = score
      best = variant
    }
  }

  return best
}

// ── Script Personalization ──────────────────────────────────────

function personalizeScript(
  template: string,
  profile: ProfessionalProfile
): string {
  const replacements: Record<string, string> = {
    '{{name}}': profile.name,
    '{{title}}': profile.title,
    '{{company}}': profile.company,
    '{{industry}}': profile.industry,
    '{{companySize}}': String(profile.companySize ?? 'your'),
    '{{techStack}}': (profile.techStack ?? []).join(', ') || 'your current tools',
    '{{email}}': profile.email ?? '',
  }

  let script = template
  for (const [key, value] of Object.entries(replacements)) {
    script = script.replaceAll(key, value)
  }
  return script
}

// ── Supabase Video Records ──────────────────────────────────────

async function insertVideoRecord(opts: {
  executionId: string
  videoId: string
  contactId?: string
  locationId?: string
  variantId: string
  script: string
  seniorityTier: SeniorityTier
  orgSizeTier: OrgSizeTier
  activatedLayers: string[]
  status: VideoStatus
}) {
  await getAdmin().from('heygen_videos').insert({
    id: opts.executionId,
    video_id: opts.videoId,
    contact_id: opts.contactId ?? null,
    location_id: opts.locationId ?? null,
    variant_id: opts.variantId,
    personalized_script: opts.script,
    seniority_tier: opts.seniorityTier,
    org_size_tier: opts.orgSizeTier,
    activated_layers: opts.activatedLayers,
    status: opts.status,
    created_at: new Date().toISOString(),
  })
}

async function updateVideoRecord(
  executionId: string,
  updates: Record<string, unknown>
) {
  await getAdmin()
    .from('heygen_videos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', executionId)
}

export async function getVideoRecord(executionId: string) {
  const { data } = await getAdmin()
    .from('heygen_videos')
    .select('*')
    .eq('id', executionId)
    .maybeSingle()
  return data
}

// ── Variant stats update ────────────────────────────────────────

async function recordImpression(variantId: string) {
  try {
    await getAdmin().rpc('increment_heygen_variant_impressions', {
      p_variant_id: variantId,
    })
  } catch {
    // Non-critical — variant stats table may not exist yet
  }
}

// ── Main Pipeline ───────────────────────────────────────────────

export async function runPACGVideoPipeline(
  profile: ProfessionalProfile,
  opts?: {
    testMode?: boolean
    forceVariantId?: string
    avatarIdOverride?: string
    voiceIdOverride?: string
  }
): Promise<PACGVideoResult> {
  const start = Date.now()
  const executionId = crypto.randomUUID()
  const activatedLayers: string[] = []

  // ── Step 1: Classify archetype ──
  const seniorityTier = classifySeniority(profile)
  const orgSizeTier = classifyOrgSize(profile)

  // ── Step 2: Activate knowledge layers ──
  const k1 = KNOWLEDGE_LAYERS.K1_IDENTITY.extract(profile)
  if (k1.name) activatedLayers.push('K1_IDENTITY')

  const k2 = KNOWLEDGE_LAYERS.K2_CONTEXT.extract(profile)
  if (k2.industry) activatedLayers.push('K2_CONTEXT')

  const k3 = KNOWLEDGE_LAYERS.K3_PAIN.extract(profile)
  if ((k3.painPoints as string[]).length > 0) activatedLayers.push('K3_PAIN')

  const k4 = KNOWLEDGE_LAYERS.K4_STACK.extract(profile)
  if ((k4.techStack as string[]).length > 0) activatedLayers.push('K4_STACK')

  const k5 = KNOWLEDGE_LAYERS.K5_SOCIAL.extract(profile)
  if (k5.linkedinUrl) activatedLayers.push('K5_SOCIAL')

  KNOWLEDGE_LAYERS.K6_TIMING.extract()
  activatedLayers.push('K6_TIMING')

  const k7 = await KNOWLEDGE_LAYERS.K7_HISTORY.extract(profile)
  if ((k7.previousVideos as number) > 0) activatedLayers.push('K7_HISTORY')

  // ── Step 3: Select variant via Thompson Sampling ──
  const variantPool = await getVariantPool(seniorityTier, orgSizeTier)
  let variant: LVOSVariant

  if (opts?.forceVariantId) {
    variant =
      variantPool.find((v) => v.id === opts.forceVariantId) ??
      variantPool[0] ??
      DEFAULT_VARIANTS[0]
  } else {
    variant = selectVariant(variantPool, seniorityTier, orgSizeTier)
  }

  // Apply overrides
  if (opts?.avatarIdOverride) variant = { ...variant, avatarId: opts.avatarIdOverride }
  if (opts?.voiceIdOverride) variant = { ...variant, voiceId: opts.voiceIdOverride }

  // ── Step 4: Personalize script ──
  const personalizedScript = personalizeScript(variant.scriptTemplate, profile)

  // ── Step 5: Send to HeyGen ──
  const videoId = await createAvatarVideo({
    avatarId: variant.avatarId,
    voiceId: variant.voiceId,
    script: personalizedScript,
    test: opts?.testMode ?? false,
  })

  // ── Step 6: Record in Supabase ──
  await insertVideoRecord({
    executionId,
    videoId,
    contactId: profile.contactId,
    locationId: profile.locationId,
    variantId: variant.id,
    script: personalizedScript,
    seniorityTier,
    orgSizeTier,
    activatedLayers,
    status: 'generating',
  })

  // ── Step 7: Record impression for Thompson Sampling ──
  await recordImpression(variant.id)

  const pipelineMs = Date.now() - start

  return {
    executionId,
    videoId,
    status: 'generating',
    variant,
    personalizedScript,
    seniorityTier,
    orgSizeTier,
    activatedLayers,
    pipelineMs,
    createdAt: new Date().toISOString(),
  }
}

export { updateVideoRecord }
