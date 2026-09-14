/**
 * The structural map of the 0n ecosystem — drawn FROM THE RUNTIME OUT.
 *
 * Rewritten 2026-09-14. The previous map put the operator at the top and the
 * engine four layers down, which described who builds it. This one describes
 * how it works: 0n3 at the origin, the three things it is made of, the doors a
 * person connects through, the surfaces that consume it, the data it keeps,
 * the outside services it acts on, and — last — the loop that builds it.
 *
 * WHY THIS IS A FILE AND NOT A LIVE QUERY. The deployed app runs on Vercel and
 * cannot read the machine where the repos live, so structure — what exists and
 * what talks to what — has to be written down. Everything that CAN be measured
 * at request time is measured instead and overlaid on top of this: whether a
 * domain answers, how many tools the runtime reports, how many vault records
 * exist. See app/api/hub/ecosystem/route.ts.
 *
 * THE RULE THAT KEEPS IT HONEST: no counts live here. A number on this page is
 * either derived at request time or carries the date it was last verified.
 * 0nMCP 4.x published 1,598 tools; the running server registered 1,082; 0n3
 * reports its own count on every request. Never a bare figure.
 *
 * Every edge below is one somebody has actually exercised, not one that ought
 * to exist. `verified` records how, and when. An unverified edge is drawn
 * differently on purpose.
 */

export type NodeKind =
  | 'orchestrator' | 'core' | 'door' | 'surface' | 'data' | 'external' | 'build' | 'operator'

export interface EcoNode {
  id: string
  label: string
  kind: NodeKind
  /** Layer decides vertical placement: 0 is the runtime, higher numbers are further out. */
  layer: number
  domain?: string
  /** Probed live at request time when set — this is what makes the page self-correcting. */
  healthUrl?: string
  repo?: string
  blurb: string
  detail?: string
  status: 'live' | 'partial' | 'building' | 'planned' | 'retiring'
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
  // ── 0 · The runtime ────────────────────────────────────────────────────
  { id: 'on3', label: '0n3', kind: 'orchestrator', layer: 0, status: 'live',
    domain: '0n3.app', healthUrl: 'https://0n3.app', repo: '0n3',
    blurb: 'The runtime. One identity, one vault, one tool surface — resolved per account on every call.',
    detail: 'What 0nMCP was meant to be. The same createRuntime() serves a laptop over stdio and the cloud over HTTP; the only difference is which resolver hands it credentials. There is no unauthenticated path: a request with no valid 0n token is refused before any tool exists. Tool and service counts on this page come from its own / endpoint at request time.' },

  // ── 1 · What it is made of ─────────────────────────────────────────────
  { id: 'identity', label: 'Identity · the 0n token', kind: 'core', layer: 1, status: 'live',
    blurb: 'One account, one token, every surface.',
    detail: 'profiles.access_token on the 0nCore database, plus scoped, revocable rows in access_tokens for agents and bridges. A 0nCore-minted token and a 0nmcp.com-minted token resolve to the same row. Nothing else identifies a caller.' },
  { id: 'vault', label: 'The Vault', kind: 'core', layer: 1, status: 'live',
    blurb: 'Every connection as a .0n record, encrypted, keyed by account.',
    detail: 'vault_records (account, service, label) on the 0nCore database, AES-256-GCM under a key only the runtime holds; RLS on with no policies. Read by the runtime on every call, written by every door. Replaces five separate credential stores counted on 2026-09-13.' },
  { id: 'tools', label: 'The catalog + CRM factory', kind: 'core', layer: 1, status: 'live',
    blurb: 'Every service endpoint and every CRM tool, registered once.',
    detail: 'catalog.js — 113 services with real endpoint definitions, callable through api_call with the account\'s own credentials — and the data-driven CRM factory. Ported from 0nMCP 4.x unchanged; the numbers shown here are measured from the running server, not typed.' },
  { id: 'mcp4', label: '0nMCP 4.x', kind: 'core', layer: 1, status: 'retiring',
    repo: '0nMCP',
    blurb: 'The first runtime. Single-machine by construction.',
    detail: 'Read credentials from one home directory in 25 files, shared one connection manager across every HTTP session, and shipped an unauthenticated hosted worker. Its catalog, CRM factory and .0n format live on in 0n3. npm deprecation follows the 0n3 publish.' },

