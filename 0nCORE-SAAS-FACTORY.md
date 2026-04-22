# 0nCore SaaS Factory — Custom App Platform for Agencies

> **Status**: Research & Design Phase
> **Author**: Mike @ RocketOpp LLC + Jaxx (0nAI)
> **Date**: April 21, 2026
> **Prerequisite**: 0nCore Agency Unlimited Plan

---

## Vision

Any agency on the Unlimited plan can create a **branded SaaS product** that runs on 0nCore infrastructure. Their clients never see 0nCore — they see the agency's brand, domain, and product. RocketOpp powers the backend, takes a platform fee, and the agency builds a recurring revenue business on top.

**Tagline**: "Your SaaS. Our Infrastructure. Their Revenue."

---

## Three Levels

### Level 1: White-Label Portal
Agency gets a branded dashboard at their own domain. Clients log in, see agency branding, interact with CRM/AI/workflows. 0nCore is invisible.

**Already have**: White-label settings page, agency management, K-layers, CRM sub-locations
**Need to build**: Custom domain routing, per-app theme injection, isolated login

### Level 2: Custom App Builder
Agency defines custom pages, forms, workflows, and data views through a visual builder. They pick which add-ons power each section. Clients get a purpose-built app, not a generic dashboard.

**Already have**: 31 add-ons with feature flags, execution engine, K-layer context
**Need to build**: Page builder (config-driven layouts), component picker, preview mode

### Level 3: SaaS Factory (Full Platform)
Agency defines a product with subscription tiers, onboarding flow, feature gates, and billing. They sell to THEIR clients on recurring. 0nCore handles everything under the hood.

**Already have**: Stripe integration, onboarding flow, marketplace system
**Need to build**: Stripe Connect, app definition schema, tier management, app marketplace

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    AGENCY (Unlimited Plan)                │
│                                                          │
│  Creates "App Definition":                               │
│  - Name, domain, logo, colors, fonts                     │
│  - Which add-ons are enabled                             │
│  - K-layer templates (brand voice, industry, workflows)  │
│  - Custom pages (visual builder or config)               │
│  - Pricing tiers for THEIR clients                       │
│  - Onboarding flow template                              │
│  - Feature gates per tier                                │
└──────────────────────┬───────────────────────────────────┘
                       │ generates
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  DEPLOYED APP INSTANCE                    │
│                                                          │
│  - Custom domain (agency.com → Vercel)                   │
│  - Isolated CRM sub-location per end user                │
│  - Scoped K-layers (agency's brand + client's company)   │
│  - Stripe Connect for agency billing                     │
│  - Per-client data isolation (RLS)                       │
│  - Agency's add-ons active, rest hidden                  │
│  - Custom AI persona (agency's trained brain)            │
└──────────────────────┬───────────────────────────────────┘
                       │ serves
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    END USERS (Agency's Clients)           │
│                                                          │
│  - Branded login page                                    │
│  - Custom dashboard (only enabled features)              │
│  - AI assistant with agency's K-layers                   │
│  - Self-service billing (via Stripe Connect)             │
│  - Onboarding flow defined by agency                     │
│  - No awareness of 0nCore / RocketOpp                    │
└──────────────────────────────────────────────────────────┘
```

---

## Revenue Model

| Layer | Flow | Example |
|-------|------|---------|
| **Platform Fee** | Agency → RocketOpp | $199/mo per app OR 5% of MRR |
| **Seat Fees** | End user → Agency (Stripe Connect) | Agency charges $49-499/mo |
| **Add-on Costs** | Wholesale → Agency → End user | RocketOpp bills $29, agency charges $49 |
| **AI Usage** | Metered pass-through | $0.01/execution, agency marks up |
| **Overage** | Per-seat tiers | Free up to 10 seats, then $5/seat |

**Stripe Connect Split**: Agency is the merchant of record. RocketOpp takes application_fee_percent on each charge (5-15%). Agency keeps the rest.

---

## Database Schema (Draft)

```sql
-- App definitions created by agencies
CREATE TABLE saas_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_user_id UUID NOT NULL,          -- Agency owner
  agency_location_id TEXT,               -- CRM location

  -- Branding
  app_name TEXT NOT NULL,
  app_slug TEXT UNIQUE NOT NULL,          -- subdomain: {slug}.0ncore.com
  custom_domain TEXT,                     -- agency's own domain
  logo_url TEXT,
  favicon_url TEXT,
  brand_colors JSONB DEFAULT '{}',       -- {primary, secondary, accent, bg, text}
  
  -- Configuration
  enabled_addons TEXT[] DEFAULT '{}',     -- Which marketplace add-ons are active
  k_layer_template JSONB DEFAULT '{}',   -- Default K-layer content for new users
  custom_pages JSONB DEFAULT '[]',       -- Page builder config
  onboarding_steps JSONB DEFAULT '[]',   -- Custom onboarding flow
  
  -- Billing (Stripe Connect)
  stripe_connect_id TEXT,                -- Agency's Stripe Connect account
  pricing_tiers JSONB DEFAULT '[]',      -- [{name, price_cents, features[], stripe_price_id}]
  
  -- Limits
  max_seats INTEGER DEFAULT 50,
  max_locations INTEGER DEFAULT 10,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'suspended')),
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- End users of agency apps
CREATE TABLE saas_app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES saas_apps(id) ON DELETE CASCADE,
  user_id UUID,                          -- Supabase auth user
  email TEXT NOT NULL,
  name TEXT,
  
  -- Billing
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- CRM
  crm_contact_id TEXT,
  crm_location_id TEXT,                  -- Their own sub-location
  
  -- Status
  status TEXT DEFAULT 'active',
  onboarding_complete BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- App analytics
