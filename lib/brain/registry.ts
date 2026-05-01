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
    display_name: 'Notes (Whimsical)',
    category: 'ai',
    handler_paths: ['app/api/notes/think/route.ts'],
    required_imports: ['@/lib/brain'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['think(', 'record('],
    surface_route: '/dashboard/notes',
    description: 'Drop any thought — brain decides if it becomes a flowchart, mind map, doc, or tagged note.',
  },

  // ── AI surfaces — all route through /api/<slug>/think (handleThink helper) ──
  {
    slug: 'service_packager',
    display_name: 'Service Packager',
    category: 'ai',
    handler_paths: ['app/api/service-packager/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/dashboard/service-packager',
    description: 'Turn any service into 8 sellable outputs.',
  },
  {
    slug: '0nexec',
    display_name: '0nExec',
    category: 'ai',
    handler_paths: ['app/api/exec/think/route.ts'],
    required_imports: ['@/lib/brain/think-route'],
    prohibited_imports: ['@anthropic-ai/sdk'],
    required_calls: ['handleThink('],
    surface_route: '/console/exec',
    description: 'Score-based orbit + formula engine.',
  },
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
