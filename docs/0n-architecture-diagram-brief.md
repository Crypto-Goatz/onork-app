# Brief for Claude Design — 0n ecosystem architecture diagrams

> Paste everything below into Claude Design. It contains the verified architecture
> as of 31 July 2026. **Do not invent components, arrows or product names that are
> not listed here** — where something does not exist yet it is marked
> `NOT BUILT`, and that state should be drawn differently (dashed / greyed), not
> quietly completed.

---

## What I need

Four diagrams, in this order. Each should stand alone but share one visual language.

1. **Identity & SSO** — how an account exists once and is recognised everywhere
2. **The 0nVault** — where credentials live and who may read them
3. **Onboarding** — what a new customer actually experiences, step by step
4. **The API & data flow** — how 0nTask, 0nMCP and outside systems call each other

---

## Visual style

- Dark canvas `#0d1117`. Cards/nodes `#161b22`. Borders `#30363d`.
- Primary accent `#6EE05A` (use sparingly — for the happy path and "live" only).
- Secondary/info accent `#58a6ff` for data flow arrows.
- Text: headings `#e6edf3`, body `#c9d1d9`, captions `#8b949e`.
- Rounded corners, max ~12px. **No gradients on text. No glow halos. No emoji.**
- Anything marked `NOT BUILT` → dashed border, muted `#8b949e`, no accent colour.

---

## The cast — real names, domains and roles

| Thing | Where it lives | What it actually is |
|---|---|---|
| **0nCore** | `0ncore.com` | The 0n account home. Where an account is CREATED, and where the company brand is stored. Not a CRM. |
| **0nMCP** | `0nmcp.com` | The orchestrator. 113 services in its catalog. Also the OAuth surface for connecting apps, and it executes calls on your behalf. |
| **0nVault** | table `user_vaults`, Supabase `pwujhhmlrtxjmjzyttwn` | Encrypted credential store. One row per user per service. |
| **pwu** | Supabase `pwujhhmlrtxjmjzyttwn` | The identity master. The single source of truth for who a person is. |
| **0nTask** | `0ntask.com` (marketing), `app.0ntask.com` (the product) | AI task manager. First app fully wired into the ecosystem. |
| **web0n / CRO9 / social0n** | own domains | Sibling products. Draw as consumers, not in detail. |
| **app0n** | `0nmcp.com/ecosystem/app0n` | `NOT BUILT` — coming soon page only. |

---

## Diagram 1 — Identity & SSO

**The one sentence it must communicate:** you make one account, and every 0n app
recognises you without you setting anything up again.

Nodes and flow:

```
Person
  │
  ├─ signs up at  0ncore.com/signup   (3-field form, or Google OAuth)
  │      │
  │      └─→ /api/auth/signup  provisions:
  │             · account row in pwu (Supabase pwujhhmlrtxjmjzyttwn)
  │             · CRM contact
  │             · family match
  │             · mints a token prefixed  0n_
  │
  └─ or signs in later via "Login with 0n" (OAuth, hosted on 0nmcp.com)

pwu (identity master)
  ├─→ 0nCore     recognises them natively (same Supabase session)
  ├─→ 0nMCP      recognises them natively
  ├─→ web0n      via Login with 0n
  ├─→ CRO9       via Login with 0n
  └─→ 0nTask     ⚠ SPECIAL CASE — see below
```

**Important nuance to draw honestly — 0nTask is the one exception.**
0nTask's app uses **Firebase auth** for its own session (a Firebase `uid`). It is
bridged to pwu **by email address**: `api/_lib/pwu.ts` verifies the Google identity
against pwu, then mints a Firebase custom token for the same user. So the link
between a 0nTask user and a 0n account is **the email**, not a shared session.
Draw that as a distinct, labelled bridge — not the same arrow as the others.

**Post-authentication landing — currently inconsistent. Draw it as it is:**

| Route in | Lands on |
|---|---|
| Email signup | `/welcome` — a 6-card panel |
| Google OAuth / `/auth/callback` | `/dashboard` — a configurable 8-widget grid |
| `/login` | → `/auth/callback` → `/dashboard` |
| `/hub` | the 0nVault door — chromeless, with an identity challenge on new devices |

Mark this cluster **"being consolidated into one new dashboard"** with a callout.
It is the known problem, not the intended design.

---

## Diagram 2 — The 0nVault

**The one sentence:** connect an app once, and every 0n product can use it without
the key being copied anywhere.

```
Person clicks "Connect Slack" on 0nmcp.com/vault
   │
   ▼
0nmcp.com/api/connect/slack/start
   → Slack OAuth consent
   → 0nmcp.com/api/connect/slack/callback     (exact URI must be pre-registered)
   → storeUserCredential()
   ▼
user_vaults  (Supabase pwujhhmlrtxjmjzyttwn)
   columns: user_id · service_name · encrypted_key · iv · salt
   AES encrypted at rest. One row per user per service.
```

**Currently in the vault (15 services, real):** CRM, Anthropic, Groq, Gemini, GA4,
Gmail, Google Calendar, Drive, Sheets, Tasks, Slides, Google Ads, Google Business,
Tag Manager, plus Slack once connected.

**Who can read it — this distinction is the whole point of the diagram:**

- ✅ **0nMCP** reads the vault directly and performs the call for you.
- ❌ **0nTask does NOT hold any credential.** It asks 0nMCP to act.
- ❌ No product ever receives a copy of a key.

