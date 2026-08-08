# 0nCORE — Two-Dashboard Product Outline

> Goal: sell 0nCORE as a dashboard usable **inside OR outside** the CRM, with two
> distinct surfaces — an **Agency/Admin** cockpit and a **Customer Portal** — plus
> a 0nTask cross-promo hook. This is the outline to get live.

---

## The core insight (verified)

The dashboard's data layer already works standalone — it just needs a token.
Every working tool authenticates with a signed **app JWT** (`companyId` inside).
Today that JWT is only minted by the GHL iframe SSO handshake. Minting one
directly for an agency makes the entire dashboard work in a plain browser —
**verified live: an agency token returned all 87 RocketOpp clients + 75 working
tools from `app.0ncore.com` with no GHL involved.**

So "works outside GHL" is **one small build**: a standalone login that mints the
same JWT after a normal sign-in. Everything downstream already works.

---

## Surface 1 — Agency / Admin Dashboard  *(the #1 selling point)*

**Who:** the agency owner / admin.
**Promise:** see every client at once, then drill into any one.

**What already exists** (`app/crm/*`):
- `AgencyDashboard`, `ControlCenter` — the cockpit
- `ClientsPage` + `/api/clients` — all 87 sub-accounts, plan, billing, activity (live)
- Per-area screens: contacts, pipeline, calendar, conversations, invoices, payments,
  products, forms, workflows, social, tags
- `SaasConfigurator` — plan/feature configuration
- `report.rollup` — one-shot rollup across every client (finished + verified)

**What to build:**
1. **Standalone login** → mint app JWT (the "outside GHL" unlock)
2. **Global → focused toggle** — "all clients" overview vs "hone in on one sub-account"
   as a first-class control, not a page jump (this IS the selling point)
3. Polish the overview: KPIs across all clients (contacts, revenue, activity, failures)

---

## Surface 2 — Customer Portal  *(cleaner, sexier — the sub-account app)*

**Who:** the sub-account's own users (the agency's clients' staff).
**Promise:** log in, see *your* company's data, get help.

**What exists:** `app/portal/page.tsx` — a stub. This is the greenfield build.

**What to build:**
1. **Sub-account login** (the sub-account app powers this) → JWT scoped to ONE `locationId`
2. **Clean, focused UI** — their contacts, pipeline, calendar, invoices — *their* data only,
   none of the agency's cross-client machinery
3. **Agency-configurable support block** (optional, per agency): live chat · support · ticket form
4. **0nTask cross-promo** — embed a 0nTask surface (tasks/flows) in the portal to
   drive 0nTask signups from the agency's client base

---

## Inside OR outside GHL — how it works

| Context | Auth today | After the standalone-login build |
|---|---|---|
| Inside GHL (Custom Page iframe) | SSO handshake mints JWT ✓ | unchanged, still works |
| Outside GHL (app.0ncore.com direct) | no JWT → data 401s | login mints the same JWT ✓ |
| Sub-account user (portal) | — | sub-account login → location-scoped JWT |

One JWT shape, three ways to obtain it. The tools never change.

---

## Agency pricing model  *(MASSIVE — the monetization engine)*

**1 client free per agency. Each additional client: $5 / client / month.**

- Client #1 → $0
- Clients #2…N → $5 each, recurring monthly
- Example: RocketOpp's 87 clients → 86 billable → **$430/mo**

**How it wires in:**
- The client count is already live (`/api/clients` → 87). Billable = `count − 1`.
- Bill via metered Stripe subscription on the agency: quantity = billable clients,
  unit price $5/mo, updated whenever a client is added/removed (`location.create` /
  removal are the hooks).
- **Not hardcoded** (Critical Rule #1): the free-allowance (1) and per-client price
  ($5) live in `bot_settings` so they can change per agency / promo without a deploy.
- The Agency dashboard shows it plainly: "87 clients · 1 free · 86 × $5 = $430/mo."

---

## Build order to get live

1. **Standalone agency login** — Supabase auth → resolve `companyId` → `issueAppJwt`.
   Unlocks the agency dashboard outside GHL. *(small)*
2. **Agency overview polish** — global↔focused toggle + cross-client KPIs. *(medium)*
3. **Customer portal v1** — sub-account login, location-scoped JWT, clean data views. *(medium)*
4. **Portal support block + 0nTask embed** — agency-configurable. *(medium)*
5. **Finish the provisioning cluster** — `location.create` + snapshot facets
   (`workflow.deploy` / `funnel.clone` / `agents.deploy`), verified together. *(medium)*
6. **Per-client billing** — Stripe metered agency subscription, quantity = clients − 1
   at $5 each, driven by `bot_settings`, surfaced on the agency dashboard. *(medium)*

---

## Status of the "almost" tools (context)

- **Working: 75** (was 74 — `report.rollup` finished + verified this session)
- **Ditched honestly: `site.build`** (no native site API; points to the real page/blog publish)
- **107 "cross-repo almost"** are a noisy scanner flag (placeholder-text heuristic),
  NOT 107 missing endpoints — a calibration task, not a build of 107 things.
