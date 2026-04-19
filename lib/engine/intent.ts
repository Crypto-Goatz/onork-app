/**
 * Bridge Intent Detection — determines if a message is an action request
 * (bridge intent) or a general conversation/question.
 */

import { groqChat } from './groq'

export interface IntentResult {
  isBridge: boolean
  action?: string
  confidence: number
  clarifyingQuestions?: string[]
}

// Fast regex pre-check before hitting AI
const BRIDGE_PATTERNS = [
  /\b(set\s*up|create|build|configure|deploy|make|generate|launch)\b.*\b(agent|workflow|sequence|bot|voice|form|funnel|automation|chatbot|drip|campaign|website|site|landing\s*page|email|newsletter)\b/i,
  /\b(automate|automation\s+for)\b/i,
  /\b(voice\s+ai|voice\s+agent|phone\s+bot|call\s+handler)\b/i,
  /\b(follow[\s-]?up\s+(sequence|automation|workflow))\b/i,
  /\b(email\s+(sequence|drip|campaign|automation))\b/i,
  /\b(missed\s+call\s+text)/i,
  /\b(review\s+request|reputation\s+management)\b/i,
  /\b(onboarding\s+(sequence|flow|automation))\b/i,
  /\b(win[\s-]?back\s+(campaign|sequence))\b/i,
  /\b(blog\s+to\s+social|content\s+distribution)\b/i,
  /\b(full\s+setup|complete\s+setup)\b/i,
  /\b(build\s+(me\s+)?(a\s+)?website|build\s+(me\s+)?(a\s+)?site)\b/i,
  /\b(wordpress\s+(site|website|pages?))\b/i,
  /\b(send\s+(an?\s+)?(email|sms|text|message)\s+to)\b/i,
  /\b(create\s+(a\s+)?contact)\b/i,
  /\b(post\s+to\s+(social|facebook|instagram|linkedin|twitter))\b/i,
]

export function quickBridgeCheck(message: string): boolean {
  return BRIDGE_PATTERNS.some(p => p.test(message))
}

export async function detectIntent(message: string): Promise<IntentResult> {
  // Fast path — if no patterns match, it's likely conversational
  if (!quickBridgeCheck(message)) {
    return { isBridge: false, confidence: 0.9 }
  }

  // Use AI to confirm and classify the specific action
  try {
    const raw = await groqChat(
      [
        {
          role: 'system',
          content: `You classify user messages as either an ACTION REQUEST (they want to build/create/configure something) or a QUESTION (they want information/help/advice).

If it's an action request, identify the specific action type.

Available actions: create-workflow, create-voice-agent, configure-chat, create-form, create-funnel, create-email-sequence, blog-to-social, setup-tracking, build-website, build-wordpress, full-setup, create-contact, send-message

Also suggest 1-3 clarifying questions the engine should ask before executing.

Respond with JSON: { "isBridge": true/false, "action": "action-name or null", "confidence": 0.0-1.0, "clarifyingQuestions": ["question1", "question2"] }`,
        },
        { role: 'user', content: message },
      ],
      { temperature: 0.1, json: true, maxTokens: 512 }
    )

    const parsed = JSON.parse(raw)
    return {
      isBridge: parsed.isBridge ?? false,
      action: parsed.action || undefined,
      confidence: parsed.confidence ?? 0.5,
      clarifyingQuestions: parsed.clarifyingQuestions || [],
    }
  } catch {
    // Fallback to regex result
    return { isBridge: true, confidence: 0.6 }
  }
}