Draw a clear boundary around the vault with **one** door into it: 0nMCP.

**Mark as `NOT BUILT`:** the arrow from 0nTask → `0nmcp.com/api/execute`. The
endpoint exists and accepts `Authorization: Bearer 0n_…`, but 0nTask has not been
issued a token yet. Dashed line, labelled "next step".

---

## Diagram 3 — Onboarding, as the customer experiences it

Draw as a horizontal journey with what the person sees at each step.

```
1. Create the account          0ncore.com/signup
   3 fields, or one Google click. Free, no card.

2. It provisions itself        (invisible, a few seconds)
   pwu account · CRM contact · family match · 0n_ token

3. Set up the brand            0nCore
   Logo variants · colour values · fonts · company details
   ← THIS IS THE PRODUCT. Free. About three minutes.

4. Connect the apps you use    0nmcp.com/vault
   CRM, Google, Slack, Stripe → encrypted into the 0nVault
   Connect once. Revoke once.

5. Open any 0n app             0nTask / web0n / CRO9 / social0n
   It is ALREADY yours — your logo, your colours, your details,
   before you touch anything.
```

Step 5 is the emotional payoff of the whole system. Give it visual weight.

**Contrast panel to include beside it** (this is the selling point):

| | Everywhere else | With a 0n account |
|---|---|---|
| Your logo | Find it, upload it again | Already there |
| Your colours | Hunt for hex codes | Already set |
| Company details | Retype the address | Already filled in |
| Connected apps | Reconnect each one | Already connected |
| Time to useful | Half an hour | Immediately |

---

## Diagram 4 — How the APIs work together

Three distinct API surfaces. Keep them visually separate — they are often confused.

### A. 0nTask public API — free, inbound and outbound

```
Anything that speaks HTTP
   (a CRM workflow · a script · an iOS Shortcut · an AI agent)
        │
        ▼
   app.0ntask.com/api/v1/tasks        GET · POST · PATCH · DELETE
   app.0ntask.com/api/v1/quick        GET  (create a task from a plain URL)
   app.0ntask.com/api/v1/keys         manage keys      (session auth)
   app.0ntask.com/api/v1/webhooks     manage webhooks  (session auth)

   Auth: key prefixed  0nt_live_   accepted FOUR ways —
         Authorization: Bearer · X-API-Key · ?key= · in the JSON body
   Keys are stored sha256-HASHED; the plaintext is shown once and never again.
   Free plan: 25 task creations per day. Reads are never limited.
```

**Every write lands in BOTH stores — draw this, it is non-obvious:**

```
POST /api/v1/tasks
   ├─→ Supabase grfjpophcwfsfnwculiu   (source of truth)
   └─→ Firestore users/{uid}/tasks      (what the app currently READS)
```

If only the first happened, a task would return `200` and then be invisible in the
app. The response carries `synced_to_app: true|false` to make that visible.

### B. Outbound webhooks — 0nTask telling other systems

```
task.created · task.updated · task.completed · task.deleted
        │
        ▼
   any URL you register
   optional shared secret →  X-0nTask-Signature: sha256=HMAC(body, secret)
```

### C. Two-way CRM sync — show the loop guard, it is the whole trick

```
CRM workflow  ──POST /api/v1/tasks──→  0nTask
    body includes:
      contact_id     the person        (MANY tasks share one)
      external_id    THIS task, unique (the dedupe key)
      source: "crm"
      skip_webhooks: true   ← stops 0nTask echoing back

0nTask  ──task.completed──→  CRM inbound webhook
    CRM workflow first checks:  if source == "crm" → stop
                                                   ← second loop guard
```

Call out the failure this prevents: **without both guards the two systems create
tasks for each other forever.** And note that `contact_id` and `external_id` are
different on purpose — using the contact id as the dedupe key would make the second
task for a contact overwrite the first.

### D. 0nMCP as the executor

```
0nMCP catalog: 113 services (0nTask is registered as one of them)
   tools: list_tasks · create_task · update_task · delete_task · quick_add

Any MCP client  ──→  0nMCP  ──→  reads 0nVault  ──→  calls the real service
```

Label this **"an MCP inside an MCP"** — 0nTask needs no separate MCP server
because it exposes a REST API that 0nMCP wraps like any other service.

---

## Module system — include as a small inset on Diagram 1 or 4

Capabilities are packaged as modules with declared dependencies, so
"compatible with X" is computed rather than claimed.

| Module | Version | Status | Requires |
|---|---|---|---|
| tasks | 1.0.0 | stable | — |
| notes | 1.0.0 | stable | — |
| api | 1.0.0 | stable | tasks |
| **flow** | 0.9.0 | **beta** | tasks |

Draw `flow` visibly as beta. An app without `tasks` installed **cannot** host
`flow` — that dependency is the point of the inset.

---

## Things that must NOT appear in the diagrams

- Any credential flowing into 0nTask, web0n, CRO9 or social0n. Only 0nMCP touches the vault.
- 0nCore drawn as a CRM. It is the account and brand home.
- app0n, 0ncode or 0nCore-as-SSO-hub drawn as finished. Mark `NOT BUILT` / planned.
- A single tidy post-login destination. Today there are three (`/welcome`,
  `/dashboard`, `/hub`) and the diagram should show that honestly with a
  "being consolidated" callout.
- `flow` shown as stable.
