/**
 * Social posts generator. Generates LinkedIn (VPIS-scored), Reddit, and
 * Twitter posts in one call. Then asynchronously scores the LinkedIn one
 * via the live VPIS endpoint and patches in the score.
 */

import { groqJSON } from '../groq'
import type { IngestResult, SocialPosts } from '../types'

const SYSTEM = `You write platform-native social posts. LinkedIn = builder voice, hooks first, no emoji. Reddit = no marketing language, must look like a real builder share. Twitter = punchy, under 280.`

interface RawSocialPosts {
  linkedin: { text: string }
  reddit: { title: string; body: string; subreddits: string[] }
  twitter: { text: string }
}

export async function generateSocialPosts(input: IngestResult): Promise<SocialPosts> {
  const userPrompt = `Generate social posts as JSON for: ${input.service_name}.

{
  "linkedin": { "text": "150-300 word LinkedIn post — first line is the hook, no emoji, no hashtags, signs off with one tight question OR a CTA URL" },
  "reddit": { "title": "≤100 char post title (no clickbait)", "body": "200-400 word Reddit-native post that doesn't read like marketing", "subreddits": ["r/Entrepreneur","r/SaaS","r/<relevant>"] },
  "twitter": { "text": "≤280 chars" }
}

Service:
- ${input.service_name}: ${input.service_description}
- Audience: ${input.target_audience}
- Deliverable: ${input.primary_deliverable}
- Time: ${input.delivery_time}

Return ONLY the JSON. No markdown fences.`

  const raw = await groqJSON<RawSocialPosts>(SYSTEM, userPrompt, { maxTokens: 2048 })

  // Score the LinkedIn post via the live VPIS endpoint (best-effort)
  let vpis_score = 0
  let patterns_fired: string[] = []
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://0ncore.com'
    const res = await fetch(`${baseUrl}/api/linkedin-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'score-post',
        post_text: raw.linkedin.text,
        post_author: 'mike@rocketopp.com',
      }),
      cache: 'no-store',
    })
    if (res.ok) {
      const d = (await res.json()) as { vpis_score?: number; patterns_fired?: string[] }
      vpis_score = typeof d.vpis_score === 'number' ? d.vpis_score : 0
      patterns_fired = Array.isArray(d.patterns_fired) ? d.patterns_fired : []
    }
  } catch {
    // VPIS endpoint unavailable — leave score at 0
  }

  return {
    linkedin: { text: raw.linkedin.text, vpis_score, patterns_fired },
    reddit: raw.reddit,
    twitter: raw.twitter,
  }
}
