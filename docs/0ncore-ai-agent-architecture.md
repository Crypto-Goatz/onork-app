# 0nCore AI Agent Architecture

> **Status:** Master spec — authoritative for the per-sub-location AI agent product.
> **Owner:** Mike @ RocketOpp LLC · mike@rocketopp.com
> **Updated:** 2026-05-03

This is the core product that makes RocketOpp a SaaS company. Every CRM
sub-location gets its own AI agent that combines three knowledge layers
plus unlockable prompt packs sold as add-ons.

This spec is the source of truth. Build from it; do not freelance.

---

## Why this is the product

A generic AI chatbot is a commodity. A chatbot that knows the entire 0n
toolchain (1,554 tools across 96 services), every CRM API surface, every
proven campaign pattern, the SXO/CRO9 methodology, and the specific
business it represents — that is a product no other agency can ship.

Three layers, stacked:

1. **RocketOpp K-Layers** — universal, baked in, our moat.
2. **Location K-Layers** — per-client, auto-populated from CRM + onboarding.
3. **Trained Llama** — Groq-hosted Llama 3.3 70B with action execution.

Plus **prompt packs** — unlockable capabilities sold as monthly add-ons,
each one extending the system prompt and wiring new workflow triggers.

---

## The Three Knowledge Layers

### Layer 1 — RocketOpp K-Layers (Universal Base)

Baked into every agent. This is the competitive moat — no other agency
has this:

- **0nMCP knowledge:** 1,554 tools across 96 services, how to chain them,
  what each one does, when to use which.
- **CRM API mastery:** every CRM endpoint, how contacts / pipelines /
  workflows / calendars / forms / funnels work, common patterns.
- **Campaign patterns:** proven templates (Mother's Day, holiday promos,
  lead nurture, re-engagement, review generation, post-purchase).
- **SXO methodology:** 6 pillars, 8 content patterns, Living DOM, CRO9
  analytics — see [`SXO-CRO9-Master-Playbook.md`](./SXO-CRO9-Master-Playbook.md).
- **VPIS scoring:** 8 factors, 58 patterns, how to generate
  high-performing content and qualify leads.
- **Workflow architecture:** how to structure automations, trigger
  types, conditional logic, webhook patterns.
- **Copy frameworks:** email subject lines that convert, SMS timing,
  Facebook ad copy patterns, landing-page hierarchy.

Layer 1 lives in versioned prompt fragments under `lib/ai/k-layers/` and
is composed at request time — not duplicated per location.

### Layer 2 — Location K-Layers (Per Client, Auto-Populated)

Pulled dynamically from the CRM location + enriched over time:

- **Business profile:** name, address, phone, email, website, hours,
  logo, colors.
- **Services / products:** what they sell, pricing, descriptions,
  categories.
- **Staff / team:** names, roles, specialties, availability.
- **Pipeline state:** current leads by stage, overdue items, revenue in
  pipeline.
- **Contact segments:** VIPs, new leads, stale contacts, recent
  purchasers.
- **Campaign history:** what was sent, open rates, click rates, what
  worked.
- **Brand voice:** tone, terminology, things to say / avoid (captured
  during onboarding).
- **Competitors:** who they compete with, differentiators.
- **FAQ:** common questions and approved answers.
- **Seasonal patterns:** busy / slow periods, annual promotions.

Layer 2 lives in `ai_agents` (static profile) + live CRM API reads at
request time (pipeline state, recent activity) so the agent always sees
fresh data.

### Layer 3 — Trained Llama (Custom Model Behavior)

Running on **Groq (`llama-3.3-70b-versatile`)**. NOT OpenAI. NOT
Anthropic SDK. Per Critical Rule #6 — Groq for ALL production AI calls.

Why Groq + Llama 3.3 70B:

- **No per-token costs eating into margins.** Flat infra, predictable
  unit economics at the SaaS price points below.
