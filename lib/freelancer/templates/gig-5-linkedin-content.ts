import type { GigTemplate, OrderContext, FulfillmentBundle } from '../types'

interface Parsed {
  industry?: string
  target_audience?: string
  content_pillars?: string[]
  posting_frequency?: string
  tone?: string
  buyer_name?: string
  buyer_email?: string
  linkedin_url?: string
  notes?: string
}

const VPIS_PATTERNS = [
  { id: 'P024', name: 'Absolute Declaration', example: 'The best marketing strategy is...' },
  { id: 'P031', name: 'Bait and Flip', example: 'Everyone says X. They\'re wrong. Here\'s why...' },
  { id: 'P007', name: 'Numbered Framework', example: '5 things I learned from...' },
  { id: 'P012', name: 'Personal Story', example: 'I almost quit last Tuesday...' },
  { id: 'P019', name: 'Contrarian Take', example: 'Unpopular opinion: [hot take]' },
  { id: 'P033', name: 'Before/After', example: '6 months ago I was X. Today I\'m Y. Here\'s what changed...' },
  { id: 'P041', name: 'Tactical Breakdown', example: 'Here\'s exactly how I [achieved result]:' },
  { id: 'P015', name: 'Question Hook', example: 'Why do 90% of startups fail at content?' },
]

