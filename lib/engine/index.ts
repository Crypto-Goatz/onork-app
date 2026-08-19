/**
 * 0nAI Engine — core AI brain with full K-layer awareness.
 *
 * Modules:
 * - context.ts  — Builds EngineContext from all K-layers
 * - prompt.ts   — Dynamic system prompt builder
 * - conversation.ts — Multi-turn conversation persistence
 * - groq.ts     — Groq LLM client (openai/gpt-oss-120b)
 * - intent.ts   — Bridge intent detection
 */

export { buildEngineContext, type EngineContext } from './context'
export { buildSystemPrompt } from './prompt'
export {
  createConversation,
  getHistory,
  addMessage,
  getConversation,
  getRecentConversation,
  type Message,
  type Conversation,
} from './conversation'
export { groqChat, type GroqMessage, type GroqOptions } from './groq'
export { detectIntent, quickBridgeCheck, type IntentResult } from './intent'