- **Custom system prompts that enforce RocketOpp's methodology.** The
  Layer 1 fragments are the tuning surface — we don't fine-tune weights,
  we tune prompts.
- **Action execution.** The agent doesn't just chat — it can create
  tags, deploy campaigns, search contacts, build workflows.
- **Consistent behavior across all locations.** Same model, same prompt
  scaffolding, deterministic structure.
- **Fast inference.** Groq is 10-50× faster than OpenAI; the agent
  feels live, not laggy.

Note on the CRM-side Conversation AI widget: that surface is currently
GHL's built-in (OpenAI under the hood). For action-taking flows and the
admin Jaxx chat we route to **our** Groq-powered `/api/ai/chat` endpoint.
Where the CRM widget supports custom-code actions, we proxy to our
endpoint so the answer comes from our stack.

---

## CRM AI Studio Configuration

### Master Agent System Prompt Template

The AI Studio agent for each location uses this system prompt structure:

```
[IDENTITY]
You are {{business_name}}'s AI assistant, powered by RocketOpp's 0nCore AI engine.
You know everything about {{business_name}} and can take actions on their behalf.

[BUSINESS CONTEXT — auto-populated from location]
Business: {{business_name}}
Address: {{address}}
Phone: {{phone}}
Website: {{website}}
Hours: {{hours}}
Services: {{services_list}}
Pricing: {{pricing_summary}}

[BRAND VOICE — set during onboarding]
Tone: {{brand_tone}}
Key phrases: {{brand_phrases}}
Never say: {{brand_avoid}}

[CAPABILITIES — base + unlocked packs]
You can:
- Answer questions about {{business_name}}'s services, pricing, and availability
- Help visitors book appointments
- Qualify leads by asking the right questions
- Respond to reviews professionally
{{#if campaign_builder_unlocked}}
- Generate complete marketing campaigns (email + SMS + social + landing page)
- Deploy campaigns directly to the CRM workflow system
{{/if}}
{{#if content_generator_unlocked}}
- Write social media posts, email newsletters, blog content
- Score content with VPIS before publishing
- Schedule posts across platforms
{{/if}}
{{#if pipeline_coach_unlocked}}
- Analyze the sales pipeline and prioritize actions
- Alert about overdue leads and stale deals
- Suggest next-best-actions for each contact
{{/if}}
{{#if report_generator_unlocked}}
- Pull campaign performance data and generate summaries
- Compare month-over-month metrics
- Identify what's working and what needs attention
{{/if}}

[OPERATIONAL RULES]
- Always represent {{business_name}} professionally
- Never make up information — if unsure, say "Let me check on that for you"
- For booking requests, use the calendar booking link: {{booking_url}}
- For pricing questions, use the approved pricing from the services list
- Tag every conversation lead in the CRM with the appropriate source
```

### Dynamic Variable Resolution

When the Snapshot is imported to a new location, these variables
auto-resolve:

| Variable | Source |
|---|---|
| `{{business_name}}` | CRM location name |
| `{{address}}` | CRM location address |
| `{{phone}}` | CRM location phone |
| `{{website}}` | CRM location website |
| `{{hours}}` | CRM location business hours |
| `{{services_list}}` | CRM products/services or onboarding wizard |
| `{{pricing_summary}}` | CRM products/services or onboarding wizard |
| `{{booking_url}}` | CRM calendar booking link |
| `{{brand_tone}}` | onboarding wizard, stored in custom fields |
| `{{brand_phrases}}` | onboarding wizard, stored in custom fields |
| `{{brand_avoid}}` | onboarding wizard, stored in custom fields |

Resolution order (mirrors 0n-spec): `system` → `location` → `onboarding`
→ `pack_overrides`. A pack can override a base capability line; nothing
can override `[OPERATIONAL RULES]`.

### Prompt Packs (Unlockable Add-ons)

Each pack adds capabilities to the AI agent by extending the system
prompt + adding workflow triggers.

