# Claude Chrome — Build 0nCore Products in CRM Marketplace

> Hand this file to a Claude Chrome (browser-driving) session. It contains everything needed to log into the CRM and build the 7 UCP products + 5 .0n marketplace apps as actual purchasable items in the CRM Marketplace.

## Mission

The 0nCore UCP marketplace is live at https://0ncore.com — products are queryable at `https://0ncore.com/api/ucp/catalog`. The CRM Marketplace App (App ID `69c762225a31e1cd2f28dd4c`) is registered. Your job is to **create matching product listings in the CRM Marketplace UI** so CRM agencies and sub-accounts can install them.

## Source of truth — pull live data first

Hit these endpoints to get the canonical product metadata. Do NOT hand-copy from the spec — pull live so versions match.

```
# All paid services (HIPAA scan, CRO9 audit, etc.)
GET https://0ncore.com/api/ucp/catalog?action=list_products

# All installable .0n apps
GET https://0ncore.com/api/marketplace/apps?limit=60

# UCP discovery (fulfillment types, payment handlers)
GET https://0ncore.com/.well-known/ucp
```

## Login

1. Navigate to https://app.gohighlevel.com
2. Sign in as `mike@rocketopp.com` (password in 1Password — agency owner account)
3. Switch to the **0nCore** sub-location: `nphConTwfHcVE1oA0uep`

## CRM Marketplace App management

The app is already registered. Navigate to: **Settings → Marketplace → My Apps → 0nCore Marketplace App**.

App ID: `69c762225a31e1cd2f28dd4c`
Redirect URI: `https://0ncore.com/api/oauth/callback`

## Products to create — 7 UCP services

For each row below, click "Add Product" in the CRM marketplace UI and fill in:

| Slug | Name | Price | Description (paste verbatim) | Fulfillment URL |
|---|---|---|---|---|
| `hipaa-scan` | HIPAA Compliance Scan | $147.00 | Full 63-point HIPAA compliance audit. Instant report. | `https://0ncore.com/api/ucp/checkout` (POST `product_slug=hipaa-scan`) |
| `cro9-audit` | CRO9 SEO Audit | $297.00 | Complete search experience optimization audit. | `…?product_slug=cro9-audit` |
| `ai-blog-post` | AI Blog Post | $97.00 | Professional 1,500+ word blog post, SEO optimized. | `…?product_slug=ai-blog-post` |
| `crm-setup` | CRM Account Setup | $497.00 | Full CRM with pipelines, fields, tags, automations. | `…?product_slug=crm-setup` |
| `wordpress-management` | WordPress AI Management | $297.00/mo | Monthly AI content, updates, security, SEO. | `…?product_slug=wordpress-management` |
| `custom-automation` | Custom AI Automation | $997.00 | Describe it. We build and deploy it. | `…?product_slug=custom-automation` |
| `0n-app-install` | 0n App Install | Free | Install any .0n app from the marketplace. | `…?product_slug=0n-app-install` |

**Long descriptions, tags, and category** for each: pull live from `GET /api/ucp/catalog?action=get_product&slug=<slug>` — fields `long_description`, `tags`, `category`.

## Apps to create — 5 .0n marketplace apps

These are workflow apps (no upfront cost — they install via the parent `0n-app-install` product). For the CRM marketplace, list them as **free add-ons** that point users back to `https://0ncore.com/dashboard/marketplace/<slug>` for install.

| Slug | Name | Required Plan | Trigger Type | Steps |
|---|---|---|---|---|
| `welcome-sequence` | Welcome Sequence | starter | crm_event (contact.created) | 3 |
| `linkedin-lead-qualifier` | LinkedIn Lead Qualifier | supporter | webhook (linkedin.profile.viewed) | 3 |
| `weekly-report` | Weekly Business Report | supporter | scheduled (Mon 9am ET) | 4 |
| `invoice-followup` | Invoice Follow-Up | supporter | scheduled (daily 10am ET) | 5 |
| `wordpress-content-pipeline` | WordPress Content Pipeline | builder | scheduled (daily 7am ET) | 4 |

For each, in the CRM marketplace UI:
1. **Name** + **slug** + **description** (pull from `GET /api/marketplace/apps?limit=60`, find by slug)
2. **App icon**: 32×32 PNG of the single-letter icon (e.g. `W`, `L`, `R`, `$`, `WP`) — use a green (`#7ed957`) circle with white letter centered. Or upload `https://0ncore.com/icons/apps/<slug>.png` if those have been generated.
3. **External install URL**: `https://0ncore.com/dashboard/marketplace/<slug>?install=1`
4. **Webhook URL** (for crm_event apps): `https://0ncore.com/api/webhooks/crm`
5. **Category**: pick the closest from CRM's marketplace categories (Lead Generation, Content, Reporting, Finance, etc.)

## Workflows to register

Two CRM workflow integrations are already live and need to remain wired:

| Workflow Action | Endpoint | Purpose |
|---|---|---|
| **Run OnCore** (action) | `POST https://0ncore.com/api/workflow-action/execute` | Triggers any 0nMCP tool from a CRM workflow |
| **OnCore Event** (trigger) | `POST https://0ncore.com/api/workflow-triggers/register` | Subscribes a CRM workflow to a 0nCore event |

Confirm both still appear under: **Settings → Marketplace App → Workflow Integrations**. If missing, re-register from the app config.

## Payment routing

CRM Marketplace uses its own billing flow for sub-account purchases. For one-time UCP products (HIPAA scan, CRO9, blog, CRM setup, custom automation):

- Charge through CRM's billing webhook
- 0nCore listens at `POST https://0ncore.com/api/webhooks/crm` for `app.subscription.created` events
- The Stripe webhook at `https://0ncore.com/api/webhooks/stripe` also fires for direct UCP checkout (the bypass path)

For recurring (`wordpress-management`):
- Set CRM SaaS pricing to $297/mo
- Trial: 7 days
- Bind to Stripe price ID: `price_1T1rYYHThmAuKVQMZIOi4kdq` (Builder tier, closest match)

## Verification steps after build

1. Open the CRM marketplace listing as a buyer (incognito): `https://app.gohighlevel.com/marketplace/0ncore`
2. Click **HIPAA Compliance Scan** → confirm $147 price + Buy button
3. Click Buy → confirm redirect lands on CRM's checkout, not Stripe directly (sub-account billing path)
4. Complete a $0 test purchase if CRM allows test mode
5. Verify a row appears in the 0nCore DB: `SELECT * FROM ucp_orders ORDER BY created_at DESC LIMIT 1;` (Supabase project `pwujhhmlrtxjmjzyttwn`)
6. Confirm fulfillment fired: order status should flip to `paid` then `fulfilled` within 60 seconds

## What you do NOT need to do

- Do not modify the Supabase schema
- Do not change the OAuth scopes (140+ scopes already approved)
- Do not touch the PIT tokens (`pit-f5f41b5a-32e4-4aee-84f4-a130cd3aad91` for 0nCore, `pit-0317b406-8a47-478e-ac28-a88763a9bb3f` for RocketOpp) — these stay `type:plain` on Vercel forever
- Do not create new Stripe products — the price IDs above already exist on `acct_1PUJi5HThmAuKVQM`

## Output back

When you finish, write a short report:

```
Built: <count> products, <count> apps
CRM marketplace listing URL: <public-facing URL>
First test purchase order ID: <uuid>
Issues encountered: <list or "none">
```

Hand it back to Mike. He'll verify on 0ncore.com side.