CREATE TABLE saas_app_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id UUID REFERENCES saas_apps(id) ON DELETE CASCADE,
  user_id UUID,
  event_type TEXT NOT NULL,              -- 'signup', 'login', 'addon_used', 'payment', 'churn'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saas_apps_agency ON saas_apps(agency_user_id);
CREATE INDEX idx_saas_apps_slug ON saas_apps(app_slug);
CREATE INDEX idx_saas_apps_domain ON saas_apps(custom_domain);
CREATE INDEX idx_saas_app_users_app ON saas_app_users(app_id);
CREATE INDEX idx_saas_app_events_app ON saas_app_events(app_id, created_at DESC);
```

---

## Middleware Routing (How Custom Domains Work)

```typescript
// middleware.ts addition
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  
  // Check if this is a custom app domain (not 0ncore.com)
  if (!hostname.includes('0ncore.com') && !hostname.includes('localhost')) {
    // Look up app by custom domain
    const app = await lookupAppByDomain(hostname)
    if (app) {
      // Inject app context into headers for downstream pages
      const response = NextResponse.rewrite(request.nextUrl)
      response.headers.set('x-saas-app-id', app.id)
      response.headers.set('x-saas-app-slug', app.app_slug)
      response.headers.set('x-saas-brand', JSON.stringify(app.brand_colors))
      return response
    }
  }
  
  // Check for subdomain: {slug}.0ncore.com
  const subdomain = hostname.split('.')[0]
  if (subdomain && subdomain !== 'www' && subdomain !== '0ncore') {
    const app = await lookupAppBySlug(subdomain)
    if (app) {
      // Same injection
    }
  }
}
```

---

## Page Builder Concept (Level 2)

Agencies build pages from a component palette:

```json
{
  "pages": [
    {
      "slug": "dashboard",
      "title": "Dashboard",
      "layout": "sidebar",
      "sections": [
        { "type": "stat-grid", "config": { "metrics": ["contacts", "revenue", "tasks", "appointments"] }},
        { "type": "activity-feed", "config": { "maxItems": 10 }},
        { "type": "pipeline-view", "config": { "pipelineId": "auto" }},
        { "type": "quick-actions", "config": { "actions": ["new-contact", "send-email", "book-call"] }}
      ]
    },
    {
      "slug": "clients",
      "title": "My Clients",
      "layout": "full",
      "sections": [
        { "type": "data-table", "config": { "source": "contacts", "columns": ["name", "email", "status", "lastActivity"] }},
        { "type": "kanban", "config": { "source": "pipeline", "groupBy": "stage" }}
      ]
    }
  ]
}
```

**Available Section Types** (maps to 0nCore add-ons):
- `stat-grid` — KPI cards (from Analytics add-on)
- `activity-feed` — Recent actions (@0nork/ui pattern)
- `pipeline-view` — Kanban pipeline (from Pipeline add-on)
- `data-table` — Sortable/filterable table (from Contact Manager)
- `calendar` — Booking calendar (from Calendar add-on)
- `chat-widget` — AI chat (from Conversation AI)
- `form` — Dynamic form (from Form Builder)
- `media-gallery` — File browser (from Media Manager)
- `quick-actions` — Action buttons (@0nork/ui Checklist)
- `timeline` — Project timeline (@0nork/ui Timeline)
- `deploy-pipeline` — Progress tracker (@0nork/ui DeployPipeline)

---

## Stripe Connect Flow

```
1. Agency clicks "Create App" in 0nCore
2. Redirected to Stripe Connect onboarding
3. Stripe creates Connected Account for agency
4. Agency defines pricing tiers:
   - Free: $0/mo (limited features)
   - Pro: $49/mo (most add-ons)
   - Enterprise: $199/mo (everything + API)