#### Pack 1: Campaign Builder ($49/mo)

- **New prompts:** "Build a [holiday] campaign", "Create a flash sale
  for [service]", "Design a re-engagement sequence"
- **Generates:** campaign JSON with tags, trigger links, emails (subject
  + body), SMS, social posts, workflow steps
- **Action:** deploys the campaign to the CRM via API or outputs JSON
  for manual review
- **Workflow trigger:** `AI Campaign Deploy` — fires when AI generates a
  campaign, creates all assets

#### Pack 2: Content Generator ($29/mo)

- **New prompts:** "Write this week's posts", "Draft a newsletter about
  [topic]", "Create social content for [event]"
- **Generates:** VPIS-scored content for LinkedIn, Facebook, Instagram,
  email
- **Action:** schedules posts via CRM Social Planner, queues emails
- **Workflow trigger:** `AI Content Created` — fires when content is
  generated, routes for approval

#### Pack 3: Pipeline Coach ($39/mo)

- **New prompts:** "What should I focus on today?", "Which leads are
  going cold?", "Summarize my pipeline"
- **Reads:** pipeline stages, days-in-stage, last activity, deal values
- **Action:** creates tasks, sends follow-up reminders, tags contacts by
  urgency
- **Workflow trigger:** `Pipeline Alert` — fires daily, sends digest of
  priorities

#### Pack 4: Reputation Manager ($29/mo)

- **New prompts:** "Draft responses to new reviews", "What's my review
  score?", "Generate a review request campaign"
- **Reads:** CRM review data, recent ratings, review text
- **Action:** drafts review responses, sends review request SMS / email
  sequences
- **Workflow trigger:** `New Review Received` — fires on review webhook,
  drafts response

#### Pack 5: Report Generator ($39/mo)

- **New prompts:** "How did last month go?", "Compare this campaign to
  the last one", "What's my ROI?"
- **Reads:** campaign stats, email opens / clicks, SMS delivery, pipeline
  conversion rates
- **Action:** generates formatted report, sends to owner via email
- **Workflow trigger:** `Weekly Report` — fires every Monday, generates
  and sends

#### Full Suite: All Packs ($149/mo, save $37)

---

## Database Schema

```sql
-- Agent configuration per location
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL UNIQUE,
  agent_name TEXT DEFAULT 'AI Assistant',
  base_prompt TEXT,  -- the resolved system prompt
  brand_tone TEXT DEFAULT 'professional',
  brand_phrases JSONB DEFAULT '[]',
  brand_avoid JSONB DEFAULT '[]',
  services JSONB DEFAULT '[]',
  pricing JSONB DEFAULT '[]',
  faq JSONB DEFAULT '[]',
  competitors JSONB DEFAULT '[]',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unlocked prompt packs per location
CREATE TABLE ai_prompt_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,  -- campaign_builder, content_generator, pipeline_coach, reputation_manager, report_generator
  is_active BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,  -- null = never expires
  UNIQUE(location_id, pack_id)
);

-- Conversation history (for context continuity)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  user_id TEXT,  -- CRM user ID or contact ID
  channel TEXT DEFAULT 'admin',  -- admin, widget, sms, email
  messages JSONB NOT NULL DEFAULT '[]',
  actions_taken JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Action log (what the AI did)
CREATE TABLE ai_action_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL,
  conversation_id UUID REFERENCES ai_conversations(id),
  action_type TEXT NOT NULL,
  action_params JSONB,
  result JSONB,
  success BOOLEAN,
  executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_agents ON ai_agents(location_id);
CREATE INDEX idx_ai_packs ON ai_prompt_packs(location_id, is_active);
CREATE INDEX idx_ai_convos ON ai_conversations(location_id, updated_at DESC);
CREATE INDEX idx_ai_actions ON ai_action_log(location_id, executed_at DESC);
```

Per Critical Rule #2, all action identifiers in `action_type` and
`action_params` are `snake_case`. Per Rule #4, anything we mint
(conversation tokens, signed payloads) carries the `0n_` prefix.

