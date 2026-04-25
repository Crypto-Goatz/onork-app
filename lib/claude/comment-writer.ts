const GROQ_KEY = process.env.GROQ_API_KEY!
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const COMMENT_RULES = `
COMMENT WRITING RULES:
- Peer tone. You are a fellow practitioner, not a fan.
- Second-flip technique: acknowledge their point, then add a layer they didn't mention.
- Never just agree. Add friction, nuance, or a real experience.
- End with a specific question that invites them to go deeper.
- 2–4 sentences max. Tight. No filler.
- No emojis. No hashtags. No "Great post!" openers.
- Sound like you've been in the trenches, not reading about them.
`.trim()

async function callGroq(prompt: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 200,
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const json = await res.json()
  return json.choices[0].message.content.trim()
}

export interface GenerateCommentOptions {
  targetPostContent: string
  authorName?: string
  authorTitle?: string
  niche?: string
  icpKeywords?: string[]
  tone?: 'thought_leader' | 'builder' | 'storyteller'
}

export interface GeneratedComment {
  content: string
  second_flip_used: boolean
}

export async function generateComment(opts: GenerateCommentOptions): Promise<GeneratedComment> {
  const postExcerpt = opts.targetPostContent.slice(0, 600)
  const authorCtx = opts.authorName ? `Author: ${opts.authorName}${opts.authorTitle ? `, ${opts.authorTitle}` : ''}` : ''
  const nicheCtx = opts.niche ?? 'B2B SaaS, AI automation, agency growth'

  const prompt = `${COMMENT_RULES}

${authorCtx}
NICHE: ${nicheCtx}
ICP CONTEXT: ${(opts.icpKeywords ?? []).slice(0, 3).join(', ') || 'AI, automation, growth'}

TARGET POST:
---
${postExcerpt}
---

Write a comment using the second-flip technique:
1. Briefly acknowledge what they said (1 sentence, no flattery)
2. Add a layer, counter-angle, or real-world friction they missed
3. End with a specific, genuine question

Output only the comment text. No quotes, no labels.`

  const content = await callGroq(prompt)

  // Detect if second-flip pattern is present (acknowledgement + new angle + question)
  const secondFlipUsed = /\?/.test(content) && content.split('.').length >= 2

  return { content, second_flip_used: secondFlipUsed }
}
