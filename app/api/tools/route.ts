import { NextRequest, NextResponse } from 'next/server'
import { verifyAppJwt, bearer } from '@/lib/auth/app-jwt'
import { CAPABILITIES, legPriceCents } from '@/lib/crm/registry'
import { WIDGETS } from '@/lib/widgets/registry'
import { WORKFLOW_ACTIONS } from '@/lib/crm/actions'
import { TRIGGERS } from '@/lib/crm/triggers'
import { IMPLEMENTED } from '@/lib/burst/executor'
import { meterIdFor } from '@/lib/crm/wallet'
import dashboardInventory from '@/lib/tools/dashboard-inventory.json'
import onmcpInventory from '@/lib/tools/onmcp-inventory.json'

/**
 * GET /api/tools — every feature 0nCORE has, and whether it actually works.
 *
 * BUILT FROM THE REGISTRIES, never a hand-written list. A catalogue that is
 * maintained separately from the code drifts, and this one drifting means
 * telling an agency something works when it does not — the exact failure the
 * page exists to prevent.
 *
 * THREE STATES, and the difference matters:
 *   ready    — it runs today
 *   blocked  — built, but something specific is missing (named, with the fix)
 *   building — not finished; it will not pretend otherwise
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type ToolState = 'ready' | 'blocked' | 'building'
export interface Tool {
  key: string
  name: string
  group: string
  what: string
  state: ToolState
  /** Which API it talks to, and at what version — 'none' for pure UI. */
  api?: string
  /** External surfaces open in a new tab. */
  external?: boolean
  /** Why it cannot run — shown when someone clicks a blocked tool. */
  reason?: string
  fix?: string
  href?: string
  priceCents?: number
}