  // ── 2 · The doors — how an account connects things ─────────────────────
  { id: 'door_oauth', label: 'OAuth connect', kind: 'door', layer: 2, status: 'building',
    blurb: 'Google, Slack, GitHub, Stripe Connect. Grant once, record written to the vault.',
    detail: 'Stripe Connect (read_write) is the first to ship on 0n3.app itself; Google and Slack flows exist on 0nmcp.com and already write vault records through the bridge.' },
  { id: 'door_key', label: 'API key', kind: 'door', layer: 2, status: 'live',
    blurb: 'Paste a key on the vault page, or push a local .0n file.',
    detail: 'Same record either way. The CLI\'s ~/.0n/connections/*.0n files ARE .0n records; `0n3 vault push <service>` sends one to the hosted vault.' },
  { id: 'door_apps', label: 'Third-party apps', kind: 'door', layer: 2, status: 'building',
    blurb: 'A 0n app installed on the provider\'s side: the Stripe App, the CRM marketplace app.',
    detail: 'Reviewed by the provider, listed in their marketplace, installed from there. Narrower than a platform grant but native and trusted. Both write the same vault record.' },
  { id: 'door_plugin', label: 'Plugins', kind: 'door', layer: 2, status: 'partial',
    blurb: 'WordPress and site plugins that carry a 0n key.',
    detail: 'The WordPress plugin lane authenticates with an api_tokens row; it becomes a vault record like everything else.' },

  // ── 3 · Surfaces that consume the runtime ──────────────────────────────
  { id: 'hub', label: '0n Hub', kind: 'surface', layer: 3, status: 'partial',
    domain: 'app.0ncore.com/hub', healthUrl: 'https://app.0ncore.com/hub', repo: 'onork-app',
    blurb: 'The customer home. Where this page lives.' },
  { id: 'dashboard', label: '0nCORE Dashboard', kind: 'surface', layer: 3, status: 'live',
    domain: 'app.0ncore.com/dashboard', healthUrl: 'https://app.0ncore.com/dashboard', repo: 'onork-app',
    blurb: 'The agency command deck. Tools panel, agent keys and the CRM agent bridge all run through 0n3.',
    detail: 'Since 2026-09-14 every tool call from here carries a real 0n token: the signed-in person\'s own, or a scoped "CRM agent bridge" token for server jobs. Agent keys are scoped access_tokens rows, revocable one at a time.' },
  { id: 'mcpsite', label: '0nmcp.com', kind: 'surface', layer: 3, status: 'live',
    domain: '0nmcp.com', healthUrl: 'https://www.0nmcp.com', repo: '0nmcp-website',
    blurb: 'Marketing, community, the vault page, the hosted MCP route.',
    detail: 'Its vault bridge is a thin client of 0n3 since 2026-09-14; the old per-user table is retired. /api/mcp resolves a 0n token before any tool call.' },
  { id: 'ontask', label: '0nTask', kind: 'surface', layer: 3, status: 'live',
    domain: 'app.0ntask.com', healthUrl: 'https://app.0ntask.com', repo: '0ntask-studio',
    blurb: 'Tasks across humans, AI and automations. Flows run on its own server runner.',
    detail: 'Reads connected services through the 0n token. Its Google, CRM and Slack tables are the next records to fold into the vault.' },
  { id: 'cro9', label: 'CRO9', kind: 'surface', layer: 3, status: 'live',
    domain: 'www.cro9.com', healthUrl: 'https://www.cro9.com', repo: 'CRO9',
    blurb: 'Conversion analytics that acts on itself. Stripe revenue truth lands here.' },
  { id: 'sxo', label: 'SXOwebsite', kind: 'surface', layer: 3, status: 'live',
    domain: 'sxowebsite.com', healthUrl: 'https://sxowebsite.com', repo: 'sxowebsite',
    blurb: 'Free AI-readiness scans, credit packs, the 0n identity at checkout.' },
  { id: 'extension', label: 'Chrome Extension', kind: 'surface', layer: 3, status: 'live',
    repo: '0n-extension',
    blurb: 'The 0n account, carried to every other site.',
    detail: 'Captures your 0n key on an 0n domain and carries identity everywhere else. Every auth call must use www — the apex 308s, and a CORS preflight may not follow a redirect.' },
  { id: 'cli', label: 'CLI · Claude Desktop · Cursor', kind: 'surface', layer: 3, status: 'live',
    repo: '0n3',
    blurb: '`0n3 stdio` — the same runtime, on your laptop, over your local .0n files.',
    detail: 'No hosted call needed. With ON3_URL and ON3_TOKEN set it also lists your hosted vault, but secrets never come down over the API.' },
  { id: 'web0n', label: 'web0n', kind: 'surface', layer: 3, status: 'building',
    domain: 'web0n.com', healthUrl: 'https://web0n.com',
    blurb: 'AI site builder. Studio is the remaining build.' },

