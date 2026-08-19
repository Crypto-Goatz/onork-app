# 0nCORE — Project State

**Read this first after a restart.** Everything below is verified against production, not remembered.
Last updated at the end of a 59-commit session.

---

## 1. What this is

**app.0ncore.com** is a marketplace app that runs inside the CRM as a Custom Page. An agency owner
types one sentence and it plans, prices and executes work across every client account they manage.

**www.0ncore.com** is the marketing site and the older customer portal. Same repo
(`~/Github/onork-app`), split by hostname in `middleware.ts`.

The product's differentiator is not the AI. It is that **nothing reaches a client account without a
human approving a signed plan**, and every action leaves a receipt.

---

## 2. The two canonical apps — key off the ID, never the name

| Portal display name | App ID | Role | Env pair |
|---|---|---|---|
| "0ncore Agency Functions (Essentials)" | `6a7178a4e8d7c3c038c593b3` | **SUB-ACCOUNT** — Custom Page, SSO, widgets, workflow actions, per-location tokens, wallet | `CRM_SUBACCT_CLIENT_ID` / `_SECRET` |
| "0ncore Agency Control Center" | `6a71919be8d7c3c038df0839` | **AGENCY** — provisioning, snapshots, SaaS, companies. Backend only | `CRM_AGENCY_APP_CLIENT_ID` / `_SECRET` |

**The display names are the reverse of their roles.** Pairing verified cryptographically
(sha256 of each secret compared against the live deployment): `6a7178a4…`→`bd22dd0b80d9`,
`6a71919b…`→`b79b23843cd1`. Not crossed.

**Do NOT remove the legacy app `69c762225a31e1cd2f28dd4c`.** It holds the live tokens that power
contacts, locations, location-token minting and every executor write. `getValidAgencyToken(companyId,
scope?)` picks an install **by the scope it actually holds** — the V2 agency app has snapshots and
SaaS but **no `oauth.write`**, so asking for "an agency token" to mint a location token hands back
one that cannot. That regression happened once already.

Snapshot shipped at provisioning: `WHGzGLK0RKBFVAM439au` ("0nMCP Sub-Location - CORE ACCOUNT"),
overridable via `CRM_MASTER_SNAPSHOT_ID`.
⚠️ **TWO snapshots share that exact name.** The other is `EMpZfNjnGJStlBpYAHq6`. Confirm which is
current — it is a one-env-var change, no deploy.

### 2a. Course Builder — and the duplicate that is RETIRED, NOT DELETED

| App | App ID | State |
|---|---|---|
| Course Builder — canonical | `69801f7a533633818a22921c` | The one the callback, `/api/oauth/install/course` and the marketplace submission all use. In review. **Zero installs ever.** |
| Course Builder — second registration | `6a7ea3e803672cba97505c5c` | **RETIRED 2026-08-19 — recorded, not deleted.** Do not install it, do not delete the listing. Its listing is still installable, which is how a code can still be issued against it. |

**Why the record exists at all.** A duplicate app ID that is simply deleted comes back: someone
re-creates it, or quotes it as canonical, because nothing anywhere says it was killed on purpose.
So it is written down in two places that survive a restart — this table, and `RETIRED_CRM_APPS`
in `lib/crm-apps.ts` (the file `lib/crm.ts` and `lib/crm-router.ts` already read to resolve an app),
with `isRetiredCrmApp()` matching on the prefix.

**The receipt, and its limit.** `crm_installations` read with the service role, 2026-08-19: **30
rows, three app IDs only** — `69c762…`×28, `6a7178a4…`×1, `6a71919b…`×1. **Zero rows for either
Course Builder app**, so there was nothing in the database to archive; the retirement is a
record-of-truth fact, not a row edit.

**The full second app ID is now known: `6a7ea3e803672cba97505c5c`** (recovered 2026-08-19 — it is
the appId half of `CRM_LEADSCOUT_CLIENT_ID`, whose value is `6a7ea3e803672cba97505c5c-mssi3q6k`).
It never needed the portal; it was sitting in this deployment's own environment under a name that
does not mention Course Builder. **`CRM_LEADSCOUT_CLIENT_ID` / `_SECRET` / `_SSO_KEY` are that
retired app's credentials.** They stay — the OAuth callback uses them to DIAGNOSE (never to
complete) an install that originated from the retired listing, so a code issued by the wrong
listing reports itself instead of looking like a stale secret.

