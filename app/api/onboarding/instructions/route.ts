import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/onboarding/instructions
 * Generates a copy-pasteable prompt that any AI can follow to produce a .0n config file.
 * The user pastes this into Claude, ChatGPT, Gemini, Cursor — any LLM.
 * The AI asks questions, then generates the .0n file.
 * The user drops the .0n file back into 0nCore → fully configured.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const userId = user?.id || 'new-user'
  const email = user?.email || ''
  const name = user?.user_metadata?.full_name || ''

  const instructions = `# 0nCore Setup — AI-to-AI Configuration

You are helping a user set up their 0nCore account. Your job is to ask them about their business and generate a .0n configuration file that they will import into 0nCore.

## How This Works
1. Ask the user the questions below (conversationally, not as a form)
2. Generate the .0n JSON file based on their answers
3. Give them the file to copy or download
4. They drop it into 0nCore and everything is configured automatically

## Questions to Ask (in order)

**Business Basics:**
- What is your business name?
- What is your website URL?
- What industry are you in?
- What services do you offer? (list them)
- What is your business phone number?
- Do you have a tagline or slogan?

**Brand Identity:**
- What are your brand colors? (primary, secondary, accent — hex codes if they know them, or describe them)
- What fonts do you use? (display font and body font, or "use defaults")
- Describe your brand tone in one word (professional, casual, bold, friendly, technical, luxurious)

**AI Persona:**
- What should your AI assistant be named? (default: "0nAI")
- Describe your ideal AI personality in one sentence
- Are there any phrases or words your AI should NEVER use?
- What emoji style? (none, minimal, moderate, expressive)

**Contact & Booking:**
- What email should clients reach you at?
- Do you have a booking/calendar link?
- Do you have a physical address? (optional)

**Services Detail (for each service):**
- Service name
- Brief description
- Price (or "contact for pricing")
- Price type (flat rate, hourly, starting at, range, free)

## Output Format

Generate ONLY this JSON. No explanation before or after. Just the JSON:

\`\`\`json
{
  "schema": "0n-config/v1",
  "generated_by": "ai-bridge",
  "generated_at": "${new Date().toISOString()}",
  "user_id": "${userId}",
  "email": "${email}",

  "K1_brand_voice": {
    "business_name": "",
    "tagline": "",
    "industry": "",
    "brand_tone": "",
    "ai_name": "0nAI",
    "ai_personality": "",
    "avoided_phrases": [],
    "emoji_style": "minimal"
  },

  "K2_terminology": {
    "services": [
      {
        "name": "",
        "description": "",
        "price": "",
        "price_type": "flat"
      }
    ],
    "industry_terms": []
  },

  "K3_business_structure": {
    "company_name": "",
    "website": "",
    "phone": "",
    "email": "${email}",
    "booking_url": "",
    "address": "",
    "founded_year": ""
  },

  "K4_visual_identity": {
    "colors": {
      "primary": "#000000",
      "secondary": "#ffffff",
      "accent": "#6EE05A",
      "background": "#0d1117",
      "text": "#f0f4f8"
    },
    "fonts": {
      "display": "Space Mono",
      "body": "DM Sans"
    },
    "logo_url": "",
    "css_methodology": "tailwind-only",
    "design_tokens": "core-*"
  },

  "K5_domain_knowledge": {
    "faqs": [],
    "compliance_notes": ""
  }
}
\`\`\`

## Rules
- Fill in every field based on the user's answers
- Use sensible defaults for anything they skip
- For colors: if they describe colors by name, convert to hex
- For services: include at least their top 3
- The avoided_phrases array should always include: "game-changer", "synergy", "leverage", "excited to share"
- Be conversational. This should feel like talking to a smart assistant, not filling out a form.

## When Done
Tell the user: "Copy this JSON and go to 0ncore.com/import — paste it there and your account will be fully configured in seconds."
`

  return NextResponse.json({
    instructions,
    user: { id: userId, email, name },
  })
}
