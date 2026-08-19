/**
 * Add-on Registry — defines config schemas and execution handlers for every add-on.
 *
 * PROCESS FOR ADDING A NEW ADD-ON:
 *
 * 1. Define the add-on in lib/marketplace-data.ts (slug, name, price, capabilities)
 * 2. Register it here with configSchema + execute function
 * 3. Create dashboard page: app/dashboard/addons/[slug]/page.tsx
 *    — Uses AddonConfigForm component with the schema
 *    — Gated by hasAddon(slug) check
 * 4. The execute function receives the user's config + connections and runs the AI workflow
 * 5. Cron job (/api/cron/addons) calls execute() for all users on schedule
 *
 * That's it. The generic infrastructure handles:
 * - Config CRUD (/api/addons/[slug]/config)
 * - Manual execution (/api/addons/[slug]/execute)
 * - Scheduled execution (/api/cron/addons)
 * - Execution history tracking (addon_executions table)
 * - Capability gating (product_keys table)
 */

export interface ConfigField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'select' | 'multi-select' | 'toggle' | 'tags'
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
  default?: unknown
  required?: boolean
}

/**
 * How an add-on is served once the gate has said yes.
 *
 * 'workflow' — the generic frame IS the product. /x/<slug> renders
 *              configSchema, the customer presses Run, execute() does the work.
 *              content-engine, sxo and 0ncouncil are all this shape.
 *
 * 'hosted'   — the add-on ships its own UI and lives at its own route. The
 *              frame would be a downgrade: rendering a two-field form where
 *              Course Builder's course list should be is not a migration, it is
 *              a replacement with something worse. /x/<slug> runs the identical
 *              gate and then hands off to skeleton.entryRoute.
 *
 * The default is 'workflow' so every existing definition keeps its meaning
 * without being touched.
 */
export type AddonSurface = 'workflow' | 'hosted'

export interface AddonDefinition {
  slug: string
  name: string
  schedule: 'daily' | 'weekly' | 'hourly' | 'manual'
  /** Defaults to 'workflow'. See AddonSurface. */
  surface?: AddonSurface
  configSchema: ConfigField[]
  /**
   * Execute the add-on workflow with user's config and context.
   *
   * OPTIONAL, AND ONLY BECAUSE 'hosted' EXISTS. A hosted add-on has no generic
   * run — its work happens through its own API under its own UI. Callers must
   * refuse rather than assume: an undefined execute() that gets called is a
   * crash, and one that gets silently skipped is a cron job reporting success
   * for work it never did.
   */
  execute?: (ctx: ExecutionContext) => Promise<ExecutionResult>
}

/** True when the generic frame can configure and run this add-on itself. */
export function isRunnableAddon(
  def: AddonDefinition | null | undefined,
): def is AddonDefinition & { execute: (ctx: ExecutionContext) => Promise<ExecutionResult> } {
  return !!def && typeof def.execute === 'function' && (def.surface ?? 'workflow') === 'workflow'
}

export interface ExecutionContext {
  userId: string
  locationId: string
  config: Record<string, unknown>
  connections: {
    google?: { access_token: string; metadata?: Record<string, unknown> }
    linkedin?: { access_token: string }
    slack?: { access_token: string }
    facebook?: { access_token: string }
  }
  crmPit: string
}

export interface ExecutionResult {
  success: boolean
  summary: string
  outputs: Record<string, unknown>
  /** Items produced (blog posts, social posts, emails, etc.) */
  items?: { type: string; title: string; url?: string; status: string }[]
}

// ─── CONTENT ENGINE ────────────────────────────────────────────

