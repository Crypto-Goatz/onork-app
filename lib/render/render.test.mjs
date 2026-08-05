import { strict as assert } from 'node:assert'
import { renderPage } from './index.ts'

/**
 * Golden tests for the renderer.
 *
 * These assert on the actual bytes, not on "it didn't throw". The renderer's
 * whole job is producing a specific string; a test that only checks for absence
 * of exceptions would pass on an empty page.
 */

let passed = 0
const failures = []
const test = (name, fn) => {
  try {
    fn()
    passed++
    console.log('  ✓ ' + name)
  } catch (e) {
    failures.push(name + ' — ' + e.message)
    console.log('  ✗ ' + name + '\n      ' + e.message.split('\n')[0])
  }
}

const page = {
  id: 'p1',
  name: 'Acme Plumbing',
  brand: { business: 'Acme Plumbing', sells: 'Emergency plumbing in Ligonier' },
  blocks: [
    {
      id: 'h1',
      kind: 'hero',
      fallback: { headline: 'Burst pipe? We answer at 2am.', sub: 'Same-day callout.', cta: 'Call now' },
      editable: [
        { key: 'headline', label: 'Headline', intent: '', max: 70 },
        { key: 'sub', label: 'Sub', intent: '', max: 140 },
        { key: 'cta', label: 'CTA', intent: '', max: 24 },
      ],
      live: true,
      style: {
        backgroundColor: '#0F172A',
        textColor: '#F8FAFC',
        accentColor: '#FF6B35',
        buttonTextColor: '#ffffff',
        paddingTop: 'py-20',
        paddingBottom: 'py-20',
        borderRadius: 'rounded-2xl',
        shadow: 'shadow-lg',
        align: 'center',
      },
    },
    {
      id: 'pr1',
      kind: 'pricing',
      fallback: { title: 'Pricing' },
      editable: [],
      live: false,
      frozen: { 'Callout': '$89', 'Hourly': '$120' },
      style: { backgroundColor: '#ffffff', paddingTop: 'py-16', paddingBottom: 'py-16' },
    },
  ],
}

console.log('\n── document target ──')
const doc = renderPage(page, { target: 'document', personaliseEndpoint: '/api/personalize' })

test('emits a full HTML document', () => {
  assert.ok(doc.html.startsWith('<!doctype html>'), 'missing doctype')
  assert.ok(doc.html.includes('<title>Acme Plumbing</title>'))
})

test('THE FALLBACK RULE: real copy is in the HTML, not injected later', () => {
  assert.ok(doc.html.includes('Burst pipe? We answer at 2am.'),
    'headline text missing from published HTML')
  assert.ok(doc.html.includes('Call now'), 'button text missing')
})

test('personalisable fields carry swap hooks', () => {
  assert.match(doc.html, /data-blk="h1" data-fld="headline"/)
  assert.match(doc.html, /data-blk="h1" data-fld="cta"/)
})

test('frozen pricing renders verbatim', () => {
  assert.ok(doc.html.includes('$89') && doc.html.includes('$120'))
})

test('pricing has NO swap hooks — money is never rewritten', () => {
  const pricingSection = doc.html.slice(doc.html.indexOf('data-kind="pricing"'))
  assert.ok(!pricingSection.includes('data-fld='),
    'pricing exposed an editable field to the personaliser')
})

test('style tokens resolved to real CSS', () => {
  assert.ok(doc.css.includes('padding-top:5rem'), 'py-20 did not resolve')
  assert.ok(doc.css.includes('border-radius:1rem'), 'rounded-2xl did not resolve')
  assert.ok(doc.css.includes('background-color:#0F172A'), 'colour lost')
})

test('document target uses classes, not inline styles', () => {
  assert.ok(!doc.html.includes('style="padding'), 'inlined styles on the document target')
  assert.ok(doc.css.length > 50, 'no stylesheet produced')
})

test('personaliser script is fail-silent', () => {
  assert.ok(doc.html.includes('.catch(function(){})'), 'no catch on the fetch')
  assert.ok(doc.html.includes('/api/personalize'))
})

console.log('\n── blog target ──')
const blog = renderPage(page, { target: 'blog', personaliseEndpoint: '/api/personalize' })

test('blog emits NO script and NO style block', () => {
  assert.ok(!blog.html.includes('<script'), 'script would be stripped by the sanitiser')
  assert.ok(!blog.html.includes('<style'), 'style block would be stripped')
  assert.ok(!blog.html.includes('<!doctype'), 'blog body must be a fragment')
})

test('blog inlines its styles so it is not naked after sanitising', () => {
  assert.match(blog.html, /style="[^"]*padding-top:5rem/)
  assert.equal(blog.css, '', 'blog should not produce a separate stylesheet')
})

test('blog still contains the real copy', () => {
  assert.ok(blog.html.includes('Burst pipe? We answer at 2am.'))
})

test('blog WARNS that personalisation is unavailable rather than silently dropping it', () => {
  assert.ok(blog.warnings.some((w) => /personalisation is disabled/i.test(w)),
    'no warning about disabled personalisation')
})

console.log('\n── widget target ──')
const widget = renderPage(page, { target: 'widget', classPrefix: 'acme' })

test('widget is a scoped fragment', () => {
  assert.ok(widget.html.startsWith('<div id="acme-root">'))
  assert.ok(!widget.html.includes('<!doctype'))
})

