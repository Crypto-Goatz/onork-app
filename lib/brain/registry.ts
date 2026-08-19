/**
 * Brain Registry — the source of truth for what's actually AI vs automation.
 *
 * Every add-on / surface in the product is registered here. Each entry
 * declares its CATEGORY (honest label) and its handler files. The CI lint
 * (scripts/truth-lint.mjs) reads this file, opens each handler, and verifies:
 *
 *   - category 'ai'         — handler MUST import @/lib/brain and call think()/record()
 *                             handler MUST NOT import @anthropic-ai/sdk (Groq-only rule)
 *   - category 'automation' — no AI claim made; can use any tooling, no badge
 *   - category 'crud'       — pure data plumbing; no AI badge anywhere
 *
 * If a route claims AI in the UI (sidebar badge, marketplace_apps row, etc.)
 * and is registered here as 'ai', the lint fails the build if the imports
 * don't match. That's how lying about AI becomes a build error.
 *
 * Adding a new add-on:
 *   1. Add the row here with the honest category
 *   2. If 'ai': add an app_briefs row in the DB with the same slug
 *   3. Wire the handler through lib/brain.think + record
 *   4. Run `npm run truth-lint` locally — should pass
 */

export type AddonCategory = 'ai' | 'automation' | 'crud'

export interface RegistryEntry {
  slug: string
  display_name: string
  category: AddonCategory
  /** Handler files that must satisfy the contract for the category. Globs supported via simple * wildcards. */
  handler_paths: string[]
  /** Imports the handler must contain (when category='ai'). */
  required_imports?: string[]
  /** Imports the handler must NOT contain. Hard rule: '@anthropic-ai/sdk' for AI category. */
  prohibited_imports?: string[]
  /** Function calls that must appear in the source. e.g. ['think(', 'record('] for AI. */
  required_calls?: string[]
  /** Where the user lands in the UI. */
  surface_route?: string
  /** Short marketing line shown on the truth dashboard. */
  description?: string
}

