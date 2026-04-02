import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface GenerateRequest {
  topic: string
  tone: 'professional' | 'casual' | 'thought-leader'
  platforms: string[]
  hashtags?: string[]
  title?: string
}

const PLATFORM_INSTRUCTIONS: Record<string, string> = {
  twitter: `Twitter/X post: Max 280 characters. Punchy, concise, hook in first line. Use 1-2 relevant hashtags at the end. No markdown.`,
  linkedin: `LinkedIn post: 200-500 words. Professional but engaging. Start with a bold statement or question. Use line breaks for readability. End with a call to action. Include 3-5 hashtags at the end. No markdown formatting.`,
  reddit: `Reddit post: 100-300 words. Conversational, informative, genuine. No hard-sell language. Write as if sharing with a technical community. Use plain text, no excessive formatting.`,
  devto: `Dev.to article: 300-600 words. Technical but accessible. Use markdown formatting (## headings, code blocks, bullet points). Include a TL;DR at the top. Educational tone.`,
  facebook: `Facebook post: 100-200 words. Friendly, conversational. Ask a question or share a story. Include a call to action. No hashtags.`,
  instagram: `Instagram caption: 100-200 words. Storytelling format. Use emojis sparingly. Include 5-10 hashtags at the end, separated by line breaks from the main text.`,
  hackernews: `Hacker News submission: Brief, technical, factual. No marketing language. Focus on the technical innovation or interesting angle. Under 100 words.`,
  github: `GitHub Discussion post: Technical, detailed, developer-focused. Use markdown. Include code examples if relevant. 200-400 words.`,
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'Professional and authoritative. Clear, confident, data-driven where possible.',
  casual: 'Casual and friendly. Conversational, approachable, relatable.',
  'thought-leader': 'Thought leadership style. Insightful, visionary, challenges conventions, shares unique perspective.',
}

export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: GenerateRequest = await request.json()
  const { topic, tone = 'professional', platforms, hashtags = [], title } = body

  if (!topic?.trim()) {
    return NextResponse.json({ error: 'topic is required' }, { status: 400 })
  }

  if (!platforms?.length) {
    return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 })
  }

  // Build the prompt
  const platformBlocks = platforms
    .map((p) => {
      const instructions = PLATFORM_INSTRUCTIONS[p] || `${p}: Write a suitable post for this platform.`
      return `### ${p}\n${instructions}`
    })
    .join('\n\n')

  const hashtagLine = hashtags.length > 0
    ? `\nIncorporate these hashtags where appropriate: ${hashtags.join(' ')}`
    : ''

  const titleLine = title
    ? `\nUse this as the title/headline where applicable: "${title}"`
    : '\nGenerate an appropriate title for platforms that need one (Reddit, Dev.to, Hacker News).'

  const prompt = `You are a social media content specialist for 0nMCP, an AI orchestration platform by RocketOpp.

Topic: ${topic}
Tone: ${TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professional}
${hashtagLine}
${titleLine}

Generate optimized posts for each of the following platforms. Each post should be tailored to the platform's audience and format while maintaining the same core message.

${platformBlocks}

IMPORTANT: Respond ONLY with valid JSON in this exact format, no other text:
{
  "content": {
    "platform_key": "The post content here"
  },
  "titles": {
    "platform_key": "Title for platforms that need one"
  }
}

Use the platform keys exactly as given: ${platforms.join(', ')}`

  // Try Groq first (free tier), fall back to Google Gemini
  const groqKey = process.env.GROQ_API_KEY
  const googleKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY

  let responseText = ''

  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a social media content expert. Always respond with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        responseText = data.choices?.[0]?.message?.content || ''
      }
    } catch {
      // Fall through to next provider
    }
  }

  // Fallback to Google Gemini
  if (!responseText && googleKey) {
    try {
      const { GoogleGenAI } = await import('@google/genai')
      const ai = new GoogleGenAI({ apiKey: googleKey })

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      })

      responseText = result.text || ''
    } catch {
      // Fall through
    }
  }

  // If no AI available, generate template content
  if (!responseText) {
    const fallbackContent: Record<string, string> = {}
    const fallbackTitles: Record<string, string> = {}
    const hashtagStr = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : ''

    for (const p of platforms) {
      const baseTitle = title || topic.slice(0, 60)
      fallbackTitles[p] = baseTitle

      switch (p) {
        case 'twitter':
          fallbackContent[p] = `${topic.slice(0, 240)}${hashtagStr}`.slice(0, 280)
          break
        case 'linkedin':
          fallbackContent[p] = `${topic}\n\nWe are building the future of AI orchestration with 0nMCP. This matters because the way we interact with AI tools is fundamentally changing.\n\nWhat are your thoughts?${hashtagStr}`
          break
        case 'reddit':
          fallbackContent[p] = `${topic}\n\nWould love to hear the community's thoughts on this approach.`
          break
        case 'devto':
          fallbackContent[p] = `## TL;DR\n${topic}\n\n## Details\nMore details about ${topic.toLowerCase()}.\n\n## Getting Started\nCheck out [0nMCP](https://0nmcp.com) to learn more.${hashtagStr}`
          break
        default:
          fallbackContent[p] = `${topic}${hashtagStr}`
      }
    }

    return NextResponse.json({
      content: fallbackContent,
      titles: fallbackTitles,
      source: 'template',
      message: 'Generated from template. Set GROQ_API_KEY or GOOGLE_AI_API_KEY for AI-powered content.',
    })
  }

  // Parse the AI response
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim()
    }

    // Try to find JSON object in the response
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }

    const parsed = JSON.parse(jsonStr)

    return NextResponse.json({
      content: parsed.content || {},
      titles: parsed.titles || {},
      source: groqKey ? 'groq' : 'gemini',
    })
  } catch {
    // If JSON parsing fails, try to extract content manually
    const content: Record<string, string> = {}
    for (const p of platforms) {
      content[p] = responseText.slice(0, PLATFORM_INSTRUCTIONS[p]?.includes('280') ? 280 : 2000)
    }

    return NextResponse.json({
      content,
      titles: {},
      source: 'raw',
      message: 'AI response was not valid JSON. Content may need editing.',
    })
  }
}