---

## API Endpoints

```
POST /api/ai/chat
  Body: { locationId, message, conversationId?, channel? }
  → Loads agent config + K-layers + unlocked packs
  → Builds system prompt with all three layers
  → Calls Groq with conversation history
  → Parses actions, executes them via CRM API
  → Returns: { response, actions, conversationId }

GET /api/ai/agent/{locationId}
  → Returns agent config (prompt, brand, services, FAQ)

PATCH /api/ai/agent/{locationId}
  → Updates agent config (onboarding data, brand voice, services)

GET /api/ai/packs/{locationId}
  → Returns available + unlocked packs for this location

POST /api/ai/packs/{locationId}/activate
  Body: { packId }
  → Activates a prompt pack for this location

POST /api/ai/onboard/{locationId}
  Body: { services, pricing, brandTone, brandPhrases, brandAvoid, faq, competitors }
  → Runs the onboarding flow — populates all K-layer data for the location
  → Marks onboarding_completed = true

GET /api/ai/conversations/{locationId}
  → Returns recent conversations for this location

GET /api/ai/actions/{locationId}
  → Returns action log (what the AI has done)
```

All endpoints register in the brain registry at `lib/brain/registry.ts`
(Critical Rule #6) and emit CRO9 events on each call (Critical Rule #7).
Server reads use `getSession()`, never `getUser()` (Critical Rule #12).

---

## Onboarding Flow

When a new sub-location is created (manually or via auto-provisioning):

1. **Import the Master Snapshot.** AI agent is pre-configured with the
   base prompt template.
2. **Auto-read CRM location profile.** Fills business name, address,
   phone, website, hours.
3. **Admin opens the onboarding wizard** (admin app or CRM custom page):
   - **Step 1 — Services:** "What services do you offer?" → structured
     input or paste from website.
   - **Step 2 — Pricing:** "What's your pricing?" → tiered input or
     paste.
   - **Step 3 — Brand voice:** "Describe your brand voice" → tone picker
     + custom phrases + avoid list.
   - **Step 4 — FAQ:** "Common questions?" → FAQ builder (question +
     approved answer).
   - **Step 5 — Competitors:** "Who are your competitors?" → name + URL
     + differentiators.
4. **Save to `ai_agents` table.** All Layer 2 data persisted.
5. **System prompt auto-rebuilds** with the new K-layer data.
6. **AI is ready** — knows the business, can answer questions, can take
   actions based on unlocked packs.

The wizard ships with the SXO writing standard applied (Critical Rule
#8) and Lucide icons only (design system).

---

## CRM Snapshot Contents

The Master Snapshot that gets imported to each new sub-location:

```
Snapshot: "RocketOpp AI Engine v1"
├── AI Agent (AI Studio)
│   ├── Model: OpenAI (CRM's built-in, for Conversation AI widget)
│   ├── System prompt: Master template with {{variables}}
│   ├── Fallback: "Let me connect you with our team" → creates task
│   └── Knowledge base: empty (populated during onboarding)
├── Workflows
│   ├── "AI Onboarding" — triggered on first admin login, walks through setup
│   ├── "AI Campaign Deploy" — triggered by campaign builder pack
│   ├── "AI Content Queue" — triggered by content generator pack
│   ├── "AI Pipeline Alert" — daily cron, runs pipeline coach analysis
│   ├── "AI Review Response" — triggered by new review webhook
│   ├── "AI Weekly Report" — Monday cron, generates and sends report
│   └── "AI Lead Qualifier" — triggered on new contact, runs qualification flow
├── Custom Fields
│   ├── ai_brand_tone (text)
│   ├── ai_brand_phrases (text, multiline)
│   ├── ai_brand_avoid (text, multiline)
│   ├── ai_services_json (text, multiline)
│   ├── ai_pricing_json (text, multiline)
│   ├── ai_faq_json (text, multiline)
│   ├── ai_competitors_json (text, multiline)
│   └── ai_onboarding_complete (checkbox)
├── Tags
│   ├── ai-qualified-lead
│   ├── ai-generated-content
│   ├── ai-campaign-target
│   ├── ai-review-responded
│   └── ai-priority-follow-up
├── Pipeline: "AI-Managed Pipeline"
│   ├── New Lead
│   ├── AI Qualified
│   ├── Engaged
│   ├── Proposal Sent
│   ├── Won
│   └── Lost
├── Email Templates
│   ├── AI Welcome (new lead auto-response)
│   ├── AI Follow-Up (stale lead nudge)
│   └── AI Review Request
├── Calendar
│   └── "Book with {{business_name}}" (pre-configured booking widget)
└── Custom Code Actions
    ├── Call 0nCore AI endpoint (for Groq-powered responses)
    ├── Call 0nCore campaign deploy (for pack-triggered deployments)
    └── Call 0nCore analytics (for CRO9 tracking)
```

The CRM-side widget keeps the built-in OpenAI model (it's their hosted
surface — we can't swap it). Everything action-bearing routes to our
Groq endpoint via Custom Code Actions, so the production decisions and
generated content come from our stack.

---

## Pricing Model

| Tier | Monthly | What They Get |
|------|---------|---------------|
| Starter | $97/mo | Base AI agent + core K-layers + onboarding |
| Pro | $197/mo | + Campaign Builder + Content Generator |
| Growth | $297/mo | + Pipeline Coach + Reputation Manager + Report Generator |
| Enterprise | $497/mo | All packs + priority support + custom prompt engineering |

**Setup fee:** $497 one-time (covers onboarding, Snapshot import,
K-layer configuration).

Per Critical Rule #1, all of these prices live in `bot_settings` /
`ai_pricing_tiers` — no literals in code. Stripe price IDs are looked up
by tier slug.

---

## Build Order

### Phase 1 — Core AI Engine

1. Database tables (`ai_agents`, `ai_prompt_packs`, `ai_conversations`,
   `ai_action_log`).
2. `/api/ai/chat` endpoint — 3-layer prompt assembly + Groq call +
   action execution.
3. `/api/ai/agent` CRUD.
4. `/api/ai/packs` activation.
5. Admin app: Jaxx chat updated to use the new 3-layer architecture.

### Phase 2 — Onboarding

6. `/api/ai/onboard` endpoint.
7. Onboarding wizard UI (in admin app).
8. Auto-populate from CRM location profile.
9. System prompt template with variable resolution.

### Phase 3 — Prompt Packs

10. Campaign Builder pack (prompt + workflow + deploy action).
11. Content Generator pack (prompt + VPIS scoring + scheduling).
12. Pipeline Coach pack (prompt + daily analysis + task creation).
13. Reputation Manager pack (prompt + review webhook + response
    drafting).
14. Report Generator pack (prompt + data aggregation + formatting).

### Phase 4 — CRM Snapshot

15. Build the Master Snapshot in the CRM with all components.
16. Test import on a fresh sub-location.
17. Verify AI agent auto-configures from location profile.
18. Verify prompt packs activate / deactivate correctly.

### Phase 5 — Distribution

19. Package as CRM Marketplace app (if going marketplace route).
20. Or keep internal and deploy via Snapshot import for each new client.
21. Stripe integration for pack subscriptions.
22. Client dashboard showing active packs + AI usage stats.

---

## References

- [`docs/0n-design-system.md`](./0n-design-system.md) — UI rules,
  required for every surface in this product.
- [`docs/SXO-CRO9-Master-Playbook.md`](./SXO-CRO9-Master-Playbook.md) —
  copy + analytics standards.
- `lib/brain/registry.ts` — every AI surface registers here; CI lint
  enforces honesty.
- `app/api/dispatch/rules` — live canonical rule set.