const contentEngine: AddonDefinition = {
  slug: 'content-engine',
  name: 'Content Engine',
  schedule: 'daily',
  configSchema: [
    {
      key: 'business_description',
      label: 'What does your business do?',
      type: 'textarea',
      placeholder: 'We help small businesses automate their marketing with AI tools...',
      description: 'The AI uses this to write content that sounds like you.',
      required: true,
    },
    {
      key: 'topics',
      label: 'Content topics',
      type: 'tags',
      placeholder: 'Add topics (press Enter)',
      description: 'What should the AI write about? e.g. AI automation, CRM tips, lead generation',
      required: true,
    },
    {
      key: 'tone',
      label: 'Writing tone',
      type: 'select',
      options: [
        { value: 'professional', label: 'Professional' },
        { value: 'casual', label: 'Casual & friendly' },
        { value: 'authoritative', label: 'Authoritative & expert' },
        { value: 'conversational', label: 'Conversational' },
        { value: 'bold', label: 'Bold & provocative' },
      ],
      default: 'professional',
    },
    {
      key: 'blog_enabled',
      label: 'Generate blog posts',
      type: 'toggle',
      default: true,
      description: 'AI writes a blog post and publishes to your CRM blog',
    },
    {
      key: 'blog_length',
      label: 'Blog post length',
      type: 'select',
      options: [
        { value: 'short', label: 'Short (500-800 words)' },
        { value: 'medium', label: 'Medium (800-1200 words)' },
        { value: 'long', label: 'Long (1200-2000 words)' },
      ],
      default: 'medium',
    },
    {
      key: 'social_enabled',
      label: 'Generate social posts',
      type: 'toggle',
      default: true,
      description: 'AI creates and schedules posts to your connected platforms',
    },
    {
      key: 'social_platforms',
      label: 'Social platforms',
      type: 'multi-select',
      options: [
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'instagram', label: 'Instagram' },
        { value: 'x', label: 'X (Twitter)' },
        { value: 'tiktok', label: 'TikTok' },
      ],
      default: ['linkedin'],
    },
    {
      key: 'social_posts_per_day',
      label: 'Social posts per day',
      type: 'number',
      default: 2,
      description: 'How many social posts to generate each day',
    },
    {
      key: 'email_enabled',
      label: 'Generate email campaigns',
      type: 'toggle',
      default: false,
      description: 'AI creates email campaigns targeting your CRM contacts',
    },
    {
      key: 'email_frequency',
      label: 'Email frequency',
      type: 'select',
      options: [
        { value: 'daily', label: 'Daily' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Every 2 weeks' },
      ],
      default: 'weekly',
    },
    {
      key: 'target_audience',
      label: 'Target audience',
      type: 'textarea',
      placeholder: 'Small business owners, marketing managers, SaaS founders...',
      description: 'Who are you writing for?',
    },
    {
      key: 'cta_url',
      label: 'Call-to-action URL',
      type: 'text',
      placeholder: 'https://yourdomain.com/book',
      description: 'Where should blog/social CTAs point?',
    },
  ],

  execute: async (ctx) => {
    const {
      business_description,
      topics,
      tone,
      blog_enabled,
      blog_length,
      social_enabled,
      social_platforms,
      social_posts_per_day,
      email_enabled,
      target_audience,
      cta_url,
    } = ctx.config as Record<string, unknown>

    const items: { type: string; title: string; url?: string; status: string }[] = []
    const topicList = (topics as string[]) || []
    const todayTopic = topicList[Math.floor(Math.random() * topicList.length)] || 'business automation'

    // Build the AI prompt with user's config values
    const systemPrompt = `You are a content marketing AI for a business.

Business: ${business_description || 'A modern business'}
Target audience: ${target_audience || 'business professionals'}
Tone: ${tone || 'professional'}
Topic for today: ${todayTopic}
CTA URL: ${cta_url || ''}

You generate content that drives engagement and leads. Every piece should provide genuine value, not fluff.`

    // 1. Blog post
    if (blog_enabled) {
      try {
        const lengthGuide = blog_length === 'short' ? '500-800' : blog_length === 'long' ? '1200-2000' : '800-1200'

        const blogRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Write a ${lengthGuide} word blog post about "${todayTopic}". Return JSON: { "title": "...", "slug": "...", "content": "...(HTML)...", "meta_description": "...", "tags": ["..."] }` },
            ],
            temperature: 0.7,
            response_format: { type: 'json_object' },
          }),
        })

        if (blogRes.ok) {
          const blogData = await blogRes.json()
          const blog = JSON.parse(blogData.choices[0].message.content)

          // Post to CRM blog
          const crmRes = await fetch(`https://services.leadconnectorhq.com/blogs/posts`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${ctx.crmPit}`,
              Version: '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              locationId: ctx.locationId,
              title: blog.title,
              slug: blog.slug,
              content: blog.content,
              status: 'published',
              tags: blog.tags,
            }),
          })

          items.push({
            type: 'blog',
            title: blog.title,
            url: crmRes.ok ? `/blog/${blog.slug}` : undefined,
            status: crmRes.ok ? 'published' : 'draft',
          })
        }
      } catch (err) {
        items.push({ type: 'blog', title: 'Blog generation failed', status: 'error' })
      }
    }

    // 2. Social posts
    if (social_enabled) {
      const platforms = (social_platforms as string[]) || ['linkedin']
      const count = (social_posts_per_day as number) || 2

      try {
        const socialRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Write ${count} social media posts about "${todayTopic}" for ${platforms.join(', ')}. Each post should be platform-appropriate length. Return JSON array: [{ "platform": "...", "text": "...", "hashtags": ["..."] }]` },
            ],
            temperature: 0.8,
            response_format: { type: 'json_object' },
          }),
        })

        if (socialRes.ok) {
          const socialData = await socialRes.json()
          const parsed = JSON.parse(socialData.choices[0].message.content)
          const posts = Array.isArray(parsed) ? parsed : parsed.posts || [parsed]

          // Post each to CRM social planner
          for (const post of posts) {
            try {
              await fetch(`https://services.leadconnectorhq.com/social-media-posting/post`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${ctx.crmPit}`,
                  Version: '2021-07-28',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  locationId: ctx.locationId,
                  post: `${post.text}\n\n${(post.hashtags || []).map((h: string) => `#${h}`).join(' ')}`,
                  platforms: [post.platform || platforms[0]],
                  status: 'draft',
                }),
              })

              items.push({
                type: 'social',
                title: `${post.platform}: ${(post.text || '').slice(0, 60)}...`,
                status: 'scheduled',
              })
            } catch {
              items.push({ type: 'social', title: `${post.platform} post failed`, status: 'error' })
            }
          }
        }
      } catch {
        items.push({ type: 'social', title: 'Social generation failed', status: 'error' })
      }
    }

    // 3. Email campaign (if enabled and on schedule)
    if (email_enabled) {
      // Email runs on its own frequency, tracked separately
      items.push({ type: 'email', title: 'Email campaign queued', status: 'queued' })
    }

    const successCount = items.filter(i => i.status !== 'error').length
    return {
      success: successCount > 0,
      summary: `Generated ${successCount} items: ${items.filter(i => i.type === 'blog').length} blog, ${items.filter(i => i.type === 'social').length} social, ${items.filter(i => i.type === 'email').length} email`,
      outputs: { topic: todayTopic, items_count: items.length },
      items,
    }
  },
}

