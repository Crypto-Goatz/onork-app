#!/usr/bin/env node
/**
 * The refactor that moved the Markdown parser out of `lib/guides/markdown.ts`
 * and made presentation a parameter must not have changed one byte of what
 * /guides serves. This asserts that against the real guide content, not a
 * fixture — a parity test on hand-written samples proves the samples.
 *
 * It also covers the two things the new consumer depends on and the old one
 * never exercised: the PORTABLE theme, and `escapeText`.
 *
 *   node tools/test-markdown-parity.mjs
 */
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
/**
 * The pre-refactor renderer, pinned by blob SHA rather than by a path in /tmp
 * or a commit-relative ref. A baseline that can go missing is a test that
 * quietly reports SKIP forever; a blob SHA is immutable and always present in
 * this repo's object database.
 */
const BASELINE_BLOB = '026834f1ff8408bda6d39486f967c3ce4ae9d265'

let pass = 0
let fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`) }
}

// ── Compile both implementations with tsc so this needs no bundler ────────
const work = mkdtempSync(join(tmpdir(), 'md-parity-'))
function compile(files) {
  execFileSync(
    join(ROOT, 'node_modules/.bin/tsc'),
    [...files, '--outDir', work, '--module', 'esnext', '--target', 'es2022',
     '--moduleResolution', 'bundler', '--skipLibCheck'],
    { cwd: ROOT, stdio: 'pipe' },
  )
}

console.log('markdown parity\n')

let renderNew, renderWith, ONCORE_DARK, PORTABLE, renderOld
try {
  compile([join(ROOT, 'lib/markdown/render.ts')])
  const mod = await import(join(work, 'render.js'))
  renderWith = mod.renderMarkdownWith
  ONCORE_DARK = mod.ONCORE_DARK
  PORTABLE = mod.PORTABLE
  renderNew = (md) => renderWith(md, ONCORE_DARK)
} catch (e) {
  console.log('  FAIL could not compile lib/markdown/render.ts')
  console.log(String(e.stdout ?? e.message))
  process.exit(1)
}

try {
  const baselineSrc = execFileSync('git', ['cat-file', 'blob', BASELINE_BLOB], {
    cwd: ROOT, encoding: 'utf8',
  })
  const baselinePath = join(work, 'baseline.ts')
  writeFileSync(baselinePath, baselineSrc)
  compile([baselinePath])           // it had no imports, so it compiles standalone
  renderOld = (await import(join(work, 'baseline.js'))).renderMarkdown
  check('baseline is the pre-refactor renderer', typeof renderOld === 'function' && baselineSrc.includes('ParseState'))
} catch (e) {
  console.log(`  FAIL baseline blob ${BASELINE_BLOB} could not be loaded — parity cannot be asserted`)
  console.log(String(e.stdout ?? e.stderr ?? e.message).slice(0, 1000))
  process.exit(1)
}

// ── 1. Byte parity on every real guide ────────────────────────────────────
const guideDir = join(ROOT, 'content/guides')
const guides = readdirSync(guideDir).filter((f) => f.endsWith('.md'))
check('guide corpus is non-empty', guides.length > 0, `${guideDir}`)
for (const f of guides) {
  const md = readFileSync(join(guideDir, f), 'utf8')
  const a = renderOld(md)
  const b = renderNew(md)
  let detail = ''
  if (a !== b) {
    const al = a.split('\n'), bl = b.split('\n')
    const i = al.findIndex((l, n) => l !== bl[n])
    detail = `first divergence line ${i + 1}\n       old: ${al[i]}\n       new: ${bl[i]}`
  }
  check(`byte parity — ${f} (${md.length}B)`, a === b, detail)
}

// ── 2. Byte parity on the constructs the guides may not contain ───────────
const EDGE = [
  ['heading levels', '# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6'],
  ['hr', 'a\n\n---\n\nb'],
  ['bullet list', '- one\n- two\n- three'],
  ['numbered list', '1. one\n2. two'],
  ['list switch', '- bullet\n1. number'],
  ['blockquote', '> quoted line\n> second line\n\nafter'],
  ['table', '| a | b |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |'],
  ['table no outer pipes', 'a | b\n--- | ---\n1 | 2'],
  ['fenced code w/ lang', '```ts\nconst x = 1 < 2 && 3\n```'],
  ['fenced code no lang', '```\nplain & <raw>\n```'],
  ['unterminated fence', '```js\nnever closed'],
  ['inline code', 'use `a && b` here'],
  ['bold + italic', '**bold** and *italic* and **both *nested* here**'],
  ['external link', 'see [docs](https://example.com/a?x=1&y=2)'],
  ['internal link', 'see [home](/deck)'],
  ['paragraph wrap', 'line one\nline two\nline three'],
  ['empty', ''],
  ['whitespace only', '\n\n   \n\n'],
]
for (const [name, md] of EDGE) {
  const a = renderOld(md), b = renderNew(md)
  check(`byte parity — ${name}`, a === b, a === b ? '' : `old: ${a}\n       new: ${b}`)
}

