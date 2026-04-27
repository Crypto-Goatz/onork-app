/**
 * TypeScript port of 0nMCP/landing_pages/render.js
 * Identical output. See note in 0nmcp-bridge.ts about the future
 * proxy model that will replace this duplication.
 */

import { ThemeFull } from './0nmcp-bridge'

interface RenderInput {
  theme: ThemeFull
  content: { sections?: Record<string, unknown>; content?: { sections?: Record<string, unknown> } }
  domain?: string
}

export function renderThemeToHTML({ theme, content, domain }: RenderInput): string {
  if (!theme) throw new Error('theme is required')
  const c = content as { content?: { sections?: Record<string, unknown> }; sections?: Record<string, unknown> }
  const sections = c?.content?.sections || c?.sections || {}
  const order: string[] = theme.sections

  const meta = (sections.hero || sections.hero_split || sections.hero_centered || sections.hero_minimal || {}) as Record<string, string>
  const title = meta.headline || theme.name
  const description = meta.subheadline || theme.description
  const url = domain ? `https://${domain}` : ''

  const cssVars = Object.entries(theme.tokens).map(([k, v]) => `  --${k}: ${v};`).join('\n')
  const fontFamily = theme.fonts?.heading || 'Inter'
  const bodyFont = theme.fonts?.body || 'Inter'
  const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700;800&family=${encodeURIComponent(bodyFont)}:wght@400;500;600;700&display=swap`
  const isDark = theme.id.includes('dark')

  const familyAlias = (name: string) => {
    const family = name.split('_')[0]
    return Object.keys(sections).find(k => k === family || k.startsWith(family + '_'))
  }

  const usedKeys = new Set<string>()
  const blueprintHtml = order.map(name => {
    let data = sections[name]
    let key = name
    if (!data) {
      const alias = familyAlias(name)
      if (alias) { data = sections[alias]; key = alias }
    }
    if (!data) return ''
    usedKeys.add(key)
    const renderer = (RENDERERS[name] || RENDERERS[key] || RENDERERS[name.split('_')[0]] || RENDERERS.unknown)
    return `<!-- section: ${name} -->\n${renderer(data as Record<string, unknown>, theme)}`
  }).filter(Boolean).join('\n')

  const extraHtml = Object.keys(sections)
    .filter(k => !usedKeys.has(k))
    .map(k => {
      const renderer = (RENDERERS[k] || RENDERERS[k.split('_')[0]] || RENDERERS.unknown)
      return `<!-- section: ${k} (extra) -->\n${renderer(sections[k] as Record<string, unknown>, theme)}`
    }).filter(Boolean).join('\n')

  const renderedSections = blueprintHtml + (extraHtml ? '\n' + extraHtml : '')

  return `<!DOCTYPE html>
<html lang="en" class="${isDark ? 'dark' : ''}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
${url ? `<meta property="og:url" content="${url}" />` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="${fontUrl}" />
<script src="https://cdn.tailwindcss.com"></script>
<style>
:root {
${cssVars}
}
* { font-family: '${bodyFont}', system-ui, sans-serif; }
h1, h2, h3, h4 { font-family: '${fontFamily}', system-ui, sans-serif; }
body { background: var(--background); color: var(--foreground); }
.btn-primary { background: var(--primary); color: var(--primary-foreground); border-radius: var(--radius); }
.btn-secondary { background: var(--secondary); color: var(--foreground); border-radius: var(--radius); }
.card { background: var(--background); border: 1px solid var(--border); border-radius: var(--radius); }
.muted { color: var(--muted-foreground, oklch(0.556 0 0)); }
.divider { border-color: var(--border); }
</style>
</head>
<body class="antialiased">
${renderedSections}
</body>
</html>`
}

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!))
}

function btn(cta: { label?: string; href?: string } | undefined, primary = true): string {
  if (!cta?.label) return ''
  const cls = primary ? 'btn-primary' : 'btn-secondary'
  return `<a href="${esc(cta.href || '#')}" class="${cls} inline-flex items-center px-6 py-3 font-semibold transition hover:opacity-90">${esc(cta.label)}</a>`
}

type Renderer = (d: Record<string, unknown>, theme: ThemeFull) => string

const RENDERERS: Record<string, Renderer> = {
  hero: (d) => `
<section class="px-6 py-20 lg:py-28">
  <div class="max-w-5xl mx-auto text-center">
    ${d.eyebrow ? `<div class="muted text-sm font-semibold uppercase tracking-wider mb-4">${esc(d.eyebrow)}</div>` : ''}
    <h1 class="text-4xl lg:text-6xl font-bold tracking-tight mb-6">${esc(d.headline)}</h1>
    ${d.subheadline ? `<p class="text-lg lg:text-xl muted max-w-2xl mx-auto mb-8">${esc(d.subheadline)}</p>` : ''}
    <div class="flex gap-3 justify-center flex-wrap">
      ${btn(d.primary_cta as never)}${btn(d.secondary_cta as never, false)}
    </div>
  </div>
</section>`,

  hero_split: (d) => `
<section class="px-6 py-20 lg:py-28">
  <div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
    <div>
      ${d.eyebrow ? `<div class="muted text-sm font-semibold uppercase tracking-wider mb-4">${esc(d.eyebrow)}</div>` : ''}
      <h1 class="text-4xl lg:text-5xl font-bold tracking-tight mb-6">${esc(d.headline)}</h1>
      ${d.subheadline ? `<p class="text-lg muted mb-8">${esc(d.subheadline)}</p>` : ''}
      <div class="flex gap-3 flex-wrap">${btn(d.primary_cta as never)}${btn(d.secondary_cta as never, false)}</div>
    </div>
    <div class="card aspect-video flex items-center justify-center muted">${esc((d as { image_prompt?: string }).image_prompt || 'Hero visual')}</div>
  </div>
</section>`,

  hero_centered: (d, t) => RENDERERS.hero(d, t),

  hero_minimal: (d) => `
<section class="px-6 py-24">
  <div class="max-w-3xl mx-auto">
    <h1 class="text-4xl lg:text-5xl font-bold tracking-tight mb-4">${esc(d.headline)}</h1>
    ${d.subheadline ? `<p class="muted text-lg mb-8">${esc(d.subheadline)}</p>` : ''}
    <div class="flex gap-3 flex-wrap">${btn(d.primary_cta as never)}${btn(d.secondary_cta as never, false)}</div>
  </div>
</section>`,

  logo_cloud: (d) => `
<section class="px-6 py-12 border-y divider">
  <div class="max-w-5xl mx-auto">
    ${d.label ? `<div class="muted text-sm uppercase tracking-wider text-center mb-6">${esc(d.label)}</div>` : ''}
    <div class="flex flex-wrap gap-8 justify-center items-center muted">
      ${(((d.logos as Array<{ name: string }>) || [])).map(l => `<span class="text-lg font-semibold">${esc(l.name)}</span>`).join('')}
    </div>
  </div>
</section>`,

  features_grid: (d) => `
<section class="px-6 py-20">
  <div class="max-w-6xl mx-auto">
    ${d.eyebrow ? `<div class="muted text-sm font-semibold uppercase tracking-wider text-center mb-3">${esc(d.eyebrow)}</div>` : ''}
    <h2 class="text-3xl lg:text-4xl font-bold text-center mb-12">${esc(d.headline || '')}</h2>
    <div class="grid md:grid-cols-3 gap-6">
      ${(((d.items as Array<{ title?: string; body?: string; icon?: string }>) || [])).map(i => `
        <div class="card p-6">
          <div class="text-2xl mb-3">${esc(i.icon || '◆')}</div>
          <h3 class="font-bold text-lg mb-2">${esc(i.title || '')}</h3>
          <p class="muted text-sm">${esc(i.body || '')}</p>
        </div>`).join('')}
    </div>
  </div>
</section>`,

  feature_bento: (d, t) => RENDERERS.features_grid(d, t),

  feature_strip: (d) => `
<section class="px-6 py-16">
  <div class="max-w-5xl mx-auto">
    <h2 class="text-2xl lg:text-3xl font-bold text-center mb-10">${esc(d.headline || '')}</h2>
    <div class="grid md:grid-cols-3 gap-8">
      ${(((d.items as Array<{ title?: string; body?: string }>) || [])).map(i => `
        <div>
          <h3 class="font-bold text-lg mb-2">${esc(i.title || '')}</h3>
          <p class="muted text-sm">${esc(i.body || '')}</p>
        </div>`).join('')}
    </div>
  </div>
</section>`,

  social_proof: (d, t) => RENDERERS.testimonial_block(d, t),
  testimonial_block: (d) => `
<section class="px-6 py-20">
  <div class="max-w-3xl mx-auto text-center">
    ${d.headline ? `<h2 class="text-2xl lg:text-3xl font-bold mb-10">${esc(d.headline)}</h2>` : ''}
    ${(((d.testimonials as Array<{ quote?: string; author?: string; role?: string; company?: string }>) || [])).map(t => `
      <blockquote class="card p-8 mb-6">
        <p class="text-lg italic mb-4">"${esc(t.quote || '')}"</p>
        <footer class="muted text-sm">— ${esc(t.author || '')}, ${esc(t.role || '')} · ${esc(t.company || '')}</footer>
      </blockquote>`).join('')}
  </div>
</section>`,

  testimonial_grid: (d) => `
<section class="px-6 py-20">
  <div class="max-w-6xl mx-auto">
    ${d.headline ? `<h2 class="text-3xl font-bold text-center mb-12">${esc(d.headline)}</h2>` : ''}
    <div class="grid md:grid-cols-2 gap-6">
      ${(((d.testimonials as Array<{ quote?: string; author?: string; role?: string }>) || [])).map(t => `
        <blockquote class="card p-6">
          <p class="italic mb-3">"${esc(t.quote || '')}"</p>
          <footer class="muted text-xs">— ${esc(t.author || '')}, ${esc(t.role || '')}</footer>
        </blockquote>`).join('')}
    </div>
  </div>
</section>`,

  pricing_table: (d, t) => RENDERERS.pricing_compare(d, t),
  pricing_compare: (d) => `
<section class="px-6 py-20">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl lg:text-4xl font-bold text-center mb-3">${esc(d.headline || 'Pricing')}</h2>
    ${d.subheadline ? `<p class="muted text-center mb-12">${esc(d.subheadline)}</p>` : ''}
    <div class="grid md:grid-cols-3 gap-6">
      ${(((d.tiers as Array<{ name?: string; price?: string; period?: string; description?: string; features?: string[]; cta?: { label?: string; href?: string }; featured?: boolean }>) || [])).map(t => `
        <div class="card p-6 ${t.featured ? 'ring-2' : ''}">
          <h3 class="font-bold text-xl mb-2">${esc(t.name || '')}</h3>
          <div class="text-3xl font-bold mb-1">${esc(t.price || '')}</div>
          ${t.period ? `<div class="muted text-sm mb-4">${esc(t.period)}</div>` : ''}
          <p class="muted text-sm mb-5">${esc(t.description || '')}</p>
          <ul class="space-y-2 mb-6">${(t.features || []).map(f => `<li class="text-sm">✓ ${esc(f)}</li>`).join('')}</ul>
          ${btn(t.cta)}
        </div>`).join('')}
    </div>
  </div>
</section>`,

  faq_accordion: (d) => `
<section class="px-6 py-20">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10">${esc(d.headline || 'FAQ')}</h2>
    <div class="space-y-3">
      ${(((d.items as Array<{ q?: string; a?: string }>) || [])).map(i => `
        <details class="card p-5">
          <summary class="font-semibold cursor-pointer">${esc(i.q || '')}</summary>
          <p class="muted text-sm mt-3">${esc(i.a || '')}</p>
        </details>`).join('')}
    </div>
  </div>
</section>`,

  metric_strip: (d) => `
<section class="px-6 py-16 border-y divider">
  <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
    ${(((d.items as Array<{ value?: string; label?: string }>) || [])).map(i => `
      <div>
        <div class="text-3xl font-bold">${esc(i.value || '')}</div>
        <div class="muted text-sm mt-1">${esc(i.label || '')}</div>
      </div>`).join('')}
  </div>
</section>`,

  cta_band: (d) => `
<section class="px-6 py-20">
  <div class="max-w-4xl mx-auto card p-12 text-center">
    <h2 class="text-3xl lg:text-4xl font-bold mb-3">${esc(d.headline || '')}</h2>
    ${d.subheadline ? `<p class="muted mb-8">${esc(d.subheadline)}</p>` : ''}
    <div class="flex gap-3 justify-center flex-wrap">${btn(d.cta as never)}${btn(d.secondary as never, false)}</div>
  </div>
</section>`,

  cta_terminal: (d, t) => RENDERERS.cta_band(d, t),
  newsletter_cta: (d, t) => RENDERERS.cta_band(d, t),

  code_block: (d) => `
<section class="px-6 py-16">
  <div class="max-w-4xl mx-auto">
    <h2 class="text-2xl font-bold mb-6">${esc(d.headline || '')}</h2>
    <pre class="card p-5 overflow-auto text-sm" style="font-family: monospace"><code>${esc(d.code || '')}</code></pre>
    ${d.caption ? `<p class="muted text-sm mt-3">${esc(d.caption)}</p>` : ''}
  </div>
</section>`,

  integration_grid: (d) => `
<section class="px-6 py-20">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-3xl font-bold text-center mb-10">${esc(d.headline || 'Integrations')}</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      ${(((d.items as Array<{ name?: string; description?: string }>) || [])).map(i => `
        <div class="card p-5 text-center">
          <div class="text-lg font-bold mb-1">${esc(i.name || '')}</div>
          <p class="muted text-xs">${esc(i.description || '')}</p>
        </div>`).join('')}
    </div>
  </div>
</section>`,

  media_split: (d) => `
<section class="px-6 py-20">
  <div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
    <div class="card aspect-video flex items-center justify-center muted">${esc((d as { image_prompt?: string }).image_prompt || 'Media')}</div>
    <div>
      ${d.eyebrow ? `<div class="muted text-sm font-semibold uppercase tracking-wider mb-3">${esc(d.eyebrow)}</div>` : ''}
      <h2 class="text-3xl font-bold mb-4">${esc(d.headline || '')}</h2>
      <p class="muted mb-6">${esc(d.body || '')}</p>
      ${btn(d.cta as never)}
    </div>
  </div>
</section>`,

  footer: (d) => {
    const cols = (d.columns as Array<{ heading?: string; links?: Array<{ label?: string; href?: string }> }>) || []
    return `
<footer class="px-6 py-12 border-t divider">
  <div class="max-w-6xl mx-auto grid md:grid-cols-${Math.min(4, cols.length || 1)} gap-8">
    ${cols.map(c => `
      <div>
        <h4 class="font-semibold mb-3">${esc(c.heading || '')}</h4>
        <ul class="space-y-2 muted text-sm">
          ${(c.links || []).map(l => `<li><a href="${esc(l.href || '#')}" class="hover:underline">${esc(l.label || '')}</a></li>`).join('')}
        </ul>
      </div>`).join('')}
  </div>
  ${d.copyright ? `<div class="max-w-6xl mx-auto mt-8 muted text-xs">${esc(d.copyright)}</div>` : ''}
</footer>`
  },

  unknown: () => '',
}