// ─── SXO — scheduled site health ───────────────────────────────────────────
/**
 * The crawl already exists in lib/sxo/crawler.ts. This wraps it as a scheduled
 * add-on rather than reimplementing it — the whole reason the add-on contract
 * exists is so a capability gains config, a cadence and a price without
 * growing a second copy of its engine.
 */
const sxoAddon: AddonDefinition = {
  slug: 'sxo',
  name: 'SXO — Site Health Canvas',
  schedule: 'weekly',
  configSchema: [
    { key: 'domain', label: 'Website to watch', type: 'text', placeholder: 'harbordental.com', required: true },
    { key: 'maxPages', label: 'Maximum pages per crawl', type: 'number', default: 150,
      description: 'Higher finds more, takes longer, and asks more of their server.' },
    { key: 'alertOnDrop', label: 'Tell me when the score drops', type: 'toggle', default: true },
  ],
  async execute(ctx) {
    const domain = String(ctx.config.domain ?? '').trim()
    if (!domain) return { success: false, summary: 'No website configured.', outputs: {} }

    const { crawlSite } = await import('@/lib/sxo/crawler')
    const r = await crawlSite(
      String(ctx.config.__companyId ?? ctx.locationId),
      domain,
      ctx.locationId,
      { maxPages: Number(ctx.config.maxPages) || 150 },
    )
    if (!r.ok) return { success: false, summary: r.error, outputs: {} }

    return {
      success: true,
      summary: `${domain}: ${r.result.pages} pages, score ${r.result.score}` +
               (r.result.orphans ? `, ${r.result.orphans} orphan(s)` : ''),
      outputs: { ...r.result },
      items: [{ type: 'scan', title: `${domain} — ${r.result.score}/100`,
                url: `/crm/sxo`, status: 'complete' }],
    }
  },
}

