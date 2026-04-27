/**
 * Tiny Markdown -> HTML renderer (no external deps).
 *
 * Handles the subset of Markdown the build guides actually use:
 * headers, paragraphs, bullet + numbered lists, code fences, inline code,
 * blockquotes, tables, bold/italic, links, horizontal rules.
 *
 * Output: Tailwind-classed HTML compatible with the 0nCore dark theme.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text: string): string {
  // Code spans first (so they don't get other formatting applied)
  text = text.replace(/`([^`]+)`/g, (_, c) =>
    `<code class="bg-white/[0.06] text-[#7ed957] px-1.5 py-0.5 rounded text-[0.9em]">${escapeHtml(c)}</code>`
  )
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
  // Italic (but not the inside of bold)
  text = text.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em class="italic">$1</em>')
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) =>
    `<a href="${escapeHtml(href)}" class="text-[#7ed957] hover:underline" target="${href.startsWith('http') ? '_blank' : '_self'}" rel="${href.startsWith('http') ? 'noopener noreferrer' : ''}">${label}</a>`
  )
  return text
}

interface ParseState {
  out: string[]
  inUl: boolean
  inOl: boolean
  inTable: boolean
  tableHeader: string[] | null
  inBlockquote: boolean
  inCode: boolean
  codeLang: string | null
  codeBuf: string[]
  paraBuf: string[]
}

function flushParagraph(s: ParseState) {
  if (s.paraBuf.length === 0) return
  const text = s.paraBuf.join(' ').trim()
  s.paraBuf = []
  if (!text) return
  s.out.push(`<p class="mb-4 leading-relaxed text-white/80">${renderInline(text)}</p>`)
}

function closeLists(s: ParseState) {
  if (s.inUl) { s.out.push('</ul>'); s.inUl = false }
  if (s.inOl) { s.out.push('</ol>'); s.inOl = false }
}

function closeTable(s: ParseState) {
  if (s.inTable) {
    s.out.push('</tbody></table></div>')
    s.inTable = false
    s.tableHeader = null
  }
}

function closeBlockquote(s: ParseState) {
  if (s.inBlockquote) { s.out.push('</blockquote>'); s.inBlockquote = false }
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const s: ParseState = {
    out: [],
    inUl: false, inOl: false, inTable: false, tableHeader: null,
    inBlockquote: false, inCode: false, codeLang: null,
    codeBuf: [], paraBuf: [],
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code fence
    const fence = line.match(/^```(\w*)$/)
    if (fence) {
      if (s.inCode) {
        const code = s.codeBuf.join('\n')
        s.out.push(`<pre class="bg-black/40 border border-white/[0.06] rounded-lg p-4 overflow-x-auto my-4 text-sm"><code class="font-mono text-white/85${s.codeLang ? ` language-${s.codeLang}` : ''}">${escapeHtml(code)}</code></pre>`)
        s.codeBuf = []
        s.inCode = false
        s.codeLang = null
      } else {
        flushParagraph(s); closeLists(s); closeTable(s); closeBlockquote(s)
        s.inCode = true
        s.codeLang = fence[1] || null
      }
      continue
    }
    if (s.inCode) { s.codeBuf.push(line); continue }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph(s); closeLists(s); closeTable(s); closeBlockquote(s)
      s.out.push('<hr class="my-8 border-white/[0.08]" />')
      continue
    }

    // Headers
    const h = line.match(/^(#{1,6})\s+(.+)$/)
    if (h) {
      flushParagraph(s); closeLists(s); closeTable(s); closeBlockquote(s)
      const level = h[1].length
      const text = renderInline(h[2])
      const cls = ['text-3xl font-bold text-white mt-10 mb-4',
                   'text-2xl font-bold text-white mt-8 mb-3',
                   'text-xl font-semibold text-white mt-6 mb-3',
                   'text-lg font-semibold text-white/90 mt-5 mb-2',
                   'text-base font-semibold text-white/80 mt-4 mb-2',
                   'text-sm font-semibold text-white/70 mt-3 mb-2'][level - 1]
      s.out.push(`<h${level} class="${cls}">${text}</h${level}>`)
      continue
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushParagraph(s); closeLists(s); closeTable(s)
      if (!s.inBlockquote) {
        s.out.push('<blockquote class="border-l-2 border-[#7ed957]/40 pl-4 my-4 text-white/70 italic">')
        s.inBlockquote = true
      }
      s.out.push(`<p class="mb-2">${renderInline(line.slice(2))}</p>`)
      continue
    }
    if (s.inBlockquote && line.trim() === '') { closeBlockquote(s); continue }

    // Tables — header row + separator + body rows
    if (line.includes('|') && lines[i + 1] && /^\s*\|?[\s|:-]+\|?\s*$/.test(lines[i + 1])) {
      flushParagraph(s); closeLists(s); closeBlockquote(s)
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 || c).filter((c, idx, arr) => idx < arr.length - 1 || c)
      const filtered = cells.filter(c => c.length > 0 || true)
      const headerCells = line.split('|').slice(line.startsWith('|') ? 1 : 0, line.endsWith('|') ? -1 : undefined).map(c => c.trim())
      s.out.push('<div class="overflow-x-auto my-4"><table class="w-full border-collapse text-sm"><thead><tr>')
      for (const c of headerCells) {
        s.out.push(`<th class="text-left font-semibold text-white border-b border-white/[0.1] px-3 py-2">${renderInline(c)}</th>`)
      }
      s.out.push('</tr></thead><tbody>')
      s.inTable = true
      s.tableHeader = headerCells
      i++ // skip separator
      continue
    }
    if (s.inTable) {
      if (!line.includes('|') || line.trim() === '') { closeTable(s) }
      else {
        const cells = line.split('|').slice(line.startsWith('|') ? 1 : 0, line.endsWith('|') ? -1 : undefined).map(c => c.trim())
        s.out.push('<tr class="border-b border-white/[0.05]">')
        for (const c of cells) s.out.push(`<td class="px-3 py-2 text-white/75 align-top">${renderInline(c)}</td>`)
        s.out.push('</tr>')
        continue
      }
    }

    // Numbered list
    const ol = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (ol) {
      flushParagraph(s)
      if (s.inUl) { s.out.push('</ul>'); s.inUl = false }
      if (!s.inOl) { s.out.push('<ol class="list-decimal list-outside ml-6 mb-4 space-y-1.5 text-white/80">'); s.inOl = true }
      s.out.push(`<li class="leading-relaxed">${renderInline(ol[3])}</li>`)
      continue
    }

    // Bullet list
    const ul = line.match(/^(\s*)[-*+]\s+(.+)$/)
    if (ul) {
      flushParagraph(s)
      if (s.inOl) { s.out.push('</ol>'); s.inOl = false }
      if (!s.inUl) { s.out.push('<ul class="list-disc list-outside ml-6 mb-4 space-y-1.5 text-white/80">'); s.inUl = true }
      s.out.push(`<li class="leading-relaxed">${renderInline(ul[2])}</li>`)
      continue
    }

    // Empty line
    if (line.trim() === '') {
      flushParagraph(s); closeLists(s); closeBlockquote(s)
      continue
    }

    // Default: paragraph buffer
    s.paraBuf.push(line)
  }

  flushParagraph(s); closeLists(s); closeTable(s); closeBlockquote(s)
  if (s.inCode) {
    s.out.push(`<pre class="bg-black/40 border border-white/[0.06] rounded-lg p-4 overflow-x-auto my-4 text-sm"><code class="font-mono text-white/85">${escapeHtml(s.codeBuf.join('\n'))}</code></pre>`)
  }
  return s.out.join('\n')
}
