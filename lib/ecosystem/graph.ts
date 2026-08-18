/**
 * The structural map of the 0n ecosystem.
 *
 * WHY THIS IS A FILE AND NOT A LIVE QUERY. The deployed app runs on Vercel and
 * cannot read the machine where the repos live, so structure — what exists and
 * what talks to what — has to be written down. Everything that CAN be measured
 * at request time is measured instead and overlaid on top of this: whether a
 * domain answers, how many installs hold live tokens, when a project last
 * deployed. See app/api/hub/ecosystem/route.ts.
 *
 * THE RULE THAT KEEPS IT HONEST: no counts live here. `/api/dispatch/ecosystem`
 * still serves an inventory last written 2026-06-17 listing 28 entries against
 * a codebase of roughly twice that, and hardcoded totals in this project have
 * already disagreed with each other across three surfaces (1,640/109 vs
 * 1,600+/106 vs 1,554/96). A number on this page is either derived at request
 * time or carries the date it was last verified. Never a bare figure.
 *
 * Every edge below is one somebody has actually exercised, not one that ought
 * to exist. `verified` records how, and when. An unverified edge is drawn
 * differently on purpose — a map that shows intentions and facts identically is
 * how you end up presenting a diagram you cannot defend in the room.
 */

export type NodeKind =
  | 'operator' | 'surface' | 'orchestrator' | 'data' | 'external' | 'build'

export interface EcoNode {
  id: string
  label: string
  kind: NodeKind
  /** Layer decides vertical placement. A deliberate hierarchy reads better than a force sim. */
  layer: number
  domain?: string
  /** Probed live at request time when set — this is what makes the page self-correcting. */
  healthUrl?: string
  repo?: string
  blurb: string
  detail?: string
  status: 'live' | 'partial' | 'building' | 'planned'
}

export interface EcoEdge {
  from: string
  to: string
  label: string
  /** How this edge is known to work. Absent = asserted but never exercised. */
  verified?: string
  kind?: 'data' | 'auth' | 'control' | 'human'
}

