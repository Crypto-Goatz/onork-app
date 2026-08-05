# The Renderer — gameplan

**The one missing piece.** Three delivery targets are blocked on the same thing:
turning a builder document into HTML. Build it once and all three light up.

Verified against `~/Downloads/highlevel-api-docs-main` on 2026-08-05, not remembered.

---

## 1. The wall, stated precisely

| Endpoint | Methods | Meaning |
|---|---|---|
| `/funnels/page` | **GET only** | Cannot create or edit a funnel page |
| `/funnels/funnel/list` | **GET only** | Cannot create a funnel |
| `/snapshots/` | **GET only** | Cannot create a snapshot |
| `/blogs/posts` | **POST** | **Can create blog posts** |
| `/custom-menus/` | **POST** | **Can add a sidebar item to a sub-account** |
| `/medias/upload-file` | **POST** | **Can push assets into the media library** |
| `/snapshots/share/link` | **POST** | Can generate a share link |

There is no "create a website" API and none is hidden — the write verbs simply do
not exist on those paths. Everything below routes around that rather than waiting
for it.

---

## 2. Two builders, two source formats, one output

We now have two products that both need HTML, and they do **not** share a data model.

| | STRUKTUR (`~/Github/website-builder`) | web0n wizard (`~/Github/web0n-builder`) |
|---|---|---|
| Model | `Block[]` → `PageSpec` | `WebsiteContent` |
| Shape | Freeform sections, drag-drop | Guided wizard, fixed page types |
| Renderer today | `Canvas.tsx` | `Preview.tsx` (1,333 lines) |
| Cheapest export | **PageSpec → HTML** (write it) | **`renderToStaticMarkup(<Preview/>)`** (reuse it) |

**This is the key call.** The wizard already has a complete, correct renderer in
`Preview.tsx`. Writing a second HTML generator for it would guarantee drift
between what the customer previews and what they receive. Render the existing
component to static markup on the server instead — same component, zero
duplication, and the preview *is* the deliverable by construction.

STRUKTUR is the opposite case: `Canvas.tsx` is an editing surface full of
selection rings, hover toolbars and drop targets. It cannot be reused, so
PageSpec gets a purpose-built renderer.

---

## 3. `renderPage(spec, target) → { html, css, warnings }`

One entry point, one style table, three wrappers.

```
lib/render/
  tokens.ts     Tailwind class → real CSS. The single source of visual truth.
  blocks.ts     One function per BlockKind. Mirrors the canvas, minus chrome.
  wrap.ts       Target-specific document/fragment wrappers.
  index.ts      renderPage()
```

### Why a token map and not just "load Tailwind"

The three targets have incompatible style budgets:

| Target | Can load a stylesheet? | Can run script? | Style strategy |
|---|---|---|---|
| Hosted page | yes | yes | link our compiled CSS |
| Funnel widget | yes, scoped | yes | scoped CSS, prefixed classes |
| **Blog post** | **no** | **no** | **inline styles only** |

A blog post body is sanitised HTML — no `<script>`, no `<link>`. If the renderer
only knows how to emit Tailwind classes, the blog target renders unstyled and the
feature looks broken. `tokens.ts` maps `py-20` → `padding-top:5rem;padding-bottom:5rem`
so the same block can emit classes *or* inline styles from one definition.

That table is also what stops canvas/export drift: both read it.

---

## 4. Phases

**Phase 1 — tokens + block renderers.** `tokens.ts` covering the classes actually
used (spacing, radius, shadow, text size, `layoutStyle: split|grid|centered`), then
one renderer per block kind. Golden tests: a known spec in, an exact HTML string
out. Mechanical, and the only phase with real surface area.

**Phase 2 — three wrappers.**
- `document` — full HTML, our CSS, meta/OG tags
- `widget` — fragment + scoped `<style>`, class prefix to survive a hostile page
- `blog` — fragment, inline styles, no script, no external refs

**Phase 3 — the wizard exporter.** `POST /api/export` in `web0n-builder`:
`renderToStaticMarkup(<Preview content={...} />)` wrapped by the same three
wrappers. Note `index.html` currently pulls Tailwind from `cdn.tailwindcss.com` —
fine for the editor, **not** for a delivered site. Ship compiled CSS instead.

**Phase 4 — delivery.**
- Hosted: write to storage, serve on a subdomain, point the client's domain
- Widget: the bundle path already built (blocked on an editable app draft)
- Blog: `POST /blogs/posts` with the blog target's fragment. Needs
  `/blogs/site/all` → `/blogs/authors` → `/blogs/categories` first; the post
  requires all three ids.

**Phase 5 — CRM surfacing.** `POST /custom-menus/` puts "Website Builder" in a
sub-account sidebar pointing at the Custom Page (SSO already shipped). This is
writable **today** and is how an agent reaches the builder without leaving the CRM.

---

## 5. What to expect to go wrong

- **Style drift** between canvas and export. Mitigated by one token table; a
  golden test per block kind is what actually catches it.
- **Blog sanitisation** will strip more than expected. Test against a real post
  before promising the target — assume nothing about what survives.
- **Widget CSS collisions** with the host funnel's own styles. Prefix everything.
- **The fallback rule**: personalisable copy must be *in* the published HTML, so a
  page with the personaliser dead still reads correctly. Already the rule in
  `lib/builder/blocks.ts`; the renderer must not quietly break it.

---

## 6. Sequencing

Phase 1 is the whole unlock and is self-contained. Phase 3 is small because it
reuses `Preview.tsx`. Phase 5 is independent of the renderer entirely and could
run in parallel — it only needs the Custom Page that already exists.

Recommended order: **1 → 3 → 5 → 2 → 4.** That gets a real deliverable HTML site
out of the wizard, and the builder into an agent's sidebar, before spending
anything on the widget and blog paths.