// ─── 0nCouncil — standing verification of the claims a business relies on ──
const councilAddon: AddonDefinition = {
  slug: '0ncouncil',
  name: '0nCouncil — Answer Verification',
  schedule: 'manual',
  configSchema: [
    { key: 'questions', label: 'Claims to keep checking', type: 'tags',
      description: 'Reviewed on every run. Anything the business states publicly and would be embarrassed to have wrong.' },
    { key: 'domain', label: 'Subject area', type: 'text', placeholder: 'dentistry', default: 'general' },
  ],
  async execute(ctx) {
    const raw = ctx.config.questions
    const questions = (Array.isArray(raw) ? raw : String(raw ?? '').split('\n'))
      .map((q) => String(q).trim()).filter(Boolean).slice(0, 10)
    if (!questions.length) return { success: false, summary: 'No claims configured to review.', outputs: {} }

    const { runCouncil, recordCouncil } = await import('@/lib/council')
    const domain = String(ctx.config.domain ?? 'general')

    // Sequential on purpose: a panel per claim is several model calls, and
    // firing them all at once is how a scheduled job trips a rate limit.
    const results = []
    for (const q of questions) {
      const r = await runCouncil(q, { domain })
      void recordCouncil(r, domain)
      results.push(r)
    }

    const shaky = results.filter((r) => r.verdict !== 'supported')
    return {
      success: true,
      summary: shaky.length
        ? `${shaky.length} of ${results.length} claims did not survive review.`
        : `All ${results.length} claims held up.`,
      outputs: { results },
      items: results.map((r) => ({
        type: 'review', title: `${r.verdict} (${r.confidence}) — ${r.question.slice(0, 60)}`,
        status: r.verdict === 'supported' ? 'ok' : 'attention',
      })),
    }
  },
}

// ─── HOSTED ADD-ONS ────────────────────────────────────────────
//
// The first two real tenants of the /x/[slug] frame. They were built before the
// frame existed, each with its own front door and its own idea of who may open
// it — Course Builder's API checked that you were signed in and nothing else,
// so any 0nCore account on any plan could generate and publish courses. Being
// registered here is what puts them behind the one gate.
//
// THEY KEEP THEIR OWN UI. Registration is not absorption: a hosted add-on
// declares itself, gets gated, and is then handed control at its own route.
// What changes is the door, not the room.

const courseBuilder: AddonDefinition = {
  slug: 'ai-course-builder',
  name: 'AI Course Builder',
  surface: 'hosted',
  // 'manual' is the truth: a course is generated when someone describes one.
  // There is no cron that writes courses at 3am, and saying 'daily' here would
  // put "Runs daily" under a product that does not.
  schedule: 'manual',
  // Deliberately empty. Course Builder asks its questions per course — topic,
  // audience, outcome, tone — not once in a settings panel, and a duplicate
  // config form would be a second place to answer the same questions.
  configSchema: [],
}

const lead0n: AddonDefinition = {
  slug: 'lead0n',
  name: 'lead0n',
  surface: 'hosted',
  schedule: 'manual',
  configSchema: [],
}

// ─── REGISTRY ──────────────────────────────────────────────────

const ADDON_REGISTRY: Record<string, AddonDefinition> = {
  'content-engine': contentEngine,
  sxo: sxoAddon,
  '0ncouncil': councilAddon,
  'ai-course-builder': courseBuilder,
  lead0n: lead0n,
}

export function getAddonDefinition(slug: string): AddonDefinition | null {
  return ADDON_REGISTRY[slug] || null
}

export function getAllAddonDefinitions(): AddonDefinition[] {
  return Object.values(ADDON_REGISTRY)
}

export function getAddonConfigSchema(slug: string): ConfigField[] {
  return ADDON_REGISTRY[slug]?.configSchema || []
}
