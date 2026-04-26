import type { GigTemplate, OrderContext, FulfillmentBundle } from '../types'

interface Parsed {
  product_name?: string
  tagline?: string
  target_audience?: string
  key_features?: string[]
  pricing_tiers?: Array<{ name: string; price: string; features: string[] }>
  color_scheme?: string
  buyer_name?: string
  buyer_email?: string
  notes?: string
}

const template: GigTemplate = {
  gigId: 'saas-landing',
  label: 'SaaS Landing Page (48hr)',

  async fulfill(ctx: OrderContext): Promise<FulfillmentBundle> {
    const p = ctx.parsed as Parsed
    const name = p.buyer_name || 'there'
    const product = p.product_name || 'Your SaaS'
    const tagline = p.tagline || 'The smarter way to work'
    const audience = p.target_audience || 'startups and small teams'
    const features = p.key_features || ['AI-Powered Automation', 'Real-Time Analytics', 'Team Collaboration']
    const colors = p.color_scheme || 'dark with accent blue'

    const pricingTiers = p.pricing_tiers || [
      { name: 'Starter', price: '$29/mo', features: ['Up to 5 users', 'Basic features', 'Email support'] },
      { name: 'Pro', price: '$79/mo', features: ['Up to 25 users', 'All features', 'Priority support', 'API access'] },
      { name: 'Enterprise', price: 'Custom', features: ['Unlimited users', 'Custom integrations', 'Dedicated account manager', 'SLA'] },
    ]

    // Page structure with copy
    const pageStructure = {
      meta: {
        title: `${product} — ${tagline}`,
        description: `${product} helps ${audience} ${tagline.toLowerCase()}. Start free today.`,
        og_image: 'TODO: generate or provide',
      },
      sections: [
        {
          id: 'hero',
          type: 'hero',
          headline: tagline,
          subheadline: `Built for ${audience} who need results, not complexity.`,
          cta_primary: { text: 'Start Free Trial', href: '#pricing' },
          cta_secondary: { text: 'See How It Works', href: '#features' },
        },
        {
          id: 'social-proof',
          type: 'logo-bar',
          heading: 'Trusted by teams at',
          note: 'Add 4-6 customer logos here',
        },
        {
          id: 'problem',
          type: 'problem-agitation',
          headline: `Tired of [common pain point]?`,
          points: [
            'Manual processes eating your time',
            'Data scattered across 10 different tools',
            'No visibility into what\'s actually working',
          ],
        },
        {
          id: 'features',
          type: 'feature-grid',
          headline: `Everything you need. Nothing you don't.`,
          features: features.map((f, i) => ({
            title: f,
            description: `Feature ${i + 1} description — explain the benefit, not the feature.`,
            icon: 'TODO: choose Lucide icon',
          })),
        },
        {
          id: 'how-it-works',
          type: 'steps',
          headline: 'Get started in 3 minutes',
          steps: [
            { number: 1, title: 'Sign up', description: 'Create your account — no credit card required.' },
            { number: 2, title: 'Connect your tools', description: 'One-click integrations with the tools you already use.' },
            { number: 3, title: 'See results', description: 'Watch your first insights roll in within minutes.' },
          ],
        },
        {
          id: 'testimonials',
          type: 'testimonial-cards',
          headline: 'What our users say',
          note: 'Add 3 testimonials with name, role, company, quote, and optional photo',
        },
        {
          id: 'pricing',
          type: 'pricing-table',
          headline: 'Simple, transparent pricing',
          subheadline: 'Start free. Upgrade when you\'re ready.',
          tiers: pricingTiers,
        },
        {
          id: 'faq',
          type: 'faq-accordion',
          headline: 'Frequently asked questions',
          items: [
            { q: 'Is there a free trial?', a: `Yes — ${product} offers a free trial with no credit card required.` },
            { q: 'Can I cancel anytime?', a: 'Absolutely. No contracts, no cancellation fees.' },
            { q: 'What integrations do you support?', a: `${product} integrates with all major tools. See our integrations page for the full list.` },
            { q: 'Is my data secure?', a: 'Yes. We use industry-standard encryption and are SOC 2 compliant.' },
            { q: 'Do you offer custom plans?', a: 'Yes — contact us for Enterprise pricing tailored to your needs.' },
          ],
        },
        {
          id: 'final-cta',
          type: 'cta-banner',
          headline: `Ready to try ${product}?`,
          subheadline: 'Join thousands of teams already using it.',
          cta: { text: 'Start Your Free Trial', href: '/signup' },
        },
      ],
    }

    // Tailwind component hints
    const componentGuide = `# Component Implementation Guide

## Recommended Stack
- Next.js 14+ (App Router)
- Tailwind CSS
- shadcn/ui for components
- Lucide React for icons

## Color Scheme: ${colors}
Use CSS variables for easy theming:
\`\`\`css
:root {
  --bg-primary: #0a0a0a;
  --bg-card: rgba(255,255,255,0.04);
  --text-primary: #f0f4f8;
  --text-muted: #6b7a8d;
  --accent: #3b82f6; /* adjust to brand */
  --border: rgba(255,255,255,0.08);
}
\`\`\`

## Section Components
${pageStructure.sections.map(s => `- \`<${s.type.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')} />\` — ${s.headline || s.heading || s.note || ''}`).join('\n')}