  // ── 4 · Data ───────────────────────────────────────────────────────────
  { id: 'db_core', label: 'Supabase · 0nCore', kind: 'data', layer: 4, status: 'live',
    blurb: 'pwujhhmlrtxjmjzyttwn — identity, the vault, installs, community.',
    detail: 'Canonical for identity (profiles, access_tokens) and the vault (vault_records, vault_members, vault_audit). Row counts on this page are queried live.' },
  { id: 'db_rocket', label: 'Supabase · Rocket+', kind: 'data', layer: 4, status: 'live',
    blurb: 'rtwtaisjtvdajrdyivkn — the OIDC identity provider and CRO9 revenue tables.' },
  { id: 'db_task', label: 'Postgres + Firestore · 0nTask', kind: 'data', layer: 4, status: 'live',
    blurb: 'grfjpophcwfsfnwculiu (pooler) and the Firestore mirror.',
    detail: 'Pooled connections are capped at 200; bulk routes and a queued mirror keep the app under it.' },

  // ── 5 · The outside world ──────────────────────────────────────────────
  { id: 'crm', label: 'CRM', kind: 'external', layer: 5, status: 'live',
    blurb: 'The system of record for contacts, pipelines, workflows and social posting.',
    detail: 'Two-token model: a Company token enumerates locations and can do nothing inside one; a location token minted from it operates. Each account\'s CRM record in the vault names its own location.' },
  { id: 'stripe', label: 'Stripe', kind: 'external', layer: 5, status: 'partial',
    blurb: 'Billing for us; Connect and a Stripe App for every account.',
    detail: 'The first record ever written to the vault was a Stripe key, proven by reading the live balance through 0n3 on 2026-09-13. Connect OAuth (read_write) is the highest-level grant; the Stripe App is the marketplace door.' },
  { id: 'google', label: 'Google', kind: 'external', layer: 5, status: 'partial',
    blurb: 'Calendar, Drive, Tasks, Sheets, Analytics, Search Console.',
    detail: 'Grants differ per account: measured 2026-09-13, zero of three 0nTask grants held the Tasks scope. One consent screen with one scope set is the fix.' },
  { id: 'slack', label: 'Slack', kind: 'external', layer: 5, status: 'partial',
    blurb: 'Per-workspace bot tokens.' },
  { id: 'github', label: 'GitHub', kind: 'external', layer: 5, status: 'partial',
    blurb: 'Repos, issues, pull requests.' },
  { id: 'models', label: 'AI of your choice', kind: 'external', layer: 5, status: 'live',
    blurb: 'Groq, Gemini, OpenAI, Anthropic — the account\'s own model key is a vault record like any other.',
    detail: 'A 0n3 app combines the account\'s bucket of capabilities with whichever model the account connected. Our own keys run the built-in allowance only.' },

