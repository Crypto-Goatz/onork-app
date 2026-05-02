/**
 * Action mapper — turns the generic `ai_generate_content` / similar stubs
 * produced by the visual builder into real, runnable action types based on
 * the step's `name` (human label) + `config` shape.
 *
 * The mapper is intentionally permissive: pattern-match on keywords + the
 * presence of certain config keys, then pick the best fit. If nothing
 * matches, the original action survives (so the importer can flag it as
 * unmappable).
 */

export interface RawStep {
  id: string
  action: string
  input?: {
    name?: string
    category?: string
    config?: Record<string, unknown>
  }
  depends_on?: string[]
}

export interface NormalizedStep {
  id: string
  action: string
  display_name: string
  category: string
  config: Record<string, unknown>
  depends_on: string[]
  /** True if the action was changed by the mapper. */
  remapped: boolean
  /** True if the mapper couldn't classify this step. */
  unmappable?: boolean
}

interface Pattern {
  /** Substrings to match in the step name (case-insensitive). One must match. */
  nameAny?: string[]
  /** Config keys that, if present, support this match. */
  configKeysAny?: string[]
  /** Config keys that MUST be present. */
  configKeysAll?: string[]
  /** The action this maps to. */
  action: string
  /** Optional config rewrite — receives raw config, returns new config. */
  rewriteConfig?: (cfg: Record<string, unknown>) => Record<string, unknown>
}

const PATTERNS: Pattern[] = [
  // Search contacts (by tag, query, or filter)
  {
    nameAny: ['gather contact', 'search contacts', 'find contacts', 'get contacts'],
    configKeysAny: ['query', 'tag', 'tags', 'filter'],
    action: 'crm_search_contacts',
    rewriteConfig: (cfg) => {
      const out: Record<string, unknown> = {}
      if (typeof cfg.query === 'string' && cfg.query.startsWith('tags:')) {
        out.tag_name = cfg.query.replace(/^tags:\s*/, '').trim()
      } else if (cfg.tag) {
        out.tag_name = cfg.tag
      } else if (cfg.tags) {
        out.tag_name = Array.isArray(cfg.tags) ? cfg.tags[0] : cfg.tags
      }
      out.limit = cfg.limit ?? 25
      return out
    },
  },

  // Update contact custom fields (the most common pattern in the example)
  {
    nameAny: ['create custom field', 'set custom field', 'update contact', 'update custom field'],
    configKeysAll: ['contactId'],
    action: 'crm_update_contact',
    rewriteConfig: (cfg) => ({
      contact_id: cfg.contactId ?? cfg.contact_id,
      custom_fields: cfg.fields ?? cfg.custom_fields ?? cfg.customFields ?? {},
    }),
  },

  // Add tag to contact
  {
    nameAny: ['add tag', 'tag contact', 'apply tag'],
    configKeysAll: ['contactId'],
    action: 'crm_add_tag',
    rewriteConfig: (cfg) => ({
      contact_id: cfg.contactId ?? cfg.contact_id,
      tags: cfg.tags ?? (cfg.tag ? [cfg.tag] : []),
    }),
  },

  // Remove tag
  {
    nameAny: ['remove tag', 'untag'],
    configKeysAll: ['contactId'],
    action: 'crm_remove_tag',
    rewriteConfig: (cfg) => ({
      contact_id: cfg.contactId ?? cfg.contact_id,
      tags: cfg.tags ?? (cfg.tag ? [cfg.tag] : []),
    }),
  },

  // AI: extract company from email
  {
    nameAny: ['extract company', 'get company', 'company data', 'company from email'],
    configKeysAny: ['email'],
    action: 'ai_extract_company',
    rewriteConfig: (cfg) => ({ email: cfg.email }),
  },

  // AI Readiness scan (we already have this on rocketopp-live; will route to it)
  {
    nameAny: ['ai readiness', 'ai-readiness', 'readiness score'],
    configKeysAny: ['url'],
    action: 'ai_readiness_scan',
    rewriteConfig: (cfg) => ({ url: cfg.url }),
  },

  // Lead score
  {
    nameAny: ['hot lead', 'lead score', 'score lead', 'score website'],
    configKeysAny: ['url'],
    action: 'lead_score',
    rewriteConfig: (cfg) => ({ url: cfg.url, contact_id: cfg.contact_id ?? cfg.contactId }),
  },

  // Tech stack scan
  {
    nameAny: ['technical stack', 'tech stack', 'website stack'],
    configKeysAny: ['url'],
    action: 'tech_stack_scan',
    rewriteConfig: (cfg) => ({ url: cfg.url }),
  },

  // Business classification (niche/market/industry)
  {
    nameAny: ['niche', 'market', 'industry', 'business definition', 'classify business'],
    configKeysAny: ['url'],
    action: 'ai_classify_business',
    rewriteConfig: (cfg) => ({ url: cfg.url }),
  },

  // LinkedIn lookup
  {
    nameAny: ['linkedin'],
    configKeysAny: ['company', 'email'],
    action: 'linkedin_company_lookup',
    rewriteConfig: (cfg) => ({ company: cfg.company, email: cfg.email }),
  },

  // Google Sheet append (will be swapped if not connected)
  {
    nameAny: ['google sheet', 'gsheet', 'spreadsheet', 'sheet'],
    configKeysAny: ['webhookId', 'spreadsheet_id', 'sheet_id', 'payload'],
    action: 'gsheet_append',
    rewriteConfig: (cfg) => ({
      spreadsheet_id: cfg.spreadsheet_id ?? cfg.sheet_id,
      tab: cfg.sheet_name ?? cfg.tab,
      row: cfg.payload ?? cfg.row ?? cfg,
    }),
  },

  // Send email
  {
    nameAny: ['send email'],
    configKeysAny: ['contactId', 'email'],
    action: 'crm_send_email',
    rewriteConfig: (cfg) => ({
      contact_id: cfg.contactId ?? cfg.contact_id,
      subject: cfg.subject,
      body: cfg.body ?? cfg.html ?? cfg.message,
    }),
  },

  // Send SMS
  {
    nameAny: ['send sms', 'send text'],
    configKeysAll: ['contactId'],
    action: 'crm_send_sms',
    rewriteConfig: (cfg) => ({
      contact_id: cfg.contactId ?? cfg.contact_id,
      message: cfg.message ?? cfg.body,
    }),
  },

  // Wait / delay
  {
    nameAny: ['wait', 'delay', 'pause'],
    action: 'wait',
    rewriteConfig: (cfg) => ({
      duration_seconds:
        cfg.duration_seconds ??
        cfg.seconds ??
        ((cfg.minutes as number) || 0) * 60 +
          ((cfg.hours as number) || 0) * 3600 +
          ((cfg.days as number) || 0) * 86400,
    }),
  },

  // Slack
  {
    nameAny: ['slack', 'notify slack'],
    action: 'slack_send_message',
  },
]

