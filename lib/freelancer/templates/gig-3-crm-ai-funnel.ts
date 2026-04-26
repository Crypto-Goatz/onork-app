import type { GigTemplate, OrderContext, FulfillmentBundle } from '../types'

interface Parsed {
  business_type?: string
  target_audience?: string
  funnel_goal?: string
  lead_magnet?: string
  email_sequence_count?: number
  buyer_name?: string
  buyer_email?: string
  notes?: string
}

const template: GigTemplate = {
  gigId: 'crm-ai-funnel',
  label: 'AI Sales Funnel Setup',

  async fulfill(ctx: OrderContext): Promise<FulfillmentBundle> {
    const p = ctx.parsed as Parsed
    const name = p.buyer_name || 'there'
    const business = p.business_type || 'service business'
    const audience = p.target_audience || 'small business owners'
    const goal = p.funnel_goal || 'capture leads and nurture to booking'
    const magnet = p.lead_magnet || 'free consultation'
    const emailCount = p.email_sequence_count || 5

    // Pipeline definition
    const pipeline = {
      name: `${business} Sales Funnel`,
      stages: [
        { name: 'Lead Captured', position: 0 },
        { name: 'Lead Magnet Delivered', position: 1 },
        { name: 'Nurture Sequence', position: 2 },
        { name: 'Booking Scheduled', position: 3 },
        { name: 'Proposal Sent', position: 4 },
        { name: 'Closed Won', position: 5 },
        { name: 'Closed Lost', position: 6 },
      ],
    }

    // Email sequence
    const emails = Array.from({ length: emailCount }, (_, i) => ({
      sequence_position: i + 1,
      delay_days: i === 0 ? 0 : i === 1 ? 1 : i === 2 ? 3 : i === 3 ? 5 : 7,
      subject: getEmailSubject(i, business, magnet),
      body_outline: getEmailBody(i, business, audience, magnet),
    }))

    // Landing page copy
    const landingPage = {
      headline: `Get Your Free ${magnet} — ${business}`,
      subheadline: `Helping ${audience} ${goal}`,
      cta: `Get My Free ${magnet}`,
      sections: [
        { type: 'hero', content: `Headline + subheadline + CTA button` },
        { type: 'problem', content: `3 pain points your ${audience} face` },
        { type: 'solution', content: `How your ${business} solves these problems` },
        { type: 'social_proof', content: `Testimonials or case study results` },
        { type: 'lead_form', content: `Name, email, phone — delivers ${magnet}` },
        { type: 'faq', content: `5 common questions about your service` },
      ],
    }

    // Automation workflow
    const automations = [
      { trigger: 'Form submission', action: 'Create contact + tag "lead-captured"' },
      { trigger: 'Contact created', action: `Deliver ${magnet} via email` },
      { trigger: 'After delivery', action: `Start ${emailCount}-email nurture sequence` },
      { trigger: 'Email link click', action: 'Tag "engaged" + move to Nurture stage' },
      { trigger: 'Booking made', action: 'Move to Booking Scheduled + notify owner' },
      { trigger: '7 days no engagement', action: 'Send re-engagement email' },
    ]

    const readme = `# AI Sales Funnel — ${business}

Hi ${name} — your complete sales funnel is ready.

## What's Included
- **Pipeline**: 7-stage sales pipeline configured for your CRM
- **Email Sequence**: ${emailCount} emails with subject lines + body outlines
- **Landing Page**: Copy framework with 6 sections
- **Automations**: 6 workflow triggers wired up
- Setup guide + Loom script

## Funnel Flow
1. ${audience} lands on your page
2. They opt in for "${magnet}"
3. Lead magnet delivered instantly via email
4. ${emailCount}-email nurture sequence starts
5. Engaged leads get prompted to book
6. Booking triggers notification to you

## Setup Steps
1. Import pipeline.json into your CRM
2. Create landing page using landing-page-copy.json as the copy
3. Set up email sequence using email-sequence.json
4. Wire automations from automations.json
5. Test the full flow with a test email

## Files
- \`pipeline.json\` — CRM pipeline stages
- \`email-sequence.json\` — ${emailCount} nurture emails
- \`landing-page-copy.json\` — Landing page sections + copy
- \`automations.json\` — Workflow trigger definitions
- This README

---
RocketOpp LLC · 0ncore.com
`

    const loomScript = `Hey ${name} — walkthrough of your AI sales funnel.

I've built a complete funnel for your ${business} targeting ${audience}.

The flow: visitor lands on your page, opts in for "${magnet}", gets it delivered instantly, then enters a ${emailCount}-email nurture sequence. Engaged leads get prompted to book. When they book, you get notified immediately.

Four files in your bundle:
1. Pipeline with 7 stages — from Lead Captured to Closed Won
2. ${emailCount} email templates with subject lines and body outlines
3. Landing page copy framework with 6 sections
4. 6 automation workflows ready to wire up

Set this up in your CRM, test with a dummy email, and you're live.

Want this fully managed with AI that writes and optimizes the emails automatically? 0nCore does that at scale — message me for details.

5-star review if this works for you!`

    const deliveryMessage = `Hi ${name}!

Your AI sales funnel for ${business} is delivered.

What's included:
- 7-stage CRM pipeline
- ${emailCount} nurture emails (subjects + body outlines)
- Landing page copy framework (6 sections)
- 6 automation workflows
- README + Loom walkthrough

Target: ${audience}
Lead magnet: ${magnet}
Goal: ${goal}

Setup time: ~30 minutes
Free 14-day support included.

Want AI that writes, sends, and optimizes these emails automatically? 0nCore handles that — 0ncore.com.

— Mike, RocketOpp LLC`

    return {
      files: [
        { path: 'pipeline.json', content: JSON.stringify(pipeline, null, 2) },
        { path: 'email-sequence.json', content: JSON.stringify(emails, null, 2) },
        { path: 'landing-page-copy.json', content: JSON.stringify(landingPage, null, 2) },
        { path: 'automations.json', content: JSON.stringify(automations, null, 2) },
        { path: 'README.md', content: readme },
      ],
      loomScript,
      deliveryMessage,
      crmTags: ['fiverr-buyer', 'gig-crm-funnel', 'upsell-0ncore-enterprise'],
      upsellHint: '0nCore Enterprise — AI writes + optimizes emails, auto-manages pipeline',
    }
  },
}

function getEmailSubject(i: number, business: string, magnet: string): string {
  const subjects = [
    `Here's your ${magnet} — as promised`,
    `Quick question about your ${business.toLowerCase()} goals`,
    `3 things most ${business.toLowerCase()} owners miss`,
    `Ready to take the next step?`,
    `Last chance — let's connect this week`,
  ]
  return subjects[i] || `Follow up #${i + 1}`
}

function getEmailBody(i: number, business: string, audience: string, magnet: string): string {
  const bodies = [
    `Deliver the ${magnet}. Thank them. Set expectations for what's coming. Include download/access link. Sign off warm.`,
    `Share one insight about ${business}. Ask an open question about their goals. Soft CTA to reply.`,
    `List 3 common mistakes ${audience} make. Position your service as the solution. Include a case study or result.`,
    `Direct CTA to book a call. Include calendar link. Mention limited availability. Social proof.`,
    `Final nudge. Recap the value. Create urgency. Clear CTA. "If not now, when?"`,
  ]
  return bodies[i] || `Nurture email #${i + 1} for ${audience}`
}

export default template