⚠️ **A CLIENT_ID IS NOT AN APP.** The legacy app `69c762…` has FOUR registered client keys —
`-mnu5pazi` (main), `-mn9wyk9o` (external auth), `-mnsa16jo` (install), `-mpa19g2x`. Only the one
that issued a code can redeem it; the others are rejected as **"Invalid client credentials"**,
which reads as a wrong secret and is not one. All four are in the callback ladder as of
2026-08-19.

---

## 2b. The add-on frame and its gate — `/x/[slug]`

**One skeleton, three facts:** `{ appId, entryRoute, requiredEntitlement }` (`lib/addons/skeleton.ts`).
It is DERIVED from `lib/addon-registry.ts` (is there code behind it) and `lib/marketplace-data.ts`
(what plan is it sold on), never hand-written — this repo has already paid for three catalogues that
disagreed. `appId` is null for add-ons delivered by the sub-account app; only an add-on with its own
CRM registration names one (`ai-course-builder` → `69801f7a533633818a22921c`).

**Entitlement is keyed on `location_id`, never `user_id.`** The gate this replaced read `product_keys`
by user — a table with **zero rows in production**, so every Run press 403'd. Even populated it is the
wrong key: 16 `profiles` rows point at `nphConTwfHcVE1oA0uep`, so a user-keyed grant lets the buyer run
an add-on and locks out their colleagues on the same subscription.

**Tri-state, derived from the clock, never stored:** `active` / `grace (≤7d)` / `locked`. A stored
lifecycle needs a cron to stay true and goes stale the first time the cron misses.

**Three sources, one veto** (`lib/addons/entitlements.ts` · `resolveEntitlement`):

| Source | Grants when | Grace |
|---|---|---|
| `explicit` | `addon_entitlements` row, `status='active'` | `expires_at + grace_days` |
| `tier` | `location_plans.tier` reaches the rung on the `pricing.ts` ladder. **Enterprise is the top rung, which is how "enterprise = all add-ons" is enforced** — no list of exceptions | — |
| `install` | live `crm_installations` row at this location (**install IS an entitlement**) | 7d from `status='expired'`; `archived` gets none — they removed it on purpose |

`status='revoked'` outranks all three. `source:'owner'` is an operator override that writes no row.
A failed read is `locked` + `verified:false` and says "we could not check", never "you don't own this".

**Two traps this database already contains, both closed here.** `location_id <> ''` is a CHECK
constraint, not a convention — `crm_installations` carries a row with `location_id = ''` that read as
the newest install in the table (d013372). And ids are trimmed, because `profiles` carries
`'nphConTwfHcVE1oA0uep\n'`.

**Nothing was backfilled into `location_plans`, deliberately.** `profiles.plan` is per user, and several
rows carrying `'enterprise'` were written by security tests (`fake_admin@evil.com` among them). An absent
row means *not measured* and the resolver prints that rather than inventing `'free'`. **So on production
today every `/x/` tile is locked for everyone except a live install or the owner** — that is the true
state, not a regression. Grant with `setAddonEntitlement()` or a `location_plans` row.

**Enforced twice:** the page refuses to render the frame, and `/api/addons/[slug]/{config,execute}` refuse
again via `lib/addons/guard.ts` (`402` for an honest lock, `503` when the check itself failed). The Hub
asks the same resolver — it used to open every tile the moment *any* location had a live install.

**Receipts.** `scripts/verify-addon-gate.mts` — 27 checks against the live DB, cleans up.
`scripts/verify-addon-gate-live.mts` — 27 checks over real HTTP against www.0ncore.com with a real
signed-in session (throwaway account, deleted at the end). Both green 2026-08-18.

**Known gap, named not hidden:** `addon_configs` is still keyed on `user_id` (unique index on
`user_id, addon_slug`). Access is decided per location; the answers are still stored per user. Moving it
is its own migration with a backfill.

---

## 3. Where we stand, by the numbers

| | |
|---|---|
| Capabilities wired / in registry | **19 / 33** |
| OAuth scopes held (live token) | **142** |
| API routes | **483** |
| Widgets defined / live | **11 / 8** |
| Widget bundles built | **6** |
| Workflow actions / triggers | **6 / 7** |
| Portal screens scanned (0nCORE / 0nMCP) | **78 / 62** |

