# 0n Design System — Authoritative Directive

> **Scope:** every page, component, and surface in `onork-app` and any 0n family
> site that depends on this repo's design language.
> **Stack:** Next.js 16 App Router · Tailwind CSS · shadcn/ui · Lucide React.
> **Mood:** premium developer tool — Linear / Vercel dashboard / Raycast.
> **Mode:** dark only, always. No light mode. No theme toggle.

This file is the source of truth. The hard rules in `CLAUDE.md` ("Design system
is fixed: bg `#0d1117`, accent `#6EE05A`, Lucide only, no inline styles, no CSS
layering on shadcn") are operationalized here. If a literal in code contradicts
this doc, this doc wins.

---

## 1. Color System

### Background layers (page → elevated → hover)

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Page | `#0d1117` | `bg-[#0d1117]` | Root `<body>` background |
| Surface / card | `#161b22` | `bg-[#161b22]` | Cards, panels, sidebars |
| Elevated | `#1c2128` | `bg-[#1c2128]` | Modals, dropdowns, popovers |
| Hover | `#21262d` | `bg-[#21262d]` | Interactive hover state |

### Borders

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Default | `#30363d` | `border-[#30363d]` | All cards, inputs, dividers |
| Hover | `#484f58` | `border-[#484f58]` | Hovered card or input |
| Focus ring | `#6EE05A` @ 20% | `border-[#6EE05A]/20` | Focused input ring |

### Brand + accent

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Primary | `#6EE05A` | `bg-[#6EE05A]` `text-[#6EE05A]` | Primary CTAs, links, active states, badges |
| Primary hover | `#5bc74a` | `hover:bg-[#5bc74a]` | Primary button hover |
| Accent blue | `#58a6ff` | `text-[#58a6ff]` | Secondary actions, info states, hyperlinks in body copy |

### Text

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Primary | `#e6edf3` | `text-[#e6edf3]` | Headlines, body emphasis |
| Secondary | `#c9d1d9` | `text-[#c9d1d9]` | Default body copy |
| Muted | `#8b949e` | `text-[#8b949e]` | Captions, meta, helper text |

### Status

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Danger | `#f87171` | `text-[#f87171]` `bg-[#f87171]/10` | Errors, destructive actions |
| Warning | `#fbbf24` | `text-[#fbbf24]` `bg-[#fbbf24]/10` | In-progress, attention |
| Success | `#6EE05A` | `text-[#6EE05A]` `bg-[#6EE05A]/10` | Installed, complete, healthy |

### Gradients

Subtle glows only — never on text, never as a primary surface.

```html
<div class="bg-gradient-to-b from-[#6EE05A]/10 to-transparent">
```

---

## 2. Typography

### Font stack

- **Primary:** Inter (variable) — load via `next/font` as `font-sans`.
- **Mono:** JetBrains Mono — load via `next/font` as `font-mono`.

```ts
// app/layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono  = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

### Scale

| Role | Tailwind | Notes |
|---|---|---|
| Page title | `text-3xl font-semibold tracking-tight text-[#e6edf3]` | One per page |
| Section title | `text-xl font-semibold text-[#e6edf3]` | Above any group of cards |
| Card title | `text-base font-medium text-[#e6edf3]` | Inside cards |
| Body | `text-sm text-[#c9d1d9] leading-relaxed` | Default paragraph |
| Caption / meta | `text-xs text-[#8b949e]` | Timestamps, hints |
| Code (inline) | `font-mono text-sm bg-[#161b22] px-1.5 py-0.5 rounded text-[#e6edf3]` | `<code>` |

No uppercase. No letter-spacing tricks except `tracking-tight` on the page
title. Never apply gradients to text.

---

## 3. Spacing System

| Context | Tailwind |
|---|---|
| Page padding (desktop) | `px-6 py-8` |
| Page padding (mobile) | `px-4 py-6` |
| Section gaps | `space-y-8` |
| Card grid gap | `gap-4` |
| Card padding | `p-5` |
| Inner element spacing | `space-y-3` |
| Form field stack | `space-y-4` |
| Button group inline | `gap-2` |

Page max width: `max-w-7xl mx-auto`.

---

## 4. Card — the primary UI unit

The card is the workhorse. Every grouped piece of content is a card.

```html
<div class="bg-[#161b22] border border-[#30363d] rounded-xl p-5
            hover:border-[#484f58] hover:bg-[#1c2128]
            hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20
            transition-all duration-200">
  ...
</div>
```

### Card states

| State | Classes |
|---|---|
| Default | `bg-[#161b22] border border-[#30363d] rounded-xl p-5` |
| Hover | `hover:border-[#484f58] hover:bg-[#1c2128] hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20` |
| Active / selected | `border-[#6EE05A]/40 bg-[#6EE05A]/5` |
| Disabled | `opacity-50 pointer-events-none` |

### Card status dot (top-right)

```html
<span class="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#6EE05A]"></span>
```

| Color | Meaning |
|---|---|
| `bg-[#6EE05A]` | Installed / live / healthy |
| `bg-[#fbbf24]` | In progress / pending |
| `bg-[#8b949e]` | Not started / inactive |
| `bg-[#f87171]` | Error / broken |

`rounded-xl` is the maximum corner radius for cards. Never use `rounded-full`
on a card.

---

## 5. Buttons

All buttons share: `text-sm font-medium`, no uppercase, `transition-all duration-150`,
`active:scale-[0.98]`.

### Primary

```html
<button class="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2
               hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]">
  Save changes
</button>
```

### Secondary

```html
<button class="bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-4 py-2
               hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]">
  Cancel
</button>
```

### Ghost

```html
<button class="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]
               rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150">
  Skip
</button>
```

### Danger

```html
<button class="bg-[#f87171]/10 text-[#f87171] border border-[#f87171]/20
               hover:bg-[#f87171]/20 rounded-lg px-4 py-2 text-sm font-medium
               transition-all duration-150 active:scale-[0.98]">
  Delete forever
</button>
```

### Disabled (any variant)

Add `disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`
to the `<button>` element.

### Icon-only button

`p-2` instead of `px-4 py-2`. Icon at `w-4 h-4`. Always include `aria-label`.

---

## 6. Badges / Pills

```html
<span class="inline-flex items-center bg-[#6EE05A]/10 text-[#6EE05A]
             text-xs font-medium px-2.5 py-0.5 rounded-full">
  CRM
</span>
```

| Variant | Tailwind |
|---|---|
| Category (default) | `bg-[#6EE05A]/10 text-[#6EE05A]` |
| Coming soon | `bg-[#fbbf24]/10 text-[#fbbf24]` |
| Installed | `bg-[#6EE05A]/10 text-[#6EE05A]` |
| Error | `bg-[#f87171]/10 text-[#f87171]` |
| Info | `bg-[#58a6ff]/10 text-[#58a6ff]` |

### NEW badge (compact)

```html
<span class="bg-[#6EE05A] text-[#0d1117] text-[10px] font-bold px-1.5 py-0.5 rounded">
  NEW
</span>
```

---

## 7. Inputs / Forms

### Text input

```html
<input class="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2
              text-sm text-[#e6edf3] placeholder:text-[#484f58]
              focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20
              focus:outline-none transition-colors duration-150" />
```

### Search input (with Lucide icon)

```tsx
import { Search } from "lucide-react";

<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
  <input
    className="bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 w-full
               text-sm text-[#e6edf3] placeholder:text-[#484f58]
               focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none"
    placeholder="Search…"
  />
</div>
```

### Textarea / select

Same color tokens as input; `rounded-lg`, `text-sm`, identical focus ring.

### Form labels

```html
<label class="text-xs font-medium text-[#8b949e] mb-1.5 block">Label</label>
```

### Validation messages

- Helper: `text-xs text-[#8b949e] mt-1.5`
- Error: `text-xs text-[#f87171] mt-1.5`

---

## 8. Animation / Motion

| Surface | Spec |
|---|---|
| Page transition | Fade-in + 4px upward translate, 200ms `ease-out` |
| Card hover | `translate-y-[-1px]` + shadow, 150ms `ease` |
| Button press | `active:scale-[0.98]` |
| Loading skeleton | `animate-pulse` on `bg-[#161b22]` blocks |
| Progress bar | Width transition `ease-in-out`, 400ms |
| Toast | Slide-in from top-right, auto-dismiss 4s |

Page transition (Tailwind utility):

```css
@keyframes fade-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-up { animation: fade-up 200ms ease-out both; }
```

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

---

## 9. Layout Patterns

### Page shell

```tsx
<div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
  <Header />            {/* h-14, sticky */}
  <div className="flex">
    <Sidebar />         {/* w-64, hidden md:block */}
    <main className="flex-1 max-w-7xl mx-auto px-6 py-8 space-y-8">
      {children}
    </main>
  </div>
</div>
```

### Header

- `h-14` height
- `bg-[#0d1117]/80 backdrop-blur border-b border-[#30363d]`
- `sticky top-0 z-40`

### Sidebar

- `w-64`
- `bg-[#161b22] border-r border-[#30363d]`
- Items: `text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg px-3 py-2`
- Active item: `bg-[#6EE05A]/10 text-[#6EE05A]`

### Filter / utility bar

```html
<div class="sticky top-14 z-30 bg-[#0d1117]/80 backdrop-blur
            border-b border-[#30363d] px-6 py-3 flex items-center gap-3">
  ...
</div>
```

### Card grid (responsive)

```html
<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  ...
</div>
```

---

## 10. Icons — Lucide React only

- **No emoji as icons. Ever.** (Critical Rule #5.) Decorative emoji inside body
  copy is allowed, but a function/state/CTA icon is always Lucide.
- Import per-icon, never the whole library:

  ```tsx
  import { ArrowRight, Check, Search, Loader2 } from "lucide-react";
  ```

| Context | Size | Default color |
|---|---|---|
| Inline (next to text) | `w-4 h-4` | `text-[#8b949e]` |
| Card / menu item | `w-5 h-5` | `text-[#8b949e]` |
| Feature illustration | `w-8 h-8` | `text-[#6EE05A]` |

Active or primary context: switch color to `text-[#6EE05A]`. Don't mix
Heroicons, Tabler, custom SVG, or emoji into the same surface as Lucide.

---

## 11. shadcn/ui — theme override

shadcn writes to CSS variables. Map the 0n palette at `:root` so every shadcn
component (Button, Card, Dialog, Popover, DropdownMenu, Toast, Tabs, etc.)
inherits the dark theme automatically. **Do not override per-component;
override the variables once.**

### `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 220 13% 7%;          /* #0d1117 */
    --foreground: 213 31% 91%;         /* #e6edf3 */

    --card: 215 21% 11%;               /* #161b22 */
    --card-foreground: 213 31% 91%;

    --popover: 213 19% 14%;            /* #1c2128 */
    --popover-foreground: 213 31% 91%;

    --primary: 113 67% 62%;            /* #6EE05A */
    --primary-foreground: 220 13% 7%;  /* #0d1117 */

    --secondary: 215 14% 16%;          /* #21262d */
    --secondary-foreground: 210 17% 82%; /* #c9d1d9 */

    --muted: 215 21% 11%;
    --muted-foreground: 215 8% 58%;    /* #8b949e */

    --accent: 215 14% 16%;
    --accent-foreground: 213 31% 91%;

    --destructive: 0 91% 71%;          /* #f87171 */
    --destructive-foreground: 220 13% 7%;

    --border: 215 14% 21%;             /* #30363d */
    --input: 215 14% 21%;
    --ring: 113 67% 62%;               /* #6EE05A */

    --radius: 0.75rem;                 /* rounded-xl default */
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-[#0d1117] text-[#c9d1d9] font-sans antialiased;
    font-feature-settings: "cv11", "ss01", "ss03";
  }
}
```

### `tailwind.config.ts` (excerpt)

```ts
export default {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ...rest of shadcn map
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
};
```

### Working with shadcn components

- Generate components with the CLI as normal (`npx shadcn@latest add button`).
- **Do not edit the generated component to hardcode colors.** It already reads
  from the CSS variables above.
- If a shadcn variant looks off, fix it by adjusting the variable mapping —
  not by layering custom classes on every call site.

---

## 12. Skeletons / loading states

```html
<div class="space-y-3">
  <div class="h-4 w-1/3 bg-[#161b22] rounded animate-pulse"></div>
  <div class="h-24 w-full bg-[#161b22] rounded-xl animate-pulse"></div>
</div>
```

Use a card-shaped skeleton in the same dimensions as the card it replaces.
Never show a spinner where a skeleton would be more honest about layout.

---

## 13. Toast / notification

- Library: `sonner` (already a dependency).
- Position: top-right.
- Duration: 4 seconds.
- Variants map to status colors:
  - Success → `bg-[#6EE05A]/10 text-[#6EE05A] border-[#6EE05A]/20`
  - Error → `bg-[#f87171]/10 text-[#f87171] border-[#f87171]/20`
  - Info → `bg-[#58a6ff]/10 text-[#58a6ff] border-[#58a6ff]/20`

---

## 14. Accessibility

- Body text on `#0d1117` is `#c9d1d9` → contrast ratio ~12:1 (AAA).
- Muted text `#8b949e` → ~5.5:1 (AA for large text only — never a long
  paragraph).
- Focus state is visible on every interactive element via the focus ring
  classes above. Don't strip the ring with `focus:ring-0`.
- Every icon-only button has `aria-label`.
- Form fields have `<label>` (visible) or `aria-label`.

---

## 15. Hard NO list

Anything in this section breaks the design system. Treat as a lint rule.

- ❌ Emoji as a state, action, or navigation icon (Lucide only).
- ❌ Inline `style={{}}`. Tailwind utilities only.
- ❌ Light mode of any kind. No theme toggle.
- ❌ Gradients on text (`bg-clip-text text-transparent` is banned).
- ❌ `rounded-full` on cards. Maximum is `rounded-xl`.
  (Avatars, status dots, and pills are obviously exempt.)
- ❌ Shadows heavier than `shadow-lg`.
- ❌ Neon glow / drop-shadow halos. The only glow is the focus ring.
- ❌ CSS layered on top of shadcn components. Override variables instead.
- ❌ Hardcoded hex literals scattered through component files when a token
  exists. Use the tokens in this doc; if a new token is needed, add it here
  first.
- ❌ Mixing icon libraries. Pick Lucide, stay Lucide.

---

## 16. Adoption checklist (for any new page)

Before you ship a new page or surface:

- [ ] Page sits inside `max-w-7xl mx-auto px-6 py-8 space-y-8`.
- [ ] Background is `bg-[#0d1117]`; cards are `bg-[#161b22]`.
- [ ] Typography uses the scale in §2 — no ad-hoc font sizes.
- [ ] All icons imported from `lucide-react`.
- [ ] All shadcn components inherit theme via `:root` variables (no
  per-component color overrides).
- [ ] Buttons use one of the four variants in §5 — no new variants invented.
- [ ] Form fields match §7. Focus ring is intact.
- [ ] Loading states use skeletons in card shapes (§12).
- [ ] No `style={{}}` anywhere in the diff.
- [ ] No emoji icons in the diff.
- [ ] CRO9 embed mounted (Critical Rule #7 — see SXO-CRO9-Master-Playbook).
- [ ] Page copy reviewed against SXO standard (Critical Rule #8).

---

This is a living doc. When the design language evolves, update this file in
the same commit as the implementation. If you add a new pattern, add it here
*before* using it twice.
