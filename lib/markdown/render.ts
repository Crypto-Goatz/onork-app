/**
 * The one Markdown -> HTML renderer in this app.
 *
 * It used to live in `lib/guides/markdown.ts` with the 0nCore dark-theme
 * Tailwind classes hardcoded into every tag. That was fine while the only
 * consumer was a page we style ourselves, and wrong the moment a second
 * consumer appeared: the Course Builder publishes lesson bodies into a
 * platform we do not style, where `class="text-white/80"` means nothing and
 * `text-white` on a light background is invisible ink.
 *
 * So the parser is here, once, and the presentation is a parameter:
 *
 *   ONCORE_DARK   — the exact classes the guides pages shipped with. Byte-for-
 *                   byte identical output; `tools/test-markdown-parity.mjs`
 *                   asserts it against every guide in the registry.
 *   PORTABLE      — semantic tags with inline styles only, no colours of our
 *                   own. For foreign hosts. If the host strips `style`, an
 *                   `<h2>` is still a heading and a `<ul>` is still a list —
 *                   the content survives, which is the whole point.
 *
 * `escapeText` exists because the two consumers have different threat models.
 * Guide markdown is written by us. Course markdown is written by a language
 * model and published under a customer's brand, so raw HTML in it must land
 * as visible characters, never as markup.
 */

export interface MarkdownTheme {
  /** Attribute strings, e.g. `class="…"` or `style="…"`. Empty string = bare tag. */
  p: string
  h: [string, string, string, string, string, string]
  ul: string
  ol: string
  li: string
  blockquote: string
  blockquoteP: string
  hr: string
  tableWrap: string
  table: string
  th: string
  tr: string
  td: string
  pre: string
  /** Takes the fence language so a theme can fold it into its own class list. */
  codeBlock: (lang: string | null) => string
  codeInline: string
  link: string
  strong: string
  em: string
}

export interface RenderOptions {
  /**
   * Escape `<` and `&` in the source before parsing, so any HTML the author
   * (or the model) put in the markdown renders as text.
   *
   * `>` is deliberately NOT escaped: a bare `>` is harmless in element
   * content, and escaping it would break blockquote detection — the fix
   * silently deleting a feature.
   */
  escapeText?: boolean
}