**Wired capabilities:** `agent.create` `agent.list` `agent.run` `appointment.book` `contact.create`
`contact.note` `contact.search` `contact.tag` `contact.update` `conversation.read`
`customfield.create` `email.send` `external.call` `opportunity.move` `sms.send` `snapshot.list`
`task.create` `workflow.list` `workflow.trigger`

The other 14 are not neglect: 3 are `blocked` (no API exists for anyone), 3 apply only at
sub-account creation, 2 wait on webOn/socialOn, the rest need meters or the provisioning pipeline.

---

## 4. Verified platform facts — these cost real time

| Area | Finding |
|---|---|
| **Workflows** | `workflows-v3` exposes exactly ONE path: `GET /workflows/`. No create or edit, for anyone. |
| **Enrolment** | `POST /contacts/{id}/workflow/{workflowId}` DOES exist. We cannot author a workflow; we can decide who enters one. |
| **Agent Studio** | **Writable.** Path is `/agent-studio/agent` **singular**. Create is 3 calls: shell with **empty `nodes`** → PATCH the graph → publish. A populated `nodes` makes the server derive `graphMetadata` it has no model for. |
| **Agent execute** | `locationId` goes in the **body**, not the query. A **404 means unpublished**, not missing. |
| **Conversation AI** | Full CRUD. Action type `triggerWorkflow` is the bridge to everything else. Rejects `locationId` in the query (422). |
| **Snapshots** | Cannot be created by API (404). Share links CAN be generated. Re-push is a manual UI step — *not automatable*, not impossible. |
| **SaaS** | `GET /saas-api/public-api/locations` is a **lookup keyed by a Stripe id**, not an enumeration. There is no "list my plans" call. |
| **Wallet** | `POST /marketplace/billing/charges` needs `{appId, meterId, eventId, locationId, companyId, description, units}`. **Price lives in a portal meter** — we send units. `has-funds` returned true for 100,000,000, so it is advisory only. |
| **v3** | No `/v3/` REST path (404). Versioned by date header; `2021-07-28` is current. "v3" = the marketplace platform, which is what we already build on. **Zero migration.** |
| **`locationId` traps** | Duplicated in a query → misleading **403** "token does not have access". Injected into a sub-resource body → **422** "property locationId should not exist". Use `crmPostRaw` / `crmPatchRaw`. |

**The API docs repo is the source of truth:** `~/Downloads/highlevel-api-docs-main`.
The docs *site* is a SPA and returns only a shell to a fetch. Probing live cost 9 stray agents on a
real account before this. **Probe against a scratch location, never customer zero.**

---

## 5. Surfaces

**app.0ncore.com** (middleware rewrites every path into `/crm/*`; `/portal` and `/widgets` excluded)

| Route | What |
|---|---|
| `/` | Command centre — plan → Approve & Run → receipts |
| `/dashboard` | Welcome page; leads with what is blocked |
| `/clients` | 86 sub-accounts, unbilled-first, detail drawer |
| `/automations` | Plans · **Lead Engine** · **Demand Radar** · Workflow Actions · **Agent Fleet** · Agent Connect · Visualizer · Insights |
| `/tools` | Every feature as a tile, green/yellow/red badge, API version |
| `/log` | Unified history + live system check |
| `/portal` | Member portal (public — members, not the agency) |

**Key endpoints:** `/api/sso` `/api/bootstrap` `/api/burst/plan` `/api/burst/run` `/api/clients`
`/api/saas` `/api/snapshots` `/api/tools` `/api/log` `/api/diagnostics` `/api/ideas`
`/api/agents/fleet` `/api/agents/run` `/api/lead-engine/capture` `/api/member/profile`
`/api/crm/action/:key` `/api/crm/trigger/:key/subscribe` `/api/widgets/config/:key`

---

## 6. Safety properties — do not weaken these

1. **Signed plans.** `/api/burst/plan` HMACs every leg's capability, location and params.
   `/api/burst/run` executes only what was signed. Without it, "Approve" would mean *a* plan, not
   *that* plan — and the **targets** would be attacker-chosen. 11/11 tests.
2. **Replay blocked at the database.** `burst_runs.plan_id` is UNIQUE and claimed before any work.
3. **Receipts written BEFORE the call.** A receipt built from a response cannot record calls that
   never came back. A stuck `pending` is the signal.