  // ── 6 · Who builds it ──────────────────────────────────────────────────
  { id: 'mike', label: 'Operator', kind: 'operator', layer: 6, status: 'live',
    blurb: 'One person, directing the whole system.' },
  { id: 'cece', label: 'Cece', kind: 'build', layer: 6, status: 'live',
    blurb: 'Claude Code. Ships, probes, refuses to report what it has not proven.' },
  { id: 'dex', label: 'Dex', kind: 'build', layer: 6, status: 'live',
    blurb: 'Desktop Claude. Holds the plan between sessions; has the browser.' },
  { id: 'gemini', label: 'Gemini', kind: 'build', layer: 6, status: 'live',
    blurb: 'Gemini CLI. Third peer in the room.' },
  { id: 'bridge', label: 'The Bridge', kind: 'build', layer: 6, status: 'live',
    repo: '0n-bridge',
    blurb: 'An append-only transcript with a chain link on every entry.',
    detail: 'One writer (the CLI), monotonic seq per outbox, atomic renames. No git: every peer shares the filesystem, so the write IS the delivery.' },
]

export const EDGES: EcoEdge[] = [
  // the runtime is made of
  { from: 'on3', to: 'identity', label: 'resolves every request', kind: 'auth',
    verified: 'no token → 401; scoped and master tokens both resolve to the account, 2026-09-14' },
  { from: 'on3', to: 'vault', label: 'reads the account\'s records per call', kind: 'data',
    verified: 'stripe get_balance answered with the account\'s own key; a second account saw nothing, 2026-09-13' },
  { from: 'on3', to: 'tools', label: 'registers once per session', kind: 'control',
    verified: 'two runtimes both register every CRM tool (4.x lost them on the second session), tests 2026-09-13' },
  { from: 'mcp4', to: 'on3', label: 'catalog · CRM factory · .0n format ported', kind: 'control',
    verified: 'byte-identical catalog.js and definition sets, 2026-09-13' },

  // doors write the vault
  { from: 'door_key', to: 'vault', label: 'PUT /vault/:service', kind: 'data',
    verified: '20 records pushed from local .0n files, 2026-09-13' },
  { from: 'door_oauth', to: 'vault', label: 'callback → record', kind: 'auth',
    verified: '0nmcp.com Google and Slack callbacks write through the bridge since 2026-09-14; Stripe Connect pending the platform client id' },
  { from: 'door_apps', to: 'vault', label: 'install → record', kind: 'auth' },
  { from: 'door_plugin', to: 'identity', label: 'plugin key = 0n token', kind: 'auth' },

  // surfaces consume the runtime
  { from: 'dashboard', to: 'on3', label: 'tools panel · agent bridge · execute', kind: 'control',
    verified: 'deploy db95b9b green 2026-09-14; scoped bridge token resolves on 0n3' },
  { from: 'mcpsite', to: 'on3', label: 'vault bridge (client of 0n3)', kind: 'data',
    verified: 'token/validate lists 16 connected services from the vault, 2026-09-14' },
  { from: 'mcpsite', to: 'identity', label: 'mints and validates 0n tokens', kind: 'auth' },
  { from: 'ontask', to: 'identity', label: 'Firebase → 0n token by email', kind: 'auth',
    verified: '/api/account/bridge returns the token; apps light up from connectedServices' },
  { from: 'cli', to: 'on3', label: 'same runtime over stdio', kind: 'control',
    verified: '0n3 doctor: 874 tools from the local tree, 2026-09-13' },
  { from: 'extension', to: 'identity', label: 'captures the 0n key same-origin', kind: 'auth',
    verified: 'content script → /api/hub/inside returns {token, connected}' },
  { from: 'cro9', to: 'db_rocket', label: 'events · variants · payments', kind: 'data' },
  { from: 'sxo', to: 'identity', label: 'checkout attaches to the 0n account', kind: 'auth',
    verified: 'cart → account → pay → account flow, 2026-09-12' },
  { from: 'hub', to: 'db_core', label: 'session · entitlement', kind: 'auth' },
  { from: 'web0n', to: 'on3', label: 'site generation', kind: 'control' },

  // data
  { from: 'identity', to: 'db_core', label: 'profiles · access_tokens', kind: 'data' },
  { from: 'vault', to: 'db_core', label: 'vault_records · vault_audit', kind: 'data',
    verified: 'audit rows written for put and read_secret, 2026-09-14' },
  { from: 'ontask', to: 'db_task', label: 'tasks · projects · flows', kind: 'data' },

  // the runtime acts on the outside world with the account's own credentials
  { from: 'tools', to: 'crm', label: 'CRM tool family', kind: 'control',
    verified: 'CRM tools default to the account\'s own location, tests 2026-09-14' },
  { from: 'tools', to: 'stripe', label: 'api_call stripe.*', kind: 'control',
    verified: 'live balance read through the vault, 2026-09-13' },
  { from: 'tools', to: 'google', label: 'api_call google_*', kind: 'control' },
  { from: 'tools', to: 'slack', label: 'api_call slack.*', kind: 'control' },
  { from: 'tools', to: 'github', label: 'api_call github.*', kind: 'control' },
  { from: 'tools', to: 'models', label: 'the account\'s own model', kind: 'control' },

  // who builds it
  { from: 'mike', to: 'cece', label: 'directs', kind: 'human' },
  { from: 'mike', to: 'dex', label: 'directs', kind: 'human' },
  { from: 'cece', to: 'bridge', label: 'writes · wakes on change', kind: 'control',
    verified: 'seq 643 delivered and chain-linked, 2026-09-14' },
  { from: 'dex', to: 'bridge', label: 'writes · reads on open', kind: 'control' },
  { from: 'gemini', to: 'bridge', label: 'writes', kind: 'control' },
  { from: 'cece', to: 'on3', label: 'ships & probes', kind: 'control',
    verified: 'deploys 993312c → ea93a09 → cf9e02f, each polled by SHA, 2026-09-13' },
]