function nameMatches(name: string, anys?: string[]): boolean {
  if (!anys || anys.length === 0) return true
  const n = name.toLowerCase()
  return anys.some((s) => n.includes(s.toLowerCase()))
}

function configHasAll(cfg: Record<string, unknown>, keys?: string[]): boolean {
  if (!keys || keys.length === 0) return true
  return keys.every((k) => k in cfg)
}

function configHasAny(cfg: Record<string, unknown>, keys?: string[]): boolean {
  if (!keys || keys.length === 0) return true
  return keys.some((k) => k in cfg)
}

export function mapStep(raw: RawStep): NormalizedStep {
  const display_name = raw.input?.name || raw.action
  const category = raw.input?.category || 'general'
  const config = raw.input?.config || {}
  const depends_on = raw.depends_on || []

  // Already a real action — leave it alone if it's not on our generic list
  const generic = new Set([
    'ai_generate_content',
    'ai_generate',
    'capability',
    'do_thing',
  ])
  if (!generic.has(raw.action)) {
    return {
      id: raw.id,
      action: raw.action,
      display_name,
      category,
      config,
      depends_on,
      remapped: false,
    }
  }

  // Try patterns in order
  for (const p of PATTERNS) {
    if (
      nameMatches(display_name, p.nameAny) &&
      configHasAll(config, p.configKeysAll) &&
      configHasAny(config, p.configKeysAny)
    ) {
      const newConfig = p.rewriteConfig ? p.rewriteConfig(config) : config
      return {
        id: raw.id,
        action: p.action,
        display_name,
        category,
        config: newConfig,
        depends_on,
        remapped: true,
      }
    }
  }

  return {
    id: raw.id,
    action: raw.action,
    display_name,
    category,
    config,
    depends_on,
    remapped: false,
    unmappable: true,
  }
}
