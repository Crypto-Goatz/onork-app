# 0nMCP — CRM Marketplace App Listing

## Complete Copy for All 5 Mandatory Steps

---

### 1. BASIC INFO

**App Name:** 0nMCP

**Tagline:** AI business assistant with 926 API endpoints across 95 services. Automate everything from one chat.

**Category:** AI & Automation

**Short Description (250 chars):**
0nMCP connects 95 services (Stripe, Slack, Gmail, Supabase, Figma + 90 more) to your CRM through one AI assistant. Chat to manage contacts, send emails, score leads, book appointments, create invoices, and automate workflows. No code required.

---

### 2. PROFILE DETAILS

**Long Description:**

0nMCP is the universal AI business assistant that connects your CRM to 95 services through one conversational interface.

WHAT IT DOES:
Your customers chat with 0nMCP and it executes real business actions — no forms, no dashboards, no learning curve. Just talk.

"Add John Smith john@acme.com to my contacts" → Done.
"Send Sarah an email about the proposal" → Sent.
"What's my revenue this month?" → Pulls from Stripe.
"Score my hottest leads" → AI scores 1-100 with recommendations.
"Book a demo with TechCorp for Tuesday at 2pm" → Booked, invite sent.

95 CONNECTED SERVICES:
Stripe, Slack, Gmail, Google Calendar, Supabase, GitHub, SendGrid, Twilio, Shopify, Discord, Figma, HubSpot, Notion, Zoom, LinkedIn, and 80 more — all accessible through natural conversation.

WHAT'S INCLUDED:
- AI Chat Assistant (WebChat, SMS, Email, Live Chat)
- 926 API endpoints across 95 services
- Lead scoring with AI recommendations
- Appointment booking with calendar sync
- Email and SMS automation
- Pipeline management through chat
- SXO domain scanning ($8 reports)
- Course generation and CRM import
- Referral tracking with 30% commission
- Custom dashboard inside your CRM

BUILT BY ROCKETOPP LLC:
- 5 patents pending
- AES-256 vault encryption
- Open source core (MIT license)
- npm: npx 0nmcp@latest
- 1,171 total tools

**Website URL:** https://0nmcp.com

**Privacy Policy URL:** https://0nmcp.com/privacy

**Terms of Service URL:** https://0nmcp.com/legal

**Logo:** Upload the 0nMCP logo from /public/brand/0nmcp-logo.png

**Screenshots:** Upload screenshots of:
1. Chat widget in action (conversation with lead scoring)
2. 0nCore dashboard
3. Integration page showing 95 services
4. Agent Studio flow with MCP node

---

### 3. SUPPORT DETAILS

**Support Email:** mike@rocketopp.com

**Support URL:** https://0nmcp.com/community

**Documentation URL:** https://0nmcp.com/0n-standard

**Onboarding URL:** https://0ncore.com/dashboard/onboarding

---

### 4. PRICING DETAILS

**Pricing Model:** Monthly subscription with usage-based add-ons

| Plan | Price | Includes |
|------|-------|----------|
| Free | $0 | Chat assistant, 100 AI credits/mo, 5 services |
| Starter | $29/mo | All 95 services, 5,000 AI credits, email sequences |
| Pro | $79/mo | Voice AI, course generator, 25,000 credits, priority support |
| Agency | $199/mo | White-label, unlimited locations, 100,000 credits, API access |

**Usage Overages:**
- AI credits: $2.50 per 750,000 words (10X markup on CRM AI costs)
- SXO scans: $8 per scan
- Course generation: $0.01 per execution

**Free Trial:** 14 days on Starter plan

---

### 5. REVIEW DETAILS

**App Review Notes for HighLevel Team:**

This app provides an AI-powered business assistant that connects to the user's CRM data through the native MCP server (contacts, conversations, pipelines, calendars) and extends functionality to 95 external services through a custom MCP endpoint.

Key technical details:
- Uses CRM's native MCP server for CRM operations (36 tools)
- Custom MCP endpoint at https://0ncore.com/api/0nmcp/mcp for external services
- Conversation AI template with auto-pilot mode on WebChat, SMS, Email
- Custom Page provides management dashboard (iframe to 0ncore.com)
- OAuth 2.0 for user authentication
- All data stays within the user's sub-account
- No data leaves CRM unless user explicitly triggers an external service
- Compliant with CRM marketplace guidelines

---

## MODULES CONFIG

### Conversation AI Template

**Agent Name:** 0nMCP

**Use Case:** Business Operations

**Agent Description:**
AI business assistant that manages contacts, sends emails/SMS, scores leads, books appointments, creates invoices, generates courses, and automates workflows across 95 services — all through natural conversation.

**Supported Channels:** WebChat, SMS, Email, Live_Chat

**Suggested Questions:**
1. "What can you help me with?"
2. "Show me my hottest leads"
3. "Send an email to my last contact"
4. "What's my revenue this month?"
5. "Book a demo for tomorrow at 2pm"

**Knowledge Base:** Enable, attach 0nMCP Knowledge Base

### Custom Page

**Page URL:** https://0ncore.com/dashboard/marketplace?embedded=true

This iframe loads the 0nCore dashboard inside the CRM. The SSO payload decrypts to identify the user and location, showing their specific data.

### Voice AI (if enabled)

**Agent Name:** 0nAI Receptionist

**Use Case:** Inbound call handling, appointment booking, lead qualification

### Workflows

Include starter workflows in the snapshot:
- Tag "0nmcp-signup" → Welcome sequence
- Tag "sxo-scan" → SXO report delivery
- Opportunity stage change → Notification

### Snapshots

Create snapshot from 0nCore location (nphConTwfHcVE1oA0uep) containing:
- All workflows
- Pipeline (Marketing + web0n)
- Calendar (Onboarding Call)
- Tags (63 tags)
- Custom fields
- Form
- Email templates
- Knowledge base

---

## CUSTOM PAGE DASHBOARD

The Custom Page loads an iframe pointing to:
https://0ncore.com/dashboard/marketplace

This page needs to:
1. Accept SSO payload from CRM (AES-encrypted postMessage)
2. Decrypt to get userId, locationId, companyId
3. Show the user's dashboard with:
   - AI credits balance
   - Recent conversations
   - Connected services
   - Quick actions (scan, score, email, book)
   - Usage stats
   - Upgrade CTAs

---

## LAUNCH CHECKLIST

- [ ] Complete all 5 mandatory steps
- [ ] Upload logo + screenshots
- [ ] Configure Conversation AI template
- [ ] Build Custom Page with SSO
- [ ] Set pricing plans
- [ ] Create snapshot from 0nCore location
- [ ] Submit for review
- [ ] Respond to review feedback
- [ ] Launch on marketplace
