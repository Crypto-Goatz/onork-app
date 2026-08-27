#!/usr/bin/env node
/**
 * G-CONTENT — the four defects Dex found in the published meta-course, each
 * pinned by an assertion so the next "the LMS renders markdown" comment has
 * something to argue with.
 *
 *   1. markdown into an HTML field  -> lesson bodies are HTML
 *   2. whitespace collapse          -> paragraphs are <p>, not one blob
 *   3. contentType hardcoded        -> the value is a named constant with the
 *                                      measured accept/reject table beside it
 *   4. sales page published as #1   -> the description is computed, and cannot
 *                                      contain a promise nobody agreed to
 *
 *   node tools/test-course-lesson-body.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`) }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`) }
}

// The publisher's body builders are pure, but the module imports @/lib/crm.
// Run the assertions inside tsx so the alias resolves and the REAL module is
// under test — a re-implementation here would only ever test itself.
const script = `
import { __test__ } from '@/lib/course-builder/publisher'
const { composeFullLessonMarkdown, toLessonHtml, buildAboutMarkdown, LESSON_CONTENT_TYPE } = __test__

const lesson = {
  index: 1,
  title: 'Lesson One',
  summary: 'A summary sentence.',
  content: '## Section A\\n\\nFirst paragraph with **bold** text.\\n\\nSecond paragraph entirely.\\n\\n- point one\\n- point two\\n\\n| col | val |\\n| --- | --- |\\n| a | 1 |',
  wordCount: 40,
  quiz: [{ question: 'Q1?', options: ['x', 'y'], correctAnswer: 0, explanation: 'because x' }],
  resources: [{ title: 'Docs', url: 'https://example.com/d', type: 'link' }],
}
const hostile = { ...lesson, content: 'Before <script>alert(1)</script> after.' }
const course = {
  outline: { title: 'The Course', description: 'What it is.', lessons: [], certificateEnabled: false },
  lessons: [lesson, { ...lesson, index: 2, title: 'Lesson Two', summary: 'Second summary.' }],
  totalWordCount: 1234,
  estimatedDuration: '1h 5m',
}

console.log(JSON.stringify({
  html: toLessonHtml(composeFullLessonMarkdown(lesson)),
  hostileHtml: toLessonHtml(composeFullLessonMarkdown(hostile)),
  md: composeFullLessonMarkdown(lesson),
  about: buildAboutMarkdown(course),
  aboutHtml: toLessonHtml(buildAboutMarkdown(course)),
  contentType: LESSON_CONTENT_TYPE,
}))
`
const dir = mkdtempSync(join(tmpdir(), 'course-body-'))
const file = join(dir, 'probe.ts')
writeFileSync(file, script)

console.log('course lesson body\n')

let r
try {
  const out = execFileSync(join(ROOT, 'node_modules/.bin/tsx'), [file], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
    env: { ...process.env, NODE_ENV: 'test' },
  })
  r = JSON.parse(out.trim().split('\n').pop())
} catch (e) {
  console.log('  FAIL could not load the publisher')
  console.log(String(e.stderr ?? e.message).slice(0, 2000))
  process.exit(1)
}

// ── Defect 1 — markdown must not reach the field as literal characters ────
check('no literal ## heading marker survives', !/(^|\n)#{1,6}\s/.test(r.html), r.html.slice(0, 300))
check('no literal ** bold marker survives', !r.html.includes('**'), r.html.slice(0, 300))
check('no literal --- rule survives', !/(^|\n)---(\n|$)/.test(r.html), r.html.slice(0, 300))
check('no literal table pipe row survives', !/(^|\n)\|\s/.test(r.html), r.html.slice(0, 300))
check('headings became <h2>', /<h2[\s>]/.test(r.html))
check('bold became <strong>', /<strong[\s>]/.test(r.html))
check('rule became <hr', /<hr[\s/>]/.test(r.html))
check('table became <table>', /<table[\s>]/.test(r.html) && /<td[\s>]/.test(r.html))
check('list became <ul><li>', /<ul[\s>]/.test(r.html) && /<li[\s>]/.test(r.html))
check('the source really is markdown (so the fix is the render, not the input)',
  r.md.includes('## Quiz') && r.md.includes('---'))

// ── Defect 2 — whitespace collapse ────────────────────────────────────────
const paragraphs = (r.html.match(/<p[\s>]/g) ?? []).length
check('body is split into multiple paragraphs, not one blob', paragraphs >= 3, `found ${paragraphs}`)
check('no raw newline is load-bearing in the output',
  !r.html.split('\n').some((l) => l.length > 1500), 'a single line carries the whole lesson')

// ── Structural validity — the quiz block was <p> inside <ol> ──────────────
check('no paragraph is emitted inside a list', !/<\/li>\s*<p[\s>]/.test(r.html), r.html)
check('each quiz option is its own list item',
  /<li[^>]*>A\. /.test(r.html) && /<li[^>]*>B\. /.test(r.html), r.html)
check('the quiz answer is not glued to the options',
  !/A\. [^<]*B\. /.test(r.html), r.html)
check('every opened block tag is closed', (() => {
  const stack = []
  for (const m of r.html.matchAll(/<(\/?)(p|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|h[1-6]|pre|code|div)[\s>]/g)) {
    if (m[1]) { if (stack.pop() !== m[2]) return false } else stack.push(m[2])
  }
  return stack.length === 0
})(), r.html)

// ── HTML from the model must land as text, not markup ─────────────────────
check('model-emitted <script> is neutralised', !/<script/i.test(r.hostileHtml), r.hostileHtml.slice(0, 300))
check('model-emitted markup stays readable', /alert\(1\)/.test(r.hostileHtml))

// ── The LMS is not ours to style ──────────────────────────────────────────
check('no 0nCore Tailwind classes leak into a foreign host',
  !/class="[^"]*(?:text-white|bg-black|mb-4|space-y-)/.test(r.html), r.html.slice(0, 300))
check('no foreground colour is asserted', !/color:\s*#/.test(r.html))
check('content survives if the host strips style attributes',
  /<h2>/.test(r.html.replace(/\s(?:style|class)="[^"]*"/g, '')))

// ── Defect 3 — contentType is a named, evidenced constant ─────────────────
check('contentType is one of the three measured-accepted values',
  ['video', 'assignment', 'quiz'].includes(r.contentType), `got ${r.contentType}`)

// ── Defect 4 — the description is computed, never written ─────────────────
const PROMISES = [
  'money-back', 'guarantee', 'spots are limited', 'lifetime', 'certificate',
  'Q&A', 'downloadable', 'bonus', 'enroll now', 'limited time',
]
const aboutLower = r.about.toLowerCase()
for (const p of PROMISES) {
  check(`about copy makes no "${p}" promise`, !aboutLower.includes(p.toLowerCase()),
    r.about.slice(0, 400))
}
check('about copy states the real lesson count', r.about.includes('2 lessons'), r.about)
check('about copy uses the real word count', r.about.includes('1,234'), r.about)
check('about copy uses the real duration', r.about.includes('1h 5m'), r.about)
check('about copy lists the real lesson titles',
  r.about.includes('Lesson One') && r.about.includes('Lesson Two'), r.about)
check('about copy counts quiz questions from the lessons', r.about.includes('2 quiz questions'), r.about)
check('about copy renders to HTML too', /<h2[\s>]/.test(r.aboutHtml) && !r.aboutHtml.includes('**'))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
