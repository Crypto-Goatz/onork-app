/**
 * Guides Markdown -> HTML, in the 0nCore dark theme.
 *
 * The parser moved to `lib/markdown/render.ts` when the Course Builder needed
 * the same one against a host we do not style. This file is now the theme
 * binding and nothing else; output is byte-for-byte what it was, asserted by
 * `tools/test-markdown-parity.mjs`.
 */

import { renderMarkdownWith, ONCORE_DARK } from '@/lib/markdown/render'

export function renderMarkdown(md: string): string {
  return renderMarkdownWith(md, ONCORE_DARK)
}