5. When agency's client subscribes:
   - Stripe charges client
   - Platform fee (5-15%) goes to RocketOpp
   - Remainder goes to agency
6. Agency sees revenue dashboard in 0nCore
```

---

## Implementation Phases

### Phase 1: White-Label Portal (Week 1-2)
- [ ] App definition schema + Supabase migration
- [ ] App creation wizard in `/dashboard/agency/apps/create`
- [ ] Subdomain routing ({slug}.0ncore.com)
- [ ] Dynamic theme injection (logo, colors, fonts)
- [ ] Isolated login page per app
- [ ] App management dashboard

### Phase 2: Stripe Connect (Week 3-4)
- [ ] Stripe Connect onboarding flow
- [ ] Pricing tier builder
- [ ] Subscription management for end users
- [ ] Revenue dashboard for agencies
- [ ] Platform fee collection

### Phase 3: Custom Domain (Week 4-5)
- [ ] Vercel domain API integration
- [ ] SSL provisioning
- [ ] DNS verification flow
- [ ] Domain management UI

### Phase 4: Page Builder (Week 5-7)
- [ ] Section type registry
- [ ] Visual page editor (drag/drop or config)
- [ ] Preview mode
- [ ] Per-page feature gating by tier

### Phase 5: App Marketplace (Week 7-8)
- [ ] App template publishing
- [ ] Template browsing/cloning
- [ ] Rating/reviews
- [ ] Revenue sharing for templates

---

## Competitive Landscape

| Platform | What They Do | 0nCore Advantage |
|----------|-------------|------------------|
| **GoHighLevel SaaS Mode** | White-label CRM with custom domains | We add AI, 1,554 tools, K-layers, .0n workflows |
| **Softr** | No-code app builder on Airtable | We have real CRM + pipeline + billing built in |
| **Retool** | Internal tool builder | We're client-facing, not internal |
| **Bubble** | Full no-code app builder | We're domain-specific (business ops + AI) |
| **Stacker** | Apps on spreadsheets | We have real infrastructure (CRM, payments, AI) |

**Our moat**: 0nMCP (1,554 tools), K-layer AI personalization, CRM-native, patent-pending execution engine.

---

## Key Questions to Resolve

1. **Pricing model**: Flat fee per app vs. % of MRR vs. per-seat vs. hybrid?
2. **Data isolation**: Separate Supabase projects per app, or RLS within shared DB?
3. **Domain strategy**: Subdomains only ({slug}.0ncore.com) or custom domains from day 1?
4. **AI costs**: Who pays for Groq/Claude usage — agency or pass-through to end user?
5. **Compliance**: Do we need SOC 2 / HIPAA BAA for agencies serving healthcare clients?
6. **App templates**: Should we pre-build vertical templates (Healthcare, Real Estate, Legal)?
7. **Branding**: Is this a separate product name or stays under "0nCore"?

---

## Example: Expert Medicaid Consultants as a SaaS

Imagine EMC (the client we just signed) wanted to offer their own SaaS to Medicaid applicants:

**App**: MedicaidTracker.com
**Built on**: 0nCore SaaS Factory
**Tiers**:
- Free: Check application status
- Pro ($29/mo): AI-assisted document prep, appointment booking
- Business ($99/mo): Full case management, recertification tracking, HRA coordination

**Under the hood**: 0nCore dashboard with Contact Manager, Calendar, Voice AI, Pipeline, and Form Builder add-ons. K-layers loaded with Medicaid-specific knowledge. Custom onboarding that collects applicant info.

**Revenue**:
- EMC charges clients $29-99/mo
- RocketOpp takes 10% platform fee
- EMC keeps 90%
- Everyone wins

---

*This document is for research purposes. Bring findings back to Jaxx in Claude Code for implementation.*