const template: GigTemplate = {
  gigId: 'linkedin-content',
  label: 'LinkedIn Content System (VPIS)',

  async fulfill(ctx: OrderContext): Promise<FulfillmentBundle> {
    const p = ctx.parsed as Parsed
    const name = p.buyer_name || 'there'
    const industry = p.industry || 'business'
    const audience = p.target_audience || 'decision-makers and founders'
    const pillars = p.content_pillars || ['Industry Insights', 'Personal Journey', 'Tactical Advice']
    const frequency = p.posting_frequency || '3-5x per week'
    const tone = p.tone || 'professional but authentic'

    // Content calendar (4 weeks)
    const calendar = Array.from({ length: 4 }, (_, week) => ({
      week: week + 1,
      posts: Array.from({ length: 5 }, (_, day) => {
        const pattern = VPIS_PATTERNS[(week * 5 + day) % VPIS_PATTERNS.length]
        const pillar = pillars[(week * 5 + day) % pillars.length]
        return {
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][day],
          pillar,
          pattern: pattern.name,
          pattern_id: pattern.id,
          hook_template: pattern.example,
          topic_suggestion: `${pillar} topic for ${audience} in ${industry}`,
          best_time: day < 2 ? '7:30 AM' : day < 4 ? '8:00 AM' : '12:00 PM',
        }
      }),
    }))

    // VPIS scoring guide
    const vpisGuide = {
      name: 'VPIS — Viral Post Intelligence Score',
      description: 'Score every post before publishing. Target: 7.0+ for consistent growth.',
      factors: [
        { name: 'Hook Strength', weight: 0.20, description: 'First line stops the scroll. Pattern-matched.' },
        { name: 'Emotional Resonance', weight: 0.15, description: 'Makes the reader feel something.' },
        { name: 'Platform Fit', weight: 0.15, description: 'Follows LinkedIn algorithm preferences.' },
        { name: 'Viral Coefficient', weight: 0.12, description: 'Triggers shares, saves, or DMs.' },
        { name: 'Specificity', weight: 0.12, description: 'Concrete numbers, names, dates > vague claims.' },
        { name: 'Structure', weight: 0.10, description: 'Scannable. Short paragraphs. Line breaks.' },
        { name: 'Keywords', weight: 0.08, description: 'Industry terms that signal relevance.' },
        { name: 'CTA', weight: 0.08, description: 'Ends with engagement driver (question, ask, prompt).' },
      ],
      scoring: '1-10 per factor, weighted sum. 7.0+ = publish. 5.0-6.9 = revise. <5.0 = rewrite.',
    }

    // Sample posts (3)
    const samplePosts = [
      {
        pattern: 'Absolute Declaration',
        pillar: pillars[0],
        post: `The biggest mistake in ${industry}?\n\nThinking you need more tools.\n\nYou don't need another app.\nYou need a system that connects the ones you have.\n\nI spent 6 months adding tools.\nThen 1 week connecting them.\n\nGuess which moved the needle.\n\n---\nWhat's the one tool you wish connected to everything else?`,
      },
      {
        pattern: 'Numbered Framework',
        pillar: pillars[1] || pillars[0],
        post: `5 things I wish I knew before starting in ${industry}:\n\n1. Nobody reads your content unless the first line hits\n2. Consistency beats virality 10x\n3. DMs > Comments > Likes (in value)\n4. Your network is your pipeline\n5. AI handles 80% of the work now\n\nWhich one resonates most? Drop a number below.`,
      },
      {
        pattern: 'Before/After',
        pillar: pillars[2] || pillars[0],
        post: `6 months ago: posting randomly, 200 impressions, zero leads.\n\nToday: ${frequency}, 10K+ impressions, 3-5 inbound DMs per week.\n\nWhat changed?\n\n- Picked 3 content pillars (${pillars.join(', ')})\n- Used proven hook patterns instead of guessing\n- Scored every post before publishing\n- Posted at the same time every day\n\nIt's not talent. It's a system.\n\nWant the system? DM me "content."`,
      },
    ]

    // Brand voice document
    const brandVoice = {
      tone,
      industry,
      audience,
      pillars,
      rules: [
        'Write like you talk — no corporate speak',
        'Every post starts with a hook (first line = most important)',
        'Short paragraphs. One idea per line.',
        'End with engagement: question, CTA, or prompt',
        'Use specific numbers and results over vague claims',
        `Target ${audience} — write for THEM, not for yourself`,
        'Mix personal stories (30%) with tactical advice (50%) and industry takes (20%)',
        'Never use hashtags in the post body — 3-5 max at the very end if at all',
      ],
      avoid: [
        'Corporate jargon ("synergy", "leverage", "circle back")',
        'Humble brags without substance',
        'Engagement bait without value',
        'Posts longer than 1300 characters',
        'Stock-photo energy in images',
      ],
    }

    const readme = `# LinkedIn Content System — ${industry}

Hi ${name} — your LinkedIn content engine is ready.

## What's Included
- **4-week content calendar** (20 posts planned with patterns + topics)
- **VPIS scoring guide** (score every post before publishing)
- **3 sample posts** ready to customize and publish
- **Brand voice document** (tone, rules, pillars)
- **8 hook patterns** from the VPIS library

## Content Pillars
${pillars.map(p => `- **${p}**`).join('\n')}

## Posting Schedule
${frequency} — calendar has optimal times per day

## How to Use
1. Review brand-voice.json — adjust tone and rules to match your voice
2. Follow the content calendar — one post per day, patterns assigned
3. Score each post with VPIS before publishing (target: 7.0+)
4. Use sample posts as templates — swap industry details
5. Track engagement weekly, adjust pillars based on what hits

## VPIS Patterns Included
${VPIS_PATTERNS.map(p => `- **${p.name}** (${p.id}): "${p.example}"`).join('\n')}

---
RocketOpp LLC · 0ncore.com
`

    const loomScript = `Hey ${name} — walkthrough of your LinkedIn content system.

I've built a complete content engine for ${industry} targeting ${audience}.

Here's what you've got:

First, a 4-week content calendar — 20 posts pre-planned with hook patterns, content pillars, and optimal posting times. Each post has a VPIS pattern assigned so you know exactly what structure to follow.

Second, the VPIS scoring guide — 8 factors, weighted. Score every post before you publish. If it's below 7.0, revise it. This is how you go from random posting to systematic growth.

Third, 3 sample posts ready to customize. They use the Absolute Declaration, Numbered Framework, and Before/After patterns — the three highest-performing patterns on LinkedIn.

Fourth, your brand voice document — tone rules, content pillars, what to avoid.

Post ${frequency}. Follow the patterns. Score everything. You'll see results within 2-3 weeks.

Want this fully automated — AI writes, scores, and posts for you? 0nCore's LinkedIn engine handles it end-to-end. Message me.

5-star review if this works for you!`

    const deliveryMessage = `Hi ${name}!

Your LinkedIn content system is delivered.

What's included:
- 4-week content calendar (20 posts planned)
- VPIS scoring guide (8-factor system)
- 3 sample posts ready to customize
- Brand voice document
- 8 proven hook patterns

Content pillars: ${pillars.join(', ')}
Target audience: ${audience}
Posting frequency: ${frequency}

Follow the calendar, score every post (7.0+ = publish), and you'll see growth within 2-3 weeks.

Want AI that writes, scores, and posts automatically? 0nCore's LinkedIn engine does it — 0ncore.com.

— Mike, RocketOpp LLC`

    return {
      files: [
        { path: 'content-calendar.json', content: JSON.stringify(calendar, null, 2) },
        { path: 'vpis-guide.json', content: JSON.stringify(vpisGuide, null, 2) },
        { path: 'sample-posts.json', content: JSON.stringify(samplePosts, null, 2) },
        { path: 'brand-voice.json', content: JSON.stringify(brandVoice, null, 2) },
        { path: 'README.md', content: readme },
      ],
      loomScript,
      deliveryMessage,
      crmTags: ['fiverr-buyer', 'gig-linkedin-content', 'upsell-social0n'],
      upsellHint: 'social0n — AI writes, scores, and posts to LinkedIn automatically',
    }
  },
}

export default template