/** Things learned the hard way. Shown on the page because they are the real asset. */
export const LAWS: { title: string; body: string; cost: string }[] = [
  {
    title: 'An unauthenticated runtime is a public credential',
    body: 'The 4.x hosted worker answered tools/call with no token. It held a CRM location key, a live Stripe key and a database service-role key. Anyone with the URL — which was in the install guide — could list, create, delete, charge and email.',
    cost: 'Measured 2026-09-13 with a read-only call. 0n3 refuses before any tool exists; the worker is being disabled and its three keys rolled.',
  },
  {
    title: 'One concept, five stores',
    body: 'Credentials lived in local .0n files, two website vault tables, per-provider OAuth tables and per-app tables. Nothing bridged them; one was write-only.',
    cost: 'Every new integration added a sixth store. Google Tasks was "connected" in a table nobody read and worked for zero of three accounts.',
  },
  {
    title: 'A count is measured or it is fiction',
    body: '0nMCP published 1,598 tools from a stats script reading a stale copy of the catalog. The running server registered 1,082. Three surfaces disagreed with each other.',
    cost: 'Every number on this page is derived at request time or dated. 0n3 reports its own count from the running server.',
  },
  {
    title: 'Never rename inside a lockfile',
    body: 'A blind 0n2 → 0n3 replace changed a package integrity hash that happened to contain the substring. Vercel refused to install.',
    cost: 'One red deploy. The lock was restored and only the package name changed.',
  },
  {
    title: 'A request that dies in preflight leaves no server log',
    body: 'Extension sign-in pointed at the apex, which 308s to www. Auth calls are JSON POSTs, so Chrome sends a CORS preflight first — and a preflight may not follow a redirect.',
    cost: 'Every sign-in failed while the token, the storage keys and the endpoint were all correct.',
  },
  {
    title: 'Health that is only written on attempt will read backwards',
    body: 'Rows with no refresh token were skipped before the line that records health, so they kept an old optimistic "healthy" forever.',
    cost: '27 unrecoverable installs advertised themselves as fine. Triage started at the wrong end.',
  },
  {
    title: 'A probe with a deliberately invalid input beats an hour of reasoning',
    body: 'A fake token sent to 0n3 proves the gate; a fake refresh token sent to the CRM proves which of two errors you are looking at.',
    cost: 'Three sessions had guessed at one of these. One probe settled it.',
  },
]