export const NODES: EcoNode[] = [
  // ── The person ────────────────────────────────────────────────────────
  { id: 'mike', label: 'Operator', kind: 'operator', layer: 0, status: 'live',
    blurb: 'One person, directing the whole system.',
    detail: 'Every surface below exists to collapse work that would otherwise need a team. The measure of the architecture is how much runs without being asked twice.' },

  // ── The build loop — the thing that builds everything else ────────────
  { id: 'cece', label: 'Cece', kind: 'build', layer: 1, status: 'live',
    blurb: 'Claude Code. Exists only while a turn is running.',
    detail: 'Ships code, probes production, and refuses to report anything it has not proven with a call. Woken by a file change through launchd — no polling, no schedule.' },
  { id: 'dex', label: 'Dex', kind: 'build', layer: 1, status: 'live',
    blurb: 'Desktop Claude. Holds the plan between sessions.',
    detail: 'Keeps doctrine, decisions and corrections across sessions that each start from nothing. Has browser access, which Cece does not — that division of labour solved the Google OAuth failure.' },
  { id: 'bridge', label: 'The Bridge', kind: 'build', layer: 2, status: 'live',
    repo: '0n-bridge',
    blurb: 'A two-file doorbell and an append-only transcript.',
    detail: 'BRIDGE.md is shared memory; two small JSON outboxes answer "is there anything new?" in a stat call. Monotonic seq means no message is missed or acted on twice. Atomic renames mean a reader firing mid-write never sees half a message. No git: both ends share a filesystem, so the write IS the delivery.' },

  // ── Surfaces ──────────────────────────────────────────────────────────
  { id: 'hub', label: '0n Hub', kind: 'surface', layer: 3, status: 'partial',
    domain: 'app.0ncore.com/hub', healthUrl: 'https://app.0ncore.com/hub',
    blurb: 'The customer home. Where this page lives.',
    detail: 'New customer-facing work lands here. /dashboard becomes owner-only.' },
  { id: 'dashboard', label: '0nCORE Dashboard', kind: 'surface', layer: 3, status: 'live',
    domain: 'app.0ncore.com/dashboard', healthUrl: 'https://app.0ncore.com/dashboard',
    repo: 'onork-app',
    blurb: 'The agency command deck.',
    detail: 'Going owner-only. Measured 2026-08-18: returns 200 with app chrome to an anonymous request — the exposure the H1 gate closes.' },
  { id: 'extension', label: 'Chrome Extension', kind: 'surface', layer: 3, status: 'live',
    repo: '0n-extension',
    blurb: 'The 0n account, carried to every other site.',
    detail: 'v7.1.2. Captures your 0n key on an 0n domain and carries identity everywhere else. Every auth call must use www — the apex 308s, and a CORS preflight may not follow a redirect.' },
  { id: 'web0n', label: 'web0n', kind: 'surface', layer: 3, status: 'building',
    domain: 'web0n.com', healthUrl: 'https://web0n.com',
    blurb: 'AI site builder.', detail: 'Studio is the remaining build.' },
  { id: 'ontask', label: '0nTask', kind: 'surface', layer: 3, status: 'live',
    domain: 'app.0ntask.com', healthUrl: 'https://app.0ntask.com',
    blurb: 'Tasks across humans, AI and automations.' },
  { id: 'cro9', label: 'CRO9', kind: 'surface', layer: 3, status: 'live',
    domain: 'www.cro9.com', healthUrl: 'https://www.cro9.com',
    blurb: 'Conversion analytics that acts on itself.' },
  { id: 'mcpsite', label: '0nmcp.com', kind: 'surface', layer: 3, status: 'live',
    domain: '0nmcp.com', healthUrl: 'https://www.0nmcp.com',
    blurb: 'Marketing, community, programmatic SEO.' },

  // ── The orchestrator ──────────────────────────────────────────────────
  { id: 'mcp', label: '0nMCP', kind: 'orchestrator', layer: 4, status: 'live',
    repo: '0nMCP',
    blurb: 'The engine. Every surface routes through it.',
    detail: 'Tool and service totals are deliberately not printed here — the three surfaces that hardcoded them disagreed. Derive from the running server or say nothing.' },

  // ── Data ──────────────────────────────────────────────────────────────
  { id: 'db_core', label: 'Supabase · 0nCore', kind: 'data', layer: 5, status: 'live',
    blurb: 'pwujhhmlrtxjmjzyttwn — profiles, installs, tokens, community.',
    detail: 'Canonical for 0nCore and the marketplace. Row counts on this page are queried live.' },
  { id: 'db_rocket', label: 'Supabase · Rocket+', kind: 'data', layer: 5, status: 'live',
    blurb: 'rtwtaisjtvdajrdyivkn — the OIDC identity provider.' },

  // ── External ──────────────────────────────────────────────────────────
  { id: 'crm', label: 'CRM', kind: 'external', layer: 6, status: 'live',
    blurb: 'The system of record for contacts, pipelines and workflows.',
    detail: 'Two-token model: a Company token enumerates locations and can do nothing inside one; a location token minted from it operates. A 401 "authClass not allowed" is the model working, not a bug.' },
  { id: 'stripe', label: 'Stripe', kind: 'external', layer: 6, status: 'live', blurb: 'Billing, metered execution, Connect payouts.' },
  { id: 'google', label: 'Google', kind: 'external', layer: 6, status: 'partial',
    blurb: 'Analytics, Search Console, Business Profile, Ads.',
    detail: 'Connect failed with Error 400 until 2026-08-18: include_granted_scopes merged an older Drive/YouTube grant into an illegal combination. The offending scopes were never in the codebase — they were in the account grant history, so it failed per-account and read as "works for everyone but me".' },
  { id: 'groq', label: 'Groq', kind: 'external', layer: 6, status: 'live', blurb: 'The external model for planning, scoring and bulk generation.' },
]