export async function GET(req: NextRequest) {
  const session = verifyAppJwt(bearer(req))
  if (!session.ok) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const tools: Tool[] = []
  const actionContract = Boolean(process.env.CRM_ACTION_SECRET)

  // ── the things a command can do ──
  for (const c of CAPABILITIES) {
    const price = legPriceCents(c.id)
    const wired = IMPLEMENTED.has(c.id)
    const meterOk = price === 0 || Boolean(c.meter && meterIdFor(c.meter))

    let state: ToolState = 'ready'
    let reason: string | undefined
    let fix: string | undefined

    if (c.mechanism === 'blocked') {
      state = 'blocked'
      reason = `Your CRM has no way to do this from outside its own builder.`
      fix = c.insteadOffer
    } else if (!wired) {
      state = 'building'
      reason = 'This is planned but not wired up yet, so a command asking for it will say so rather than pretending.'
    } else if (!meterOk) {
      state = 'blocked'
      reason = 'This costs money and no billing meter is configured, so it refuses rather than working for free.'
      fix = 'Create the meter on the sub-account app and set the matching CRM_METER_* variable.'
    }

    tools.push({
      key: c.id, name: capitalise(c.intent), group: 'Commands',
      what: c.intent, state, reason, fix, priceCents: price,
      href: state === 'ready' ? '/' : undefined,
    })
  }

  // ── workflow steps ──
  for (const a of WORKFLOW_ACTIONS) {
    const state: ToolState = !a.live ? 'building' : actionContract ? 'ready' : 'blocked'
    tools.push({
      key: a.key, name: a.name, group: 'Workflow steps', what: a.blurb, state,
      reason: state === 'blocked'
        ? 'The endpoint refuses every call because we cannot yet verify requests genuinely come from your CRM.'
        : state === 'building' ? 'Not finished — switching it on would put a step into a live customer journey that fails.' : undefined,
      fix: state === 'blocked' ? 'Save an action shell in the portal, then set CRM_ACTION_SECRET.' : undefined,
      href: state === 'ready' ? '/automations' : undefined,
    })
  }

  // ── triggers ──
  for (const t of TRIGGERS) {
    tools.push({
      key: t.key, name: t.name, group: 'Workflow triggers',
      what: `Starts one of your workflows when ${t.when}.`,
      state: 'ready', href: '/automations',
    })
  }

  // ── widgets ──
  for (const w of WIDGETS) {
    tools.push({
      key: w.key, name: w.name, group: w.cls === 'injector' ? 'Site scripts' : 'Page widgets',
      what: w.blurb,
      state: w.live ? 'ready' : 'building',
      reason: w.live ? undefined : (w.pending ?? 'Not finished — it serves nothing rather than a broken box on a live page.'),
      href: w.live ? '/automations' : undefined,
    })
  }

  // ── surfaces ──
  for (const s of [
    { key: 'command', name: 'Command centre', what: 'Say what you want done across every client.', href: '/' },
    { key: 'clients', name: 'Clients', what: 'Every sub-account, what they pay, what has been done.', href: '/clients' },
    { key: 'radar', name: 'Demand Radar', what: 'What the market is asking for and nobody has built.', href: '/automations' },
    { key: 'history', name: 'History & diagnostics', what: 'Everything that ran, and a live system check.', href: '/log' },
  ]) {
    tools.push({ ...s, group: 'Screens', state: 'ready' })
  }

  // ── the other dashboards in the family, scanned from their own code ──
  // Same scanner, same rules, so the three surfaces are judged identically —
  // a per-repo eyeball would grade them differently and the comparison is the
  // point.
  type Scanned = {
    key: string; name: string; href: string; api: string
    state: 'ready' | 'partial' | 'broken'; reason?: string; missing: string[]
  }
  const portals: { group: string; rows: Scanned[]; copy: Record<string, string> }[] = [
    { group: '0nCORE portal', rows: dashboardInventory as Scanned[], copy: PORTAL_COPY },
    { group: '0nMCP portal', rows: onmcpInventory as Scanned[], copy: ONMCP_COPY },
  ]

  for (const { group, rows, copy } of portals) {
    for (const d of rows) {
      const state: ToolState = d.state === 'broken' ? 'blocked' : d.state === 'partial' ? 'building' : 'ready'
      tools.push({
        key: `${group === '0nMCP portal' ? 'mcp' : 'core'}_${d.key}`,
        name: d.name,
        group,
        what: copy[d.name] ?? `The ${d.name.toLowerCase()} screen.`,
        state,
        api: d.api,
        external: true,
        href: d.href,
        reason: d.reason,
        fix: d.missing?.length
          ? `Build the missing endpoint${d.missing.length === 1 ? '' : 's'}: ${d.missing.slice(0, 4).join(', ')}`
          : undefined,
      })
    }
  }

  const counts = {
    ready: tools.filter((t) => t.state === 'ready').length,
    blocked: tools.filter((t) => t.state === 'blocked').length,
    building: tools.filter((t) => t.state === 'building').length,
  }
  return NextResponse.json({ ok: true, tools, counts })
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * A sentence per portal screen. Written rather than generated, because
 * "Cro9 Engine" tells a reader nothing and a tile without meaning is a tile
 * nobody clicks. Anything unnamed falls back to something honest.
 */
const PORTAL_COPY: Record<string, string> = {
  'Ai': 'The AI console — prompts, models and what the assistant is allowed to do.',
  'Analytics': 'Traffic, conversion and AI-visibility numbers for your sites.',
  'Automations': 'Your automation library and what each one is currently doing.',
  'Billing': 'Plan, invoices and what you have been charged for.',
  'Blog': 'Write and publish posts, with AI drafting.',
  'Brand': 'Logos, colours and voice — the details everything else inherits.',
  'Calendar': 'Appointments and availability across connected calendars.',
  'Campaigns': 'Outbound campaigns and how each is performing.',
  'Capabilities': 'Every action the platform can take on your behalf.',
  'Chat': 'Talk to the assistant and have it do the work.',
  'Command': 'One instruction, executed across everything connected.',
  'Config': 'System settings — phone numbers, senders and integrations.',
  'Connections': 'Every service you have linked, and its health.',
  'Contacts': 'People and companies, with everything known about them.',
  'Conversation Ai': 'The chat agent that answers on your behalf.',
  'Course Builder': 'Turn material into a structured course.',
  'Courses': 'Courses you have published and who is taking them.',
  'Crm': 'The CRM surface — contacts, pipeline, conversations.',
  'Cro9 Engine': 'The conversion engine that tests and improves your pages.',
  'Documents': 'Contracts and documents, sent and signed.',
  'Domains': 'Domains, DNS and which site each points at.',
  'Email': 'Send email and see what happened to it.',
  'Enrich': 'Fill in what you do not know about a contact.',
  'Files': 'Everything uploaded, in one place.',
  'Flows': 'Build and edit multi-step flows.',
  'Forms': 'Forms and the submissions they collect.',
  'Freelancer': 'The freelancer workspace.',
  'Funnels': 'Funnels and how each step converts.',
  'Hipaa': 'HIPAA readiness scanning and reporting.',
  'Installs': 'Apps installed, and where.',
  'Integrations': 'Connect a service and see what it unlocks.',
  'Invoices': 'Raise invoices and track payment.',
  'Landing Pages': 'Build and publish landing pages.',
  'Lead Magnets': 'Offers that capture leads, and their results.',
}
/** 0nMCP's own screens. Same reason as above: a tile without meaning is unclicked. */
const ONMCP_COPY: Record<string, string> = {
  'Console': 'The 0nMCP control console — everything you have connected.',
  'Admin': 'Site administration: content, users and the AI that writes.',
  '0ncode': 'The code workspace.',
  'Mods': 'Modules you can switch on.',
  'Campaigns': 'Outbound campaigns and their results.',
  'Orders': 'Orders and fulfilment.',
  'Pricing': 'Plans and what each includes.',
  'Ai Employee': 'The AI employee — what it knows and what it may do.',
  'Whatsapp': 'WhatsApp messaging and templates.',
  'Vault': 'Encrypted credentials for every connected service.',
  'Linkedin': 'LinkedIn posting, engagement and ad accounts.',
  'Convert': 'Convert a config between AI platform formats.',
  'Store': 'The 0nMCP store.',
  'Builder': 'Visual builder for flows and pages.',
  'Site Builder': 'Generate and publish site pages.',
  'Ai Settings': 'Which model runs where, and with what prompt.',
  'Catalog': 'The full service and tool catalogue.',
  'Content': 'Content pipeline and what is scheduled.',
  'Qa': 'Question-and-answer pages, generated and reviewed.',
  'Blog': 'Blog posts, drafting and SEO.',
  'Personas': 'AI personas that write and reply.',
  'Forum': 'Community forum moderation.',
  'Users': 'Accounts and permissions.',
  'Email': 'Email sending and templates.',
  'Analytics': 'Traffic and AI-visibility numbers.',
  'Billing': 'Plan, invoices and usage.',
  'Connect': 'Link a service to 0nMCP.',
  'Downloads': 'Installers and packages.',
  'Grid': 'The service grid — everything available.',
  'Install': 'Install 0nMCP into an AI platform.',
  'Projects': 'Your projects.',
  'Settings': 'Account and workspace settings.',
}
