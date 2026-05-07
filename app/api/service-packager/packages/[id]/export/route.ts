/**
 * GET /api/service-packager/packages/[id]/export?format=fiverr|upwork|portfolio|landing|social|on|crm|json
 *
 * Returns text/plain (or text/html for landing) that the user can copy
 * straight into the destination platform's submission form.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type {
  FiverrGig,
  PortfolioItem,
  UpworkListing,
  LandingPage,
  SocialPosts,
  OnApp,
  CRMService,
} from '@/lib/service-packager/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Format =
  | 'fiverr'
  | 'upwork'
  | 'portfolio'
  | 'landing'
  | 'social'
  | 'on'
  | 'crm'
  | 'json'

const VALID_FORMATS: Format[] = [
  'fiverr', 'upwork', 'portfolio', 'landing', 'social', 'on', 'crm', 'json',
]

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createServerClient()
  const user = (await supabase.auth.getSession()).data.session?.user ?? null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const format = (new URL(req.url).searchParams.get('format') ?? 'json') as Format
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json({ error: `format must be one of ${VALID_FORMATS.join('|')}` }, { status: 400 })
  }

  const { data: pkg, error } = await supabase
    .from('service_packages')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pkg) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const filename = `${slugify(pkg.service_name)}-${format}`

  if (format === 'fiverr')
    return text(formatFiverr(pkg.fiverr_gig as FiverrGig | null), `${filename}.txt`)
  if (format === 'upwork')
    return text(formatUpwork(pkg.upwork_listing as UpworkListing | null), `${filename}.txt`)
  if (format === 'portfolio')
    return text(formatPortfolio(pkg.portfolio_item as PortfolioItem | null), `${filename}.md`)
  if (format === 'landing')
    return html(formatLandingHTML(pkg.landing_page as LandingPage | null, pkg.service_name), `${filename}.html`)
  if (format === 'social')
    return text(formatSocial(pkg.social_posts as SocialPosts | null), `${filename}.txt`)
  if (format === 'on')
    return text(JSON.stringify(pkg.on_marketplace_app as OnApp | null, null, 2), `${filename}.0n.json`, 'application/json')
  if (format === 'crm')
    return text(formatCRM(pkg.crm_service as CRMService | null), `${filename}.md`)

  // json: full package
  return NextResponse.json(pkg)
}

function text(content: string, filename: string, contentType = 'text/plain; charset=utf-8') {
  return new NextResponse(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

function html(content: string, filename: string) {
  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
}

function slugify(s: string): string {
  return (s ?? 'package')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'package'
}

// ── Fiverr ────────────────────────────────────────────────────────────

function formatFiverr(gig: FiverrGig | null): string {
  if (!gig) return '(no fiverr gig generated)'
  const lines: string[] = []
  lines.push('FIVERR GIG — copy each section into the form')
  lines.push('=' .repeat(60))
  lines.push('')
  lines.push(`TITLE (${gig.title.length}/80):`)
  lines.push(gig.title)
  lines.push('')
  lines.push(`CATEGORY: ${gig.category}`)
  lines.push(`SUBCATEGORY: ${gig.subcategory}`)
  lines.push(`SERVICE TYPE: ${gig.service_type}`)
  lines.push('')
  lines.push(`TAGS (${gig.tags.length}/5):`)
  gig.tags.forEach((t, i) => lines.push(`  ${i + 1}. ${t}`))
  lines.push('')
  for (const tier of ['basic', 'standard', 'premium'] as const) {
    const p = gig.packages[tier]
    lines.push('-'.repeat(60))
    lines.push(`${tier.toUpperCase()} — $${p.price_usd}`)
    lines.push(`  Title: ${p.title}`)
    lines.push(`  Description (${p.description.length}/100): ${p.description}`)
    lines.push(`  Delivery: ${p.delivery_days} day(s)  •  Revisions: ${p.revisions}`)
    lines.push(`  Features:`)
    p.features.forEach((f) => lines.push(`    - ${f}`))
    lines.push('')
  }
  lines.push('-'.repeat(60))
  lines.push(`DESCRIPTION (${gig.description.length} chars, target 1200-5000):`)
  lines.push('')
  lines.push(gig.description)
  lines.push('')
  lines.push('-'.repeat(60))
  lines.push('REQUIREMENTS (buyer answers before order starts):')
  gig.requirements.forEach((r, i) => lines.push(`  ${i + 1}. ${r}`))
  lines.push('')
  lines.push('FAQ:')
  gig.faq.forEach((f, i) => {
    lines.push(`  Q${i + 1}: ${f.question}`)
    lines.push(`  A${i + 1}: ${f.answer}`)
    lines.push('')
  })
  if (gig.extras?.length) {
    lines.push('GIG EXTRAS:')
    gig.extras.forEach((e) =>
      lines.push(`  + ${e.title} — $${e.price_usd}, ${e.delivery_days} day(s) — ${e.description}`)
    )
  }
  return lines.join('\n')
}

// ── Upwork ────────────────────────────────────────────────────────────

function formatUpwork(l: UpworkListing | null): string {
  if (!l) return '(no upwork listing generated)'
  return [
    'UPWORK LISTING',
    '='.repeat(60),
    '',
    `TITLE (${l.title.length}/100):`,
    l.title,
    '',
    `RATE: $${l.hourly_rate_range.min} – $${l.hourly_rate_range.max}/hr`,
    `FIXED: $${l.fixed_price_range.min} – $${l.fixed_price_range.max}`,
    '',
    `SKILLS:`,
    ...l.skills.map((s) => `  - ${s}`),
    '',
    `OVERVIEW:`,
    l.overview,
    '',
    `PORTFOLIO BLURB:`,
    l.portfolio_description,
    '',
    `PROPOSAL TEMPLATE:`,
    l.proposal_template,
  ].join('\n')
}

// ── Portfolio (markdown) ──────────────────────────────────────────────

function formatPortfolio(p: PortfolioItem | null): string {
  if (!p) return '(no portfolio item generated)'
  return [
    `# ${p.title}`,
    `### ${p.subtitle}`,
    '',
    `![${p.cover_image.alt}](${p.cover_image.url})`,
    '',
    p.description,
    '',
    `**Pricing:** ${p.pricing_display}`,
    `**Delivery:** ${p.delivery_display}`,
    `**For:** ${p.target_audience}`,
    '',
    `## What's included`,
    ...p.features.map((f) => `- ${f}`),
    '',
    `> ${p.case_study_hook}`,
    '',
    `[${p.cta_text}](${p.cta_url})`,
    '',
    `*Tags: ${p.tags.join(', ')}*`,
  ].join('\n')
}

// ── Landing page (standalone HTML) ────────────────────────────────────

function formatLandingHTML(l: LandingPage | null, name: string): string {
  if (!l) return '<!-- no landing page generated -->'
  const features = l.features
    .map(
      (f) =>
        `<div class="feat"><strong>${escape(f.title)}</strong><p>${escape(f.description)}</p></div>`
    )
    .join('\n')
  const tiers = l.pricing_section.tiers
    .map(
      (t) =>
        `<div class="tier"><h3>${escape(t.name)}</h3><div class="price">${escape(t.price)}</div><ul>${t.features
          .map((x) => `<li>${escape(x)}</li>`)
          .join('')}</ul><a class="cta" href="#">${escape(t.cta)}</a></div>`
    )
    .join('\n')
  const faq = l.faq.map((q) => `<details><summary>${escape(q.q)}</summary><p>${escape(q.a)}</p></details>`).join('\n')

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(l.meta_title || name)}</title>
<meta name="description" content="${escape(l.meta_description || '')}">
<meta property="og:title" content="${escape(l.og_title || l.meta_title || name)}">
<meta property="og:description" content="${escape(l.og_description || l.meta_description || '')}">
<style>
  :root{--bg:#0d1117;--card:#161b22;--border:#30363d;--text:#f0f4f8;--muted:#9ba2ad;--accent:#6EE05A}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,-apple-system,Segoe UI,Inter,sans-serif}
  .wrap{max-width:1080px;margin:0 auto;padding:48px 24px}
  h1,h2,h3{margin:0 0 16px}h1{font-size:48px;line-height:1.1}h2{font-size:32px;margin-top:48px}
  .lead{color:var(--muted);font-size:20px;margin-bottom:32px}
  .cta{display:inline-block;background:var(--accent);color:#04140a;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:24px}
  .feat,.tier{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:24px}
  .price{font-size:32px;font-weight:700;color:var(--accent);margin:8px 0 16px}
  .tier ul{padding-left:18px}
  details{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-bottom:8px}
  summary{cursor:pointer;font-weight:600}
  .quote{background:var(--card);border-left:3px solid var(--accent);padding:18px 22px;margin:32px 0;color:var(--muted)}
  .final{text-align:center;padding:64px 24px;background:linear-gradient(180deg,var(--card),transparent);border-radius:16px;margin-top:64px}
</style></head>
<body><div class="wrap">
<h1>${escape(l.headline)}</h1>
<p class="lead">${escape(l.subheadline)}</p>
<a class="cta" href="#pricing">${escape(l.hero_cta)}</a>

<h2>The problem</h2>
<p>${escape(l.problem_section)}</p>

<h2>The solution</h2>
<p>${escape(l.solution_section)}</p>

<h2>What you get</h2>
<div class="grid">${features}</div>

<h2 id="pricing">Pricing</h2>
<div class="grid">${tiers}</div>

<div class="quote">${escape(l.social_proof)}</div>

<h2>FAQ</h2>
${faq}

<div class="final">
  <h2>${escape(l.final_cta.headline)}</h2>
  <p class="lead">${escape(l.final_cta.subtext)}</p>
  <a class="cta" href="#">${escape(l.final_cta.button)}</a>
</div>
</div></body></html>`
}

function escape(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;'
  )
}

// ── Social ────────────────────────────────────────────────────────────

function formatSocial(s: SocialPosts | null): string {
  if (!s) return '(no social posts generated)'
  return [
    `LINKEDIN  (VPIS ${s.linkedin.vpis_score} — ${s.linkedin.patterns_fired.join(', ')})`,
    '─'.repeat(60),
    s.linkedin.text,
    '',
    `REDDIT  (subreddits: ${s.reddit.subreddits.join(', ')})`,
    '─'.repeat(60),
    `Title: ${s.reddit.title}`,
    '',
    s.reddit.body,
    '',
    `TWITTER`,
    '─'.repeat(60),
    s.twitter.text,
  ].join('\n')
}

// ── CRM service (markdown) ────────────────────────────────────────────

function formatCRM(c: CRMService | null): string {
  if (!c) return '(no crm service generated)'
  const lines: string[] = []
  lines.push(`# CRM Productized Service`)
  lines.push('')
  lines.push(`## Pipeline: ${c.pipeline.name}`)
  c.pipeline.stages.forEach((s, i) => lines.push(`${i + 1}. ${s}`))
  lines.push('')
  lines.push(`## Custom fields`)
  c.custom_fields.forEach((f) => lines.push(`- **${f.name}** (\`${f.key}\`, ${f.type})`))
  lines.push('')
  lines.push(`## Tags`)
  lines.push(c.tags.map((t) => `\`${t}\``).join(' '))
  lines.push('')
  lines.push(`## Email templates`)
  c.email_templates.forEach((e) => {
    lines.push(`### ${e.name}`)
    lines.push(`**Subject:** ${e.subject}`)
    lines.push('')
    lines.push(e.body)
    lines.push('')
  })
  return lines.join('\n')
}