## Performance Targets
- Lighthouse Performance: 95+
- First Contentful Paint: < 1.2s
- Cumulative Layout Shift: < 0.1
`

    const readme = `# ${product} — Landing Page

Hi ${name} — your SaaS landing page is ready.

## What's Included
- \`page-structure.json\` — Complete page layout with all copy
- \`component-guide.md\` — Implementation guide with stack recommendations
- This README

## Sections (${pageStructure.sections.length})
${pageStructure.sections.map(s => `- **${s.id}**: ${s.type}`).join('\n')}

## Pricing Tiers
${pricingTiers.map(t => `- **${t.name}**: ${t.price}`).join('\n')}

## Next Steps
1. Review page-structure.json — all copy is in there
2. Follow component-guide.md for implementation
3. Replace placeholder content (logos, testimonials, images)
4. Deploy and test on mobile

---
RocketOpp LLC · 0ncore.com
`

    const loomScript = `Hey ${name} — walkthrough of your ${product} landing page.

I've structured a ${pageStructure.sections.length}-section page optimized for conversion.

The flow: Hero with clear CTA, social proof logo bar, problem agitation, feature grid, 3-step how-it-works, testimonials, pricing table with ${pricingTiers.length} tiers, FAQ, and a final CTA banner.

Everything's in page-structure.json — all the copy, section order, and content. The component guide has stack recommendations and performance targets.

Replace the placeholder content — logos, testimonials, screenshots — and you're ready to deploy.

Want a fully managed version with AI-powered A/B testing and analytics? 0nCore can do that automatically.

Leave a 5-star review if this works for you!`

    const deliveryMessage = `Hi ${name}!

Your ${product} landing page is delivered.

${pageStructure.sections.length} sections:
- Hero + CTAs
- Social proof bar
- Problem agitation
- Feature grid (${features.length} features)
- 3-step how-it-works
- Testimonials section
- Pricing table (${pricingTiers.length} tiers)
- FAQ (5 questions)
- Final CTA banner

All copy included in page-structure.json.
Component implementation guide included.

Setup time: 2-4 hours with Next.js + Tailwind
Free 14-day support for revisions.

Want AI-powered A/B testing and analytics built in? Check out 0nCore — 0ncore.com.

— Mike, RocketOpp LLC`

    return {
      files: [
        { path: 'page-structure.json', content: JSON.stringify(pageStructure, null, 2) },
        { path: 'component-guide.md', content: componentGuide },
        { path: 'README.md', content: readme },
      ],
      loomScript,
      deliveryMessage,
      crmTags: ['fiverr-buyer', 'gig-saas-landing', 'upsell-web-factory'],
      upsellHint: 'Website Factory — fully managed landing page with AI A/B testing',
    }
  },
}

export default template