// ── 3. PORTABLE theme: structure survives, our colours do not travel ──────
const sample = '## Heading\n\nA **bold** word.\n\n- item one\n- item two\n\n| a | b |\n| --- | --- |\n| 1 | 2 |'
const portable = renderWith(sample, PORTABLE)
check('portable emits semantic tags', /<h2[\s>]/.test(portable) && /<ul[\s>]/.test(portable) && /<table[\s>]/.test(portable), portable)
check('portable carries no Tailwind classes', !/class="[^"]*(?:text-white|mb-4|bg-black)/.test(portable), portable)
check('portable assumes no foreground colour', !/color:\s*#/.test(portable), portable)
check('portable survives style stripping', (() => {
  const stripped = portable.replace(/\s(?:style|class)="[^"]*"/g, '')
  return /<h2>Heading<\/h2>/.test(stripped) && /<li>item one<\/li>/.test(stripped)
})(), portable)

// ── 4. escapeText: model output cannot inject markup ──────────────────────
const hostile = 'Hi <script>alert(1)</script> & <img src=x onerror=alert(2)> done'
const escaped = renderWith(hostile, PORTABLE, { escapeText: true })
check('escapeText neutralises script tags', !/<script/i.test(escaped), escaped)
check('escapeText neutralises img/onerror', !/<img/i.test(escaped), escaped)
check('escapeText keeps the text visible', /alert\(1\)/.test(escaped), escaped)
check('escapeText does not double-escape ampersands',
  !/&amp;amp;/.test(renderWith('a & b', PORTABLE, { escapeText: true })),
  renderWith('a & b', PORTABLE, { escapeText: true }))
check('escapeText leaves fenced code escaped exactly once',
  (() => {
    const out = renderWith('```\na < b && c\n```', PORTABLE, { escapeText: true })
    return out.includes('a &lt; b &amp;&amp; c') && !out.includes('&amp;lt;')
  })(),
  renderWith('```\na < b && c\n```', PORTABLE, { escapeText: true }))
check('escapeText leaves inline code escaped exactly once',
  (() => {
    const out = renderWith('use `a < b` ok', PORTABLE, { escapeText: true })
    return out.includes('a &lt; b') && !out.includes('&amp;lt;')
  })(),
  renderWith('use `a < b` ok', PORTABLE, { escapeText: true }))
check('escapeText does not break blockquotes',
  /<blockquote/.test(renderWith('> quoted', PORTABLE, { escapeText: true })),
  renderWith('> quoted', PORTABLE, { escapeText: true }))
check('escapeText escapes quotes inside hrefs',
  (() => {
    const out = renderWith('[x](http://a"onmouseover=1)', PORTABLE, { escapeText: true })
    // The quote must not close the attribute and start a new one.
    return out.includes('href="http://a&quot;onmouseover=1"') && !/"onmouseover/.test(out)
  })(),
  renderWith('[x](http://a"onmouseover=1)', PORTABLE, { escapeText: true }))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