export const EDGES: EcoEdge[] = [
  { from: 'mike', to: 'cece', label: 'directs', kind: 'human' },
  { from: 'mike', to: 'dex', label: 'directs', kind: 'human' },
  { from: 'cece', to: 'bridge', label: 'writes · wakes on change', kind: 'control',
    verified: 'launchd WatchPaths fired on a real message, 2026-08-18' },
  { from: 'dex', to: 'bridge', label: 'writes · reads on open', kind: 'control',
    verified: 'seq 5 delivered and read, 2026-08-18' },
  { from: 'cece', to: 'dashboard', label: 'ships & probes', kind: 'control',
    verified: 'deploys 04e117f, 05c40b5, 806d259 on 2026-08-18' },

  { from: 'hub', to: 'db_core', label: 'session · entitlement', kind: 'auth' },
  { from: 'dashboard', to: 'db_core', label: 'profiles · installs', kind: 'data' },
  { from: 'dashboard', to: 'crm', label: 'company token → location token', kind: 'auth',
    verified: '201 mint → 820 contacts, 4 pipelines, 6 workflows, 2026-08-18' },
  { from: 'extension', to: 'hub', label: 'captures 0n key same-origin', kind: 'auth',
    verified: 'content script → /api/hub/inside returns {token, connected}' },
  { from: 'extension', to: 'db_core', label: 'device key → app JWT', kind: 'auth',
    verified: 'one key now registered in both stores, backfilled 2026-08-18' },
  { from: 'dashboard', to: 'mcp', label: 'executes tools', kind: 'control' },
  { from: 'ontask', to: 'mcp', label: 'automations', kind: 'control' },
  { from: 'web0n', to: 'mcp', label: 'site generation', kind: 'control' },
  { from: 'cro9', to: 'db_core', label: 'events · variants', kind: 'data' },
  { from: 'mcpsite', to: 'db_core', label: 'community · auth', kind: 'data' },
  { from: 'mcp', to: 'crm', label: 'CRM tool family', kind: 'control' },
  { from: 'mcp', to: 'stripe', label: 'billing tools', kind: 'control' },
  { from: 'mcp', to: 'groq', label: 'planning · scoring', kind: 'control' },
  { from: 'dashboard', to: 'google', label: 'OAuth connect', kind: 'auth',
    verified: 'scope fix deployed 2026-08-18; reconnect not yet re-run' },
  { from: 'dashboard', to: 'stripe', label: 'subscriptions · metering', kind: 'data' },
]

/** Things learned the hard way. Shown on the page because they are the real asset. */
export const LAWS: { title: string; body: string; cost: string }[] = [
  {
    title: 'A request that dies in preflight leaves no server log',
    body: 'Extension sign-in pointed at the apex, which 308s to www. Auth calls are JSON POSTs, so Chrome sends a CORS preflight first — and a preflight may not follow a redirect. The real request was never sent.',
    cost: 'Every sign-in failed while the token, the storage keys and the endpoint were all correct. Chrome hides "www." in the address bar, so the two hosts looked identical.',
  },
  {
    title: 'Two stores for one credential is two different states',
    body: 'The same 0n_live_ key was validated against profiles.access_token by one route and api_tokens.token_hash by another. Minting wrote only the first.',
    cost: 'The extension connected happily and then 401d on every feature that needed a real token. "Connected" and "working" were different things.',
  },
  {
    title: 'A renew window smaller than the cron cadence guarantees misses',
    body: 'Tokens were renewed only if they expired within 2 hours, by a job that ran every 6.',
    cost: 'Anything expiring in the 4-hour blind spot died every cycle, and looked like customers churning.',
  },
  {
    title: 'Health that is only written on attempt will read backwards',
    body: 'Rows with no refresh token were skipped before the line that records health, so they kept an old optimistic "healthy" forever.',
    cost: '27 unrecoverable installs advertised themselves as fine while 2 merely-revoked ones read degraded. Triage started at the wrong end.',
  },
  {
    title: 'A probe with a deliberately invalid input beats an hour of reasoning',
    body: 'Sending a fake refresh token proved all three client secrets valid in one call each: a bad secret complains about credentials, a good one complains about the token.',
    cost: 'Three sessions had guessed at this. One probe settled it.',
  },
]