function attr(a: string): string {
  return a ? ` ${a}` : ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ──────────────────────────────────────────────────────────────────────────
// Themes
// ──────────────────────────────────────────────────────────────────────────

export const ONCORE_DARK: MarkdownTheme = {
  p: 'class="mb-4 leading-relaxed text-white/80"',
  h: [
    'class="text-3xl font-bold text-white mt-10 mb-4"',
    'class="text-2xl font-bold text-white mt-8 mb-3"',
    'class="text-xl font-semibold text-white mt-6 mb-3"',
    'class="text-lg font-semibold text-white/90 mt-5 mb-2"',
    'class="text-base font-semibold text-white/80 mt-4 mb-2"',
    'class="text-sm font-semibold text-white/70 mt-3 mb-2"',
  ],
  ul: 'class="list-disc list-outside ml-6 mb-4 space-y-1.5 text-white/80"',
  ol: 'class="list-decimal list-outside ml-6 mb-4 space-y-1.5 text-white/80"',
  li: 'class="leading-relaxed"',
  blockquote: 'class="border-l-2 border-[#7ed957]/40 pl-4 my-4 text-white/70 italic"',
  blockquoteP: 'class="mb-2"',
  hr: 'class="my-8 border-white/[0.08]"',
  tableWrap: 'class="overflow-x-auto my-4"',
  table: 'class="w-full border-collapse text-sm"',
  th: 'class="text-left font-semibold text-white border-b border-white/[0.1] px-3 py-2"',
  tr: 'class="border-b border-white/[0.05]"',
  td: 'class="px-3 py-2 text-white/75 align-top"',
  pre: 'class="bg-black/40 border border-white/[0.06] rounded-lg p-4 overflow-x-auto my-4 text-sm"',
  codeBlock: (lang) => `class="font-mono text-white/85${lang ? ` language-${lang}` : ''}"`,
  codeInline: 'class="bg-white/[0.06] text-[#7ed957] px-1.5 py-0.5 rounded text-[0.9em]"',
  link: 'class="text-[#7ed957] hover:underline"',
  strong: 'class="font-semibold text-white"',
  em: 'class="italic"',
}

/**
 * For hosts whose CSS we do not control. Spacing and structure only —
 * `currentColor` and `em` units inherit whatever the host uses, so this reads
 * correctly on a light LMS page and a dark one without us knowing which.
 */
export const PORTABLE: MarkdownTheme = {
  p: 'style="margin:0 0 1em;line-height:1.6"',
  h: [
    'style="margin:1.2em 0 .5em;font-size:1.8em;line-height:1.25"',
    'style="margin:1.2em 0 .5em;font-size:1.5em;line-height:1.3"',
    'style="margin:1.2em 0 .4em;font-size:1.25em;line-height:1.35"',
    'style="margin:1.2em 0 .4em;font-size:1.1em"',
    'style="margin:1.2em 0 .4em;font-size:1em"',
    'style="margin:1.2em 0 .4em;font-size:.9em"',
  ],
  ul: 'style="margin:0 0 1em;padding-left:1.5em;list-style:disc"',
  ol: 'style="margin:0 0 1em;padding-left:1.5em;list-style:decimal"',
  li: 'style="margin:0 0 .4em;line-height:1.6"',
  blockquote:
    'style="margin:0 0 1em;padding:.25em 0 .25em 1em;border-left:3px solid currentColor;opacity:.85"',
  blockquoteP: 'style="margin:0 0 .5em"',
  hr: 'style="margin:2em 0;border:0;border-top:1px solid currentColor;opacity:.25"',
  tableWrap: 'style="overflow-x:auto;margin:0 0 1em"',
  table: 'style="border-collapse:collapse;width:100%"',
  th: 'style="text-align:left;font-weight:600;padding:.5em .75em;border-bottom:2px solid currentColor"',
  tr: '',
  td: 'style="padding:.5em .75em;vertical-align:top;border-bottom:1px solid currentColor"',
  pre: 'style="margin:0 0 1em;padding:1em;overflow-x:auto;background:rgba(127,127,127,.12);border-radius:6px"',
  codeBlock: (lang) => (lang ? `class="language-${lang}" style="font-family:monospace"` : 'style="font-family:monospace"'),
  codeInline: 'style="font-family:monospace;background:rgba(127,127,127,.15);padding:.1em .35em;border-radius:3px"',
  link: '',
  strong: '',
  em: '',
}

// ──────────────────────────────────────────────────────────────────────────
// Parser
// ──────────────────────────────────────────────────────────────────────────

interface ParseState {
  out: string[]
  inUl: boolean
  inOl: boolean
  inTable: boolean
  inBlockquote: boolean
  inCode: boolean
  codeLang: string | null
  codeBuf: string[]
  paraBuf: string[]
}

export function renderMarkdownWith(
  md: string,
  theme: MarkdownTheme,
  opts: RenderOptions = {},
): string {
  const escapeSource = opts.escapeText === true

  // When the source is pre-escaped, `<` and `&` are already entities — running
  // escapeHtml again would print `&amp;amp;` to the reader. These two pick the
  // right escaper for that state instead of assuming one.
  const escCode = escapeSource ? (s: string) => s : escapeHtml
  const escHref = escapeSource ? (s: string) => s.replace(/"/g, '&quot;') : escapeHtml

  const esc = escapeSource
    ? (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    : (s: string) => s

  function renderInline(text: string): string {
    // Code spans first (so they don't get other formatting applied)
    text = text.replace(/`([^`]+)`/g, (_, c) => `<code${attr(theme.codeInline)}>${escCode(c)}</code>`)
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, `<strong${attr(theme.strong)}>$1</strong>`)
    // Italic (but not the inside of bold)
    text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, `<em${attr(theme.em)}>$1</em>`)
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const external = href.startsWith('http')
      return `<a href="${escHref(href)}"${attr(theme.link)} target="${external ? '_blank' : '_self'}" rel="${external ? 'noopener noreferrer' : ''}">${label}</a>`
    })
    return text
  }

  const s: ParseState = {
    out: [],
    inUl: false, inOl: false, inTable: false,
    inBlockquote: false, inCode: false, codeLang: null,
    codeBuf: [], paraBuf: [],
  }

  const flushParagraph = () => {
    if (s.paraBuf.length === 0) return
    const text = s.paraBuf.join(' ').trim()
    s.paraBuf = []
    if (!text) return
    s.out.push(`<p${attr(theme.p)}>${renderInline(text)}</p>`)
  }
  const closeLists = () => {
    if (s.inUl) { s.out.push('</ul>'); s.inUl = false }
    if (s.inOl) { s.out.push('</ol>'); s.inOl = false }
  }
  const closeTable = () => {
    if (s.inTable) { s.out.push('</tbody></table></div>'); s.inTable = false }
  }
  const closeBlockquote = () => {
    if (s.inBlockquote) { s.out.push('</blockquote>'); s.inBlockquote = false }
  }
  const emitCodeBlock = (code: string, lang: string | null) => {
    s.out.push(
      `<pre${attr(theme.pre)}><code${attr(theme.codeBlock(lang))}>${escapeHtml(code)}</code></pre>`,
    )
  }

  const lines = md.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]

    // Code fence
    const fence = raw.match(/^```(\w*)$/)
    if (fence) {
      if (s.inCode) {
        emitCodeBlock(s.codeBuf.join('\n'), s.codeLang)
        s.codeBuf = []
        s.inCode = false
        s.codeLang = null
      } else {
        flushParagraph(); closeLists(); closeTable(); closeBlockquote()
        s.inCode = true
        s.codeLang = fence[1] || null
      }
      continue
    }
    // Fenced code is escaped wholesale on emit — never pre-escape it, or the
    // reader sees `&amp;lt;` inside the block.
    if (s.inCode) { s.codeBuf.push(raw); continue }

    const line = esc(raw)

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph(); closeLists(); closeTable(); closeBlockquote()
      s.out.push(`<hr${attr(theme.hr)} />`)
      continue
    }

    // Headers
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      flushParagraph(); closeLists(); closeTable(); closeBlockquote()
      const level = h[1].length
      s.out.push(`<h${level}${attr(theme.h[level - 1])}>${renderInline(h[2])}</h${level}>`)
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushParagraph(); closeLists(); closeTable()
      if (!s.inBlockquote) {
        s.out.push(`<blockquote${attr(theme.blockquote)}>`)
        s.inBlockquote = true
      }
      s.out.push(`<p${attr(theme.blockquoteP)}>${renderInline(line.slice(2))}</p>`)
      continue
    }
    if (s.inBlockquote && line.trim() === '') { closeBlockquote(); continue }

    // Tables — header row + separator + body rows
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s|:-]+\|?\s*$/.test(lines[i + 1])) {
      flushParagraph(); closeLists(); closeBlockquote()
      const headerCells = line
        .split('|')
        .slice(line.startsWith('|') ? 1 : 0, line.endsWith('|') ? -1 : undefined)
        .map((c) => c.trim())
      s.out.push(`<div${attr(theme.tableWrap)}><table${attr(theme.table)}><thead><tr>`)
      for (const c of headerCells) {
        s.out.push(`<th${attr(theme.th)}>${renderInline(c)}</th>`)
      }
      s.out.push('</tr></thead><tbody>')
      s.inTable = true
      i++ // skip separator
      continue
    }
    if (s.inTable) {
      if (!line.includes('|') || line.trim() === '') { closeTable() }
      else {
        const cells = line
          .split('|')
          .slice(line.startsWith('|') ? 1 : 0, line.endsWith('|') ? -1 : undefined)
          .map((c) => c.trim())
        s.out.push(`<tr${attr(theme.tr)}>`)
        for (const c of cells) s.out.push(`<td${attr(theme.td)}>${renderInline(c)}</td>`)
        s.out.push('</tr>')
        continue
      }
    }

    // Numbered list
    const ol = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (ol) {
      flushParagraph()
      if (s.inUl) { s.out.push('</ul>'); s.inUl = false }
      if (!s.inOl) { s.out.push(`<ol${attr(theme.ol)}>`); s.inOl = true }
      s.out.push(`<li${attr(theme.li)}>${renderInline(ol[3])}</li>`)
      continue
    }

    // Bullet list
    const ul = line.match(/^(\s*)[-*+]\s+(.+)$/)
    if (ul) {
      flushParagraph()
      if (s.inOl) { s.out.push('</ol>'); s.inOl = false }
      if (!s.inUl) { s.out.push(`<ul${attr(theme.ul)}>`); s.inUl = true }
      s.out.push(`<li${attr(theme.li)}>${renderInline(ul[2])}</li>`)
      continue
    }

    // Empty line
    if (line.trim() === '') {
      flushParagraph(); closeLists(); closeBlockquote()
      continue
    }

    // Default: paragraph buffer
    s.paraBuf.push(line)
  }

  flushParagraph(); closeLists(); closeTable(); closeBlockquote()
  if (s.inCode) emitCodeBlock(s.codeBuf.join('\n'), null)

  return s.out.join('\n')
}