test('every widget rule is scoped to the root — no leaking into the host page', () => {
  const styleBlock = widget.html.slice(widget.html.indexOf('<style>'), widget.html.indexOf('</style>'))
  const rules = styleBlock.split('\n').filter((l) => l.trim().startsWith('.'))
  assert.equal(rules.length, 0, 'found an unscoped rule: ' + rules[0])
  assert.ok(styleBlock.includes('#acme-root .acme-'), 'rules not prefixed with the root id')
})

console.log('\n── safety ──')

test('HTML in copy is escaped, not executed', () => {
  const evil = {
    ...page,
    blocks: [{
      ...page.blocks[0],
      fallback: { headline: '<img src=x onerror=alert(1)>', sub: "Bob's & Co", cta: 'Go' },
    }],
  }
  const out = renderPage(evil, { target: 'document' })
  assert.ok(!out.html.includes('<img src=x onerror'), 'XSS survived escaping')
  assert.ok(out.html.includes('&lt;img src=x onerror=alert(1)&gt;'))
  assert.ok(out.html.includes('Bob&#39;s &amp; Co'))
})

test('javascript: URLs are neutralised', () => {
  const evil = {
    ...page,
    blocks: [{ ...page.blocks[0], frozen: { ctaUrl: 'javascript:alert(1)' } }],
  }
  const out = renderPage(evil, { target: 'document' })
  assert.ok(!out.html.includes('javascript:'), 'javascript: href survived')
  assert.ok(out.html.includes('href="#"'))
})

test('CSS injection through a colour value is rejected', () => {
  const evil = {
    ...page,
    blocks: [{
      ...page.blocks[0],
      style: { ...page.blocks[0].style, backgroundColor: 'red;}body{display:none' },
    }],
  }
  const out = renderPage(evil, { target: 'document' })
  assert.ok(!out.css.includes('display:none'), 'CSS injection landed in the stylesheet')
})

console.log('\n── resilience ──')

test('unknown block kind is skipped and reported, not fatal', () => {
  const odd = { ...page, blocks: [...page.blocks, { id: 'x', kind: 'teleporter', fallback: {}, editable: [] }] }
  const out = renderPage(odd, { target: 'document' })
  assert.equal(out.stats.blocks, 2, 'unknown block was rendered')
  assert.ok(out.warnings.some((w) => w.includes('teleporter')))
})

test('live block with a missing fallback is warned about', () => {
  const gap = {
    ...page,
    blocks: [{ ...page.blocks[0], fallback: { sub: 'x', cta: 'y' } }],
  }
  const out = renderPage(gap, { target: 'document' })
  assert.ok(out.warnings.some((w) => /headline/.test(w)), 'no warning for the empty headline')
})

test('output is deterministic — same spec, same bytes', () => {
  const a = renderPage(page, { target: 'document' }).html
  const b = renderPage(page, { target: 'document' }).html
  assert.equal(a, b)
})

console.log('\n── imported-builder vocabulary (regression) ──')

/**
 * The builder's own key names, as `import.ts` produces them. This shape
 * rendered as EMPTY sections — right colours, right spacing, no words — because
 * the renderer only knew the native `headline`/`sub`/`cta` names. Structural
 * tests all passed while the page was blank.
 */
const imported = {
  id: 'p2',
  name: 'Imported',
  brand: { business: 'Acme' },
  blocks: [
    {
      id: 'hero-1', kind: 'hero',
      fallback: { title: 'Websites that answer the phone', subtitle: 'RocketOpp', description: 'Live in a week.', buttonText: 'See a demo' },
      editable: [
        { key: 'title', label: '', intent: '', max: 70 },
        { key: 'subtitle', label: '', intent: '', max: 30 },
        { key: 'description', label: '', intent: '', max: 260 },
        { key: 'buttonText', label: '', intent: '', max: 24 },
      ],
      live: true,
      style: { backgroundColor: '#0F172A', paddingTop: 'py-24', paddingBottom: 'py-24' },
    },
    {
      id: 'price-1', kind: 'pricing',
      fallback: {}, editable: [], live: false,
      frozen: { title: 'Pricing', Starter: '$49/mo', Pro: '$149/mo' },
      style: { backgroundColor: '#ffffff' },
    },
  ],
}

test('builder key names render — not an empty section', () => {
  const out = renderPage(imported, { target: 'document' })
  assert.ok(out.html.includes('Websites that answer the phone'), 'title did not render')
  assert.ok(out.html.includes('RocketOpp'), 'subtitle did not render')
  assert.ok(out.html.includes('Live in a week.'), 'description did not render')
  assert.ok(out.html.includes('See a demo'), 'buttonText did not render')
})

test('no section is rendered empty', () => {
  const out = renderPage(imported, { target: 'document' })
  const empties = out.html.match(/<section[^>]*><div[^>]*><\/div><\/section>/g) || []
  assert.equal(empties.length, 0, `${empties.length} section(s) rendered with no content`)
})

test('imported hero keeps its swap hooks under the builder names', () => {
  const out = renderPage(imported, { target: 'document' })
  assert.match(out.html, /data-fld="title"/)
  assert.match(out.html, /data-fld="buttonText"/)
})

test('pricing title becomes a heading, not a price row', () => {
  const out = renderPage(imported, { target: 'document' })
  assert.ok(out.html.includes('<h2 class="w0n-') || out.html.includes('>Pricing<'), 'no heading')
  assert.ok(!/<span>title<\/span>/.test(out.html), 'rendered "title" as a price row')
  assert.ok(out.html.includes('$49/mo') && out.html.includes('$149/mo'), 'real prices missing')
})

console.log(`\n${passed} passed, ${failures.length} failed`)
if (failures.length) {
  failures.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
