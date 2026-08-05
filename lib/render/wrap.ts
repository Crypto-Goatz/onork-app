import { escapeHtml } from './html'

/**
 * Target wrappers.
 *
 * The same block HTML has to survive three very different homes, and the
 * differences are not cosmetic — they are about what each host permits:
 *
 *   document  our own hosting. Full control. Stylesheet, meta, script.
 *   widget    inside a native funnel page. Someone else's CSS is already on the
 *             page and will collide with ours. Scope everything.
 *   blog      a sanitised post body. No <script>, no <link>, no <style> that
 *             survives. Inline styles only, or it renders naked.
 */

export type RenderTarget = 'document' | 'widget' | 'blog'

/** Whether this target can carry a stylesheet, or needs styles inlined. */
export function styleModeFor(target: RenderTarget): 'inline' | 'class' {
  return target === 'blog' ? 'inline' : 'class'
}

export interface WrapOptions {
  title: string
  description?: string
  canonical?: string
  /** Emitted only for targets that can run script. */
  personaliseEndpoint?: string
  bodyClassPrefix?: string
}

const RESET = `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
img{max-width:100%}
h1,h2,h3,p{margin:0}
`.trim()

/**
 * Runtime personaliser.
 *
 * Deliberately tiny and deliberately fail-silent. The published HTML already
 * contains real copy; this only ever REPLACES text that is already correct. If
 * the request fails, times out, or the endpoint is gone, the page keeps the
 * words it shipped with — which is the whole reason the fallback rule exists.
 */
function personaliseScript(endpoint: string): string {
  return `<script>(function(){try{
var n=document.querySelectorAll('[data-blk][data-fld]');if(!n.length)return;
fetch(${JSON.stringify(endpoint)},{method:'POST',headers:{'content-type':'application/json'},
body:JSON.stringify({url:location.href,ref:document.referrer})})
.then(function(r){return r.ok?r.json():null}).then(function(d){
if(!d||!d.blocks)return;
n.forEach(function(el){var b=d.blocks[el.getAttribute('data-blk')];
if(!b)return;var v=b[el.getAttribute('data-fld')];
if(typeof v==='string'&&v)el.textContent=v;});
}).catch(function(){});
}catch(e){}})();</script>`
}

export function wrapDocument(body: string, css: string, o: WrapOptions): string {
  const meta = [
    `<meta charset="utf-8">`,
    `<meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<title>${escapeHtml(o.title)}</title>`,
    o.description ? `<meta name="description" content="${escapeHtml(o.description)}">` : '',
    o.canonical ? `<link rel="canonical" href="${escapeHtml(o.canonical)}">` : '',
    `<meta property="og:title" content="${escapeHtml(o.title)}">`,
    o.description ? `<meta property="og:description" content="${escapeHtml(o.description)}">` : '',
  ]
    .filter(Boolean)
    .join('\n  ')

  return `<!doctype html>
<html lang="en">
<head>
  ${meta}
  <style>${RESET}
${css}</style>
</head>
<body>
${body}
${o.personaliseEndpoint ? personaliseScript(o.personaliseEndpoint) : ''}
</body>
</html>`
}

/**
 * A fragment for a native funnel page.
 *
 * Scoped by a wrapper id so our rules cannot leak into the host page and the
 * host's cannot bleed into ours. `all:initial` is not used — it would nuke
 * inherited fonts the agency chose on purpose — but layout-critical properties
 * are reasserted.
 */
export function wrapWidget(body: string, css: string, o: WrapOptions): string {
  const root = `${o.bodyClassPrefix || 'w0n'}-root`
  const scoped = css
    .split('\n')
    .filter(Boolean)
    .map((rule) => `#${root} ${rule}`)
    .join('\n')

  return `<div id="${root}">
<style>
#${root},#${root} *,#${root} *::before,#${root} *::after{box-sizing:border-box}
#${root} h1,#${root} h2,#${root} h3,#${root} p{margin:0}
#${root} img{max-width:100%}
${scoped}
</style>
${body}
${o.personaliseEndpoint ? personaliseScript(o.personaliseEndpoint) : ''}
</div>`
}

/**
 * A blog post body.
 *
 * No wrapper element, no <style>, no <script> — every one of those is stripped
 * by the sanitiser, and a <style> block that gets stripped takes the page's
 * whole appearance with it. Styles are already inline (see `styleModeFor`), and
 * personalisation is simply not available here. That is a real limitation and
 * it is reported rather than hidden.
 */
export function wrapBlog(body: string): string {
  return body
}

export function wrap(
  target: RenderTarget,
  body: string,
  css: string,
  o: WrapOptions
): string {
  if (target === 'document') return wrapDocument(body, css, o)
  if (target === 'widget') return wrapWidget(body, css, o)
  return wrapBlog(body)
}