export const BRAIN_REGISTRY: RegistryEntry[] = [
  // ── AI category — must use lib/brain ───────────────────────────────
  {
    slug: 'notes',
    display_name: 'Notes',
    category: 'ai',
    handler_paths: ['app/api/notes/think/route.ts'],
    required_imports: ['@/lib/brain'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['think(', 'record('],
    surface_route: '/dashboard/notes',
    description: 'Drop any thought — brain renders it inline as a flowchart, mind map, diagram, doc, or tagged note. No third-party tools.',
  },

  // ── AI surfaces — all route through /api/<slug>/think (handleThink helper) ──
  {
    slug: 'course_builder',
    display_name: 'Course Builder',
    category: 'ai',
    handler_paths: ['app/api/courses/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/dashboard/courses',
    description: 'Conversational course generation.',
  },
  {
    slug: 'hipaa_scanner',
    display_name: 'HIPAA Scanner',
    category: 'ai',
    handler_paths: ['app/api/hipaa/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/dashboard/hipaa',
    description: 'Compliance scanning with weighted scoring.',
  },
  {
    slug: 'cro9_engine',
    display_name: 'CRO9 SEO',
    category: 'ai',
    handler_paths: ['app/api/cro9/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/dashboard/cro9-engine',
    description: 'Adaptive SEO scoring + keyword tracking.',
  },
  {
    slug: 'business_profile',
    display_name: 'Business Profile',
    category: 'ai',
    handler_paths: ['app/api/business-profile/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/profile',
    description: 'Writes LinkedIn profiles, company pages and boilerplate from your saved company facts — and refuses when the profile is too thin to be truthful.',
  },
  {
    slug: 'brand_builder',
    display_name: 'Brand Builder',
    category: 'ai',
    handler_paths: ['app/api/brand/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/dashboard/brand',
    description: 'Brand identity + asset generator.',
  },
  {
    slug: 'voice_ai',
    display_name: 'Voice AI',
    category: 'ai',
    handler_paths: ['app/api/voice/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/dashboard/voice',
    description: 'Voice agent on website + phone.',
  },
  {
    slug: 'email_paste',
    display_name: 'Email Copy-Paste',
    category: 'ai',
    handler_paths: ['app/api/tools/email-paste/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/tools/email-paste',
    description: 'AI generates a full email from a short prompt; tap each field to copy.',
  },

  // ── Honest 'automation' label — workflow plumbing that may invoke Groq ──
  {
    slug: 'stack_scanner',
    display_name: 'Stack Scanner',
    category: 'automation',
    handler_paths: ['app/api/scanner/analyze/route.ts'],
    surface_route: '/dashboard/scans',
    description:
      'Detects 40+ tools on any visited site, scores stack gaps, recommends 0nMCP services. Recommendations rewritten by Groq inside lib/scanner/recommend.ts.',
  },
  {
    slug: 'fiverr_generate',
    display_name: 'Fiverr Gig Generator',
    category: 'automation',
    handler_paths: ['app/api/fiverr/generate/route.ts'],
    surface_route: '/extension/compose',
    description:
      'Generates a complete Fiverr gig (10 sections) via Groq openai/gpt-oss-120b. Server-side char-limit retry up to 2x. Surfaced in the extension Compose tab under Fiverr mode.',
  },
  {
    slug: 'fiverr_section_regenerate',
    display_name: 'Fiverr Section Regenerate',
    category: 'automation',
    handler_paths: ['app/api/fiverr/section-regenerate/route.ts'],
    surface_route: '/extension/compose',
    description:
      'Regenerates a single section of a Fiverr gig (per-card Regenerate button) via Groq with the same char-limit guardrails as fiverr_generate.',
  },
  {
    slug: 'fiverr_templates',
    display_name: 'Fiverr Saved Templates',
    category: 'crud',
    handler_paths: ['app/api/fiverr/templates/route.ts'],
    surface_route: '/extension/compose',
    description: 'List + save Fiverr gig templates (input state + 10 sections + VPIS) per spec §2.6.',
  },

  // ── Honest 'automation' label — CRUD, no AI claim ──────────────────
  {
    slug: 'contacts',
    display_name: 'Contacts',
    category: 'crud',
    handler_paths: ['app/api/crm/contacts/route.ts'],
    surface_route: '/dashboard/contacts',
    description: 'Contact list + filters.',
  },
  {
    slug: 'invoices',
    display_name: 'Invoices',
    category: 'crud',
    handler_paths: ['app/api/crm/invoices/route.ts'],
    surface_route: '/dashboard/invoices',
    description: 'Invoice list + create/send.',
  },
  {
    slug: 'pipeline',
    display_name: 'Pipeline',
    category: 'crud',
    handler_paths: ['app/api/crm/pipeline/route.ts'],
    surface_route: '/dashboard/pipeline',
  },
  {
    slug: 'calendar',
    display_name: 'Calendar',
    category: 'crud',
    handler_paths: ['app/api/crm/calendar/route.ts'],
    surface_route: '/dashboard/calendar',
  },

  // ── 0nCore AI Agent Engine — 3-layer prompt assembly + Groq + actions ──
  // Spec: docs/0ncore-ai-agent-architecture.md. The agent uses its own
  // 3-layer pattern (RocketOpp K-Layers + Location K-Layers + Trained Llama)
  // rather than the brain.think/record loop, so the contract enforces the
  // pattern's load-bearing primitives directly: groqCall + buildSystemPrompt,
  // never @anthropic-ai/sdk.
  {
    slug: 'ai_agent',
    display_name: '0nCore AI Agent (Jaxx)',
    category: 'ai',
    handler_paths: ['app/api/ai/chat/route.ts'],
    required_imports: ['@/lib/ai/groq', '@/lib/ai/prompt'],
    prohibited_imports: ['@anthropic-ai/sdk', 'openai'],
    required_calls: ['groqCall(', 'buildSystemPrompt('],
    surface_route: '/admin',
    description: 'Per-location AI agent. 3-layer prompt assembly + Groq + action execution + unlockable prompt packs.',
  },

  // ── Honest 'automation' label — workflow plumbing, AI may run inside steps ──
  {
    slug: 'automations',
    display_name: 'Automations',
    category: 'automation',
    handler_paths: ['app/api/automations/execute/route.ts'],
    surface_route: '/dashboard/automations',
    description: 'Visual workflow builder. Steps may invoke AI tools.',
  },
  {
    slug: 'mcp_store',
    display_name: 'MCP Store',
    category: 'automation',
    handler_paths: ['app/api/mcp-store/route.ts', 'app/api/mcp/execute/route.ts'],
    surface_route: '/dashboard/mcp-store',
    description: 'Connect external MCP servers.',
  },
]

/**
 * Get registry rows for a specific category.
 */
export function byCategory(cat: AddonCategory): RegistryEntry[] {
  return BRAIN_REGISTRY.filter((r) => r.category === cat)
}

/**
 * Get a registry row by slug.
 */
export function getEntry(slug: string): RegistryEntry | undefined {
  return BRAIN_REGISTRY.find((r) => r.slug === slug)
}