4. **Blast radius = 25.** Tags are workflow triggers; a bulk tag on this CRM once matched 172,000
   contacts and sent ~294,000 emails for ~$300. Verified refusing at 464.
5. **Billable legs refuse without a meter** rather than working for free.
6. **Member portal never accepts a contact id from the client.** Signed session only — otherwise
   anyone edits a URL and reads a stranger's profile.
7. **Generated agents are created INACTIVE.**

---

## 7. Blocked — and on whom

**Portal (browser work):**
- Save one **action shell** → capture the callback contract → set `CRM_ACTION_SECRET`.
  `/api/crm/action/:key` **fails closed (503) on every call** until then. Deliberate: this repo has
  already shipped an open write endpoint once (`/api/admin/linkedin-queue`).
- Create the **billing meters** on `6a7178a4…` → `CRM_METER_SITE_BUILD` / `_CLIENT_PROVISION` /
  `_SOCIAL_POST`.
- Upload the **6 widget bundles** (`widgets/dist/*.zip`). Needs an editable draft of the Live app.

**Mike:** confirm which master snapshot is current.

**Build queue** is in 0nTask under project **"0nCORE CC Task List"** — 18 tasks, categorised.

---

## 8. Known broken

- `/api/auth/session` — **404 in production**. Breaks Config + Freelancer screens; the legacy CRM
  chrome calls it too.
- 0nMCP portal: `/api/0nai/{stats,train,test}`, `/api/console/billing/status`, 6 ×
  `/api/linkedin/suite/*` — all verified 404.
- **40 tables still have RLS off.** Credential tables are locked (`crm_installations`, `crm_tokens`,
  `user_tokens`, `hub_connections`) after `crm_installations` was found leaking live access and
  refresh tokens to the **public anon key**. `hub_kb_docs` (957 rows) and `engine_messages` remain open.
- `/api/diag/oauth` is a temporary debugging route — **delete it.**

---

## 9. Key files

```
lib/crm/registry.ts       the capability spine — planner, gate and executor all read it
lib/burst/executor.ts     the ONLY code that writes to a client account
lib/burst/plan-token.ts   signed plans
lib/billing/gate.ts       canRun() before, settle() only after success
lib/crm/agency-token.ts   scope-aware token routing across three apps
lib/crm/agents.ts         Agent Studio — 3-step create, execute
lib/crm/conversation-ai.ts chat agents + triggerWorkflow bridge
lib/crm/wallet.ts         marketplace wallet charges
lib/widgets/registry.ts   the 11 widgets
lib/research/ideas.ts     demand radar, 82 boards
lib/log/collect.ts        unified log
scripts/scan-tools.mjs    generates the tool inventory FROM the code
widgets/build.mjs         builds + zips the builder bundles
docs/CAPABILITIES.md      generated capability + scope report
```

**Deploy:** `npx vercel deploy --prod --yes --archive=tgz --token "$(cat ~/.vercel-token)"`.
`vercel.json` has `git.deploymentEnabled.main: false` — **a push does not deploy.**

---

## 10. Companion pieces built this session

- **RocketOpp Lead Engine** (`~/Github/rocketopp-lead-engine`) — Chrome MV3. Finds businesses with
  no website on Maps/Yelp/YP/BBB, pushes Contact + $1,085 opportunity + source note. Deduped twice.
  Token in `LEAD_ENGINE_TOKEN`. Auto-push OFF by default.
- **Demand Radar** — 82 idea boards, 792 requests, 3×/day. Top signal: *Membership Portal* 965,
  *Agency-level workflows* 818, *API-first* 914.
- **Membership Portal** — the #1 request, built. Widget + hosted page + link action + 2 triggers.

---

## 11. Next, in order

1. Unblock the portal items above — they gate real revenue.
2. **Tile 2 provisioning** (`location.create` + snapshot at create) — the paid `CLIENT_PROVISION` event.
3. **GitHub App** (not OAuth App — per-repo install, short-lived tokens; write path must be
   branch → commit → **PR**, never a push to default).
4. **0nMCP npm release** — verify tool count, run tests, update docs, publish. Deserves its own pass.
5. LP Element widget (buildable now); Site Builder + Course Embed wait on their products.
