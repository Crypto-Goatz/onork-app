# 0nCore (onork-app) — Project Pointer

> **This file is a pointer.** All canonical rules, ecosystem map, and product
> status live in the `0n-dispatch` repo. They are mirrored to Supabase and
> served live at `https://www.0ncore.com/api/dispatch/*`.
>
> Edit the canonical source — not this file. Run
> `bash scripts/sync-from-dispatch.sh` to refresh the cached snapshot below.

## What this repo is

The 0nCore customer portal — Next.js 16, Supabase auth, Stripe billing.
Hosts the Layer 3 dispatch API (`/api/dispatch/*`) and the public verifier key
(`/.well-known/dispatch.pub`). Every signed-in user lands on `/welcome`.

**Domain:** 0ncore.com (canonical) · www.0ncore.com (deployed)
**Vercel project:** `prj_OJ0gi5HItdtUmQYclXirYk1BSJnt`
**DB (Supabase ref):** `pwujhhmlrtxjmjzyttwn` (canonical 0nCore DB)

## Where the rules live

| Source | URL |
|---|---|
| Canonical markdown | `github.com/Crypto-Goatz/0n-dispatch` (private) |
| Live API — rules | `https://www.0ncore.com/api/dispatch/rules` |
| Live API — ecosystem | `https://www.0ncore.com/api/dispatch/ecosystem` |
| Live API — products | `https://www.0ncore.com/api/dispatch/products/onork-app` |
| Live API — version | `https://www.0ncore.com/api/dispatch/version` |
| Signed `.0n` exports | `https://www.0ncore.com/api/dispatch/.0n/<section>` |
| Public verify key | `https://www.0ncore.com/.well-known/dispatch.pub` |

This repo *implements* the dispatch API. The pointers above resolve to code
in `app/api/dispatch/*` and `lib/dispatch.ts`.

## How to refresh local cache

```bash
bash scripts/sync-from-dispatch.sh
```

Writes `.dispatch-cache/{version,rules,ecosystem,product}.json` and
`.dispatch-cache/dispatch.0n` (gitignored) for offline reading.

## Hard rules (live source is `/api/dispatch/rules`)

1. **Groq for production AI** — never Anthropic SDK / OpenAI SDK in prod paths.
2. **No emoji as icons** — Lucide React only.
3. **No inline `style={{}}`** — Tailwind only.
4. **No CSS layering on shadcn** — set CSS vars at `:root`.
5. **Push to `main`** — no branches, no PRs.
6. **PIT tokens MUST be `type:plain` on Vercel** — encrypted = double-wrapped = breaks auth.
7. **NEVER say GHL / Go High Level / HighLevel** — always "CRM" or "ROCKET".
8. **Server pages: getSession, not getUser** — getUser is a network call that
   races middleware's cookie refresh and creates auth redirect loops. Trust
   middleware. (See commits `2c39f2b` and `c213498`.)

For the full numbered list, fetch `/api/dispatch/rules` or read
`0n-dispatch/memory/rules.md`.

## Repo-specific notes

- **Brain registry** at `lib/brain/registry.ts` — every AI surface registers
  here. CI lint (`scripts/truth-lint.mjs`) verifies AI claims actually use
  the brain pattern. 9/9 surfaces honest as of `c213498`.
- **Dispatch API** at `app/api/dispatch/*` — Layer 3 of the 4-layer architecture.
  See `0n-dispatch/specs/dispatch-blueprint.md`.
- **Supabase migrations** for canonical DB live in `0n-dispatch/migrations/`,
  not this repo. Only app-specific schema changes go here.
- **`/welcome` is the post-auth landing** — 6-card control panel, no single
  product is the "main" surface.
