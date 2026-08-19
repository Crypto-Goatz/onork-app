/**
 * 0nCore → 0nMCP bridge for the landing-pages add-on.
 *
 * Today this is an in-process bridge — 0nCore imports the same
 * theme registry and generator that 0nMCP exposes. When we ship the
 * proxy model (every tool call = 1 metered unit), this file becomes
 * the only place that decides "embedded vs proxy" so the rest of the
 * dashboard never changes.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b'

export interface ThemeSummary {
  id: string
  name: string
  description: string
  source: string
  preview_url: string
  fonts: { heading: string; body: string }
  section_count: number
  primary_color: string
}

export interface KLayer {
  brand_name?: string
  tagline?: string
  voice?: string
  icp_description?: string
  value_prop?: string
  keywords?: string[]
}

export interface ThemeFull extends ThemeSummary {
  tokens: Record<string, string>
  sections: string[]
}

// Mirror of 0nMCP/landing_pages/themes/registry.js — duplicated here so the
// 0nCore Next.js bundle doesn't have to require the npm package at runtime.
// When we ship the proxy model, this disappears in favor of an HTTP call.
export const THEMES: Record<string, ThemeFull> = {
  'shadcn-default': {
    id: 'shadcn-default', name: 'Default',
    description: 'Neutral, professional, foundational.',
    source: 'shadcn.io/theme/default',
    preview_url: 'https://ui.shadcn.com',
    tokens: { background: 'oklch(1 0 0)', foreground: 'oklch(0.145 0 0)', primary: 'oklch(0.205 0 0)', 'primary-foreground': 'oklch(0.985 0 0)', secondary: 'oklch(0.97 0 0)', muted: 'oklch(0.97 0 0)', accent: 'oklch(0.97 0 0)', destructive: 'oklch(0.577 0.245 27.325)', border: 'oklch(0.922 0 0)', ring: 'oklch(0.708 0 0)', radius: '0.625rem' },
    fonts: { heading: 'Inter', body: 'Inter' },
    sections: ['hero', 'logo_cloud', 'features_grid', 'social_proof', 'pricing_table', 'cta_band', 'footer'],
    section_count: 7,
    primary_color: 'oklch(0.205 0 0)',
  },
  'shadcn-new-york': {
    id: 'shadcn-new-york', name: 'New York',
    description: 'Tighter spacing, sharper typography, editorial feel.',
    source: 'shadcn.io/theme/new-york',
    preview_url: 'https://ui.shadcn.com',
    tokens: { background: 'oklch(1 0 0)', foreground: 'oklch(0.141 0.005 285.823)', primary: 'oklch(0.21 0.006 285.885)', 'primary-foreground': 'oklch(0.985 0 0)', secondary: 'oklch(0.967 0.001 286.375)', muted: 'oklch(0.967 0.001 286.375)', accent: 'oklch(0.967 0.001 286.375)', destructive: 'oklch(0.637 0.237 25.331)', border: 'oklch(0.92 0.004 286.32)', ring: 'oklch(0.871 0.006 286.286)', radius: '0.5rem' },
    fonts: { heading: 'Inter', body: 'Inter' },
    sections: ['hero_split', 'feature_strip', 'testimonial_block', 'pricing_compare', 'faq_accordion', 'cta_band', 'footer'],
    section_count: 7,
    primary_color: 'oklch(0.21 0.006 285.885)',
  },
  'shadcn-rose': {
    id: 'shadcn-rose', name: 'Rose',
    description: 'Warm rose accent — consumer / lifestyle / creator brands.',
    source: 'shadcn.io/theme/rose',
    preview_url: 'https://ui.shadcn.com',
    tokens: { background: 'oklch(1 0 0)', foreground: 'oklch(0.141 0.005 285.823)', primary: 'oklch(0.645 0.246 16.439)', 'primary-foreground': 'oklch(0.969 0.015 12.422)', secondary: 'oklch(0.967 0.001 286.375)', muted: 'oklch(0.967 0.001 286.375)', accent: 'oklch(0.967 0.001 286.375)', destructive: 'oklch(0.637 0.237 25.331)', border: 'oklch(0.92 0.004 286.32)', ring: 'oklch(0.645 0.246 16.439)', radius: '0.625rem' },
    fonts: { heading: 'Geist', body: 'Geist' },
    sections: ['hero_centered', 'media_split', 'features_grid', 'testimonial_grid', 'pricing_table', 'newsletter_cta', 'footer'],
    section_count: 7,
    primary_color: 'oklch(0.645 0.246 16.439)',
  },
  'shadcn-violet': {
    id: 'shadcn-violet', name: 'Violet',
    description: 'Bold violet primary, modern SaaS / dev-tool aesthetic.',
    source: 'shadcn.io/theme/violet',
    preview_url: 'https://ui.shadcn.com',
    tokens: { background: 'oklch(1 0 0)', foreground: 'oklch(0.141 0.005 285.823)', primary: 'oklch(0.541 0.281 293.009)', 'primary-foreground': 'oklch(0.969 0.016 293.756)', secondary: 'oklch(0.967 0.001 286.375)', muted: 'oklch(0.967 0.001 286.375)', accent: 'oklch(0.967 0.001 286.375)', destructive: 'oklch(0.637 0.237 25.331)', border: 'oklch(0.92 0.004 286.32)', ring: 'oklch(0.541 0.281 293.009)', radius: '0.75rem' },
    fonts: { heading: 'Geist', body: 'Geist' },
    sections: ['hero_split', 'logo_cloud', 'feature_bento', 'integration_grid', 'pricing_compare', 'cta_band', 'footer'],
    section_count: 7,
    primary_color: 'oklch(0.541 0.281 293.009)',
  },
  'shadcn-zinc-dark': {
    id: 'shadcn-zinc-dark', name: 'Zinc Dark',
    description: 'Dark-first, cold zinc palette — developer / infra / AI feel.',
    source: 'shadcn.io/theme/zinc',
    preview_url: 'https://ui.shadcn.com',
    tokens: { background: 'oklch(0.141 0.005 285.823)', foreground: 'oklch(0.985 0 0)', primary: 'oklch(0.92 0.004 286.32)', 'primary-foreground': 'oklch(0.21 0.006 285.885)', secondary: 'oklch(0.274 0.006 286.033)', muted: 'oklch(0.274 0.006 286.033)', accent: 'oklch(0.274 0.006 286.033)', destructive: 'oklch(0.396 0.141 25.723)', border: 'oklch(0.274 0.006 286.033)', ring: 'oklch(0.871 0.006 286.286)', radius: '0.5rem' },
    fonts: { heading: 'Geist Mono', body: 'Geist' },
    sections: ['hero_minimal', 'code_block', 'features_grid', 'metric_strip', 'testimonial_block', 'pricing_table', 'cta_terminal', 'footer'],
    section_count: 8,
    primary_color: 'oklch(0.92 0.004 286.32)',
  },
}

export function listThemes(): ThemeSummary[] {
  return Object.values(THEMES).map(({ id, name, description, source, preview_url, fonts, section_count, primary_color }) => ({
    id, name, description, source, preview_url, fonts, section_count, primary_color,
  }))
}

export function getTheme(id: string): ThemeFull | null {
  return THEMES[id] || null
}

export interface GeneratedContent {
  theme_id: string
  theme_name: string
  sections_requested: string[]
  content: { sections: Record<string, unknown> }
}

const SYSTEM = `You write conversion-focused landing page copy. Output valid JSON only — no preamble, no markdown fences. Match the user's brand voice exactly. Each section must be punchy, specific, and action-oriented. Avoid filler.`

const SECTION_GUIDE = `Each section schema:
- hero / hero_split / hero_centered / hero_minimal: { eyebrow?, headline, subheadline, primary_cta: { label, href }, secondary_cta?: { label, href } }
- logo_cloud: { label, logos: [{ name, alt }] (5-8 items) }
- features_grid / feature_bento: { eyebrow, headline, items: [{ title, body, icon }] (3-6) }
- feature_strip: { headline, items: [{ title, body }] (3) }
- social_proof / testimonial_block / testimonial_grid: { headline, testimonials: [{ quote, author, role, company }] (1-4) }
- pricing_table / pricing_compare: { headline, subheadline, tiers: [{ name, price, period, description, features: [string], cta: { label, href }, featured?: boolean }] (3) }
- faq_accordion: { headline, items: [{ q, a }] (5-7) }
- cta_band / cta_terminal / newsletter_cta: { headline, subheadline?, cta: { label, href }, secondary?: { label, href } }
- metric_strip: { items: [{ value, label }] (3-4) }
- code_block: { headline, language, code, caption? }
- integration_grid: { headline, items: [{ name, logo_alt, description }] (6-12) }
- media_split: { eyebrow, headline, body, image_prompt, cta?: { label, href } }
- footer: { columns: [{ heading, links: [{ label, href }] }], copyright }`

export async function generateContent(themeId: string, k: KLayer, sectionsOverride?: string[]): Promise<GeneratedContent> {
  const theme = getTheme(themeId)
  if (!theme) throw new Error(`Unknown theme: ${themeId}`)
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const sections = sectionsOverride || theme.sections

  const prompt = `Theme: ${theme.name} — ${theme.description}
Brand: ${k.brand_name || 'Unnamed Brand'}
Tagline: ${k.tagline || ''}
Voice: ${k.voice || 'professional'}
ICP: ${k.icp_description || ''}
Value prop: ${k.value_prop || ''}
Keywords: ${(k.keywords || []).join(', ')}

Generate JSON for this exact section list, in order: ${JSON.stringify(sections)}

${SECTION_GUIDE}

Output: { "sections": { ... } }`

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`)
  const json = await res.json()
  const text = json.choices?.[0]?.message?.content || '{}'
  let content
  try { content = JSON.parse(text) } catch { content = { sections: {} } }

  return {
    theme_id: themeId,
    theme_name: theme.name,
    sections_requested: sections,
    content,
  }
}
