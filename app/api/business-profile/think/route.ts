/**
 * Business Profile — brain entry. handleThink owns the think + record loop.
 *
 * Generates from the 0nCore business profile: a person's LinkedIn About, the
 * company page About, a reusable boilerplate, and a cover-image art brief.
 *
 * THE READINESS GATE IS THE POINT. Generation refuses to run on a profile too
 * thin to produce something truthful, and says exactly what to add instead.
 * Writing a named person's LinkedIn bio from a name and a job title means
 * inventing their career — and that invention lands on a real human's public
 * profile, under their name, where they will be judged for it. A refusal with a
 * fix list beats a plausible fabrication every time.
 *
 * promptContext() only includes fields that are actually filled in, so the model
 * is never shown an empty slot to helpfully complete.
 */

import { NextRequest } from 'next/server'
import { handleThink } from '@/lib/brain/think-route'
import { groqText } from '@/lib/service-packager/groq'
import { createClient } from '@supabase/supabase-js'
import {
  promptContext,
  readiness,
  type BusinessProfile,
  type BusinessPerson,
  type GenerationKind,
} from '@/lib/business-profile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SLUG = 'business_profile'

/** Tool name (as the brief declares it) → the kind readiness() understands. */
const TOOL_KIND: Record<string, GenerationKind> = {
  write_linkedin_personal: 'linkedin_personal',
  write_linkedin_company: 'linkedin_company',
  write_company_boilerplate: 'company_boilerplate',
  write_cover_image_brief: 'cover_image_brief',
}

const KIND_BRIEF: Record<GenerationKind, string> = {
  linkedin_personal:
    'Write a LinkedIn "About" section in the first person for this individual. Three short paragraphs, no headings, no buzzword soup. Only state facts present in the context — never invent employers, dates, qualifications, metrics or awards.',
  linkedin_company:
    'Write a LinkedIn company page "About" section. Two short paragraphs plus a one-line specialties list. Only use facts present in the context — never invent size, revenue, clients or founding details.',
  company_boilerplate:
    'Write a reusable company boilerplate of 40-70 words — the kind that closes a press release. Facts only.',
  cover_image_brief:
    'Write a concise art-direction brief for a LinkedIn cover image: composition, what appears, what does NOT appear, and the exact brand colours to use. No stock-photo cliches.',
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: NextRequest) {
  return handleThink(req, {
    slug: SLUG,
    async execute(decision, body, userId) {
      const kind = TOOL_KIND[decision.tool]
      if (!kind) {
        return {
          output: { error: `Unknown tool "${decision.tool}".` },
          success: false,
        }
      }

      const db = admin()
      const { data: profile } = await db
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()

      if (!profile) {
        return {
          output: {
            error: 'No business profile yet.',
            fix: 'Fill in your business profile first — everything here is generated from it.',
            go_to: '/profile',
          },
          success: false,
        }
      }

      // Which person: explicit id from the caller, the tool's own param, else primary.
      const personId =
        (body.person_id as string | undefined) ||
        (decision.params.person_id as string | undefined) ||
        null

      let person: BusinessPerson | undefined
      if (kind === 'linkedin_personal') {
        const q = db.from('business_people').select('*').eq('user_id', userId)
        const { data } = personId
          ? await q.eq('id', personId).maybeSingle()
          : await q.eq('is_primary', true).maybeSingle()
        person = (data as BusinessPerson | null) ?? undefined
      }

      // The gate. Refuse rather than fabricate.
      const gate = readiness(kind, profile as BusinessProfile, person)
      if (!gate.ready) {
        return {
          output: {
            error: 'Not enough in your profile to write this honestly.',
            add_these: gate.blockers,
            profile_complete: `${gate.percent}%`,
            why: 'Anything missing would have to be invented, and this ends up on a public profile under a real name.',
          },
          success: false,
        }
      }

      const context = promptContext(profile as BusinessProfile, person)
      const voice = profile.brand_voice
        ? `Match this brand voice: ${profile.brand_voice}.`
        : 'Write plainly. No hype, no buzzwords.'

      const text = await groqText(
        [
          KIND_BRIEF[kind],
          voice,
          'If a detail is not in the context you are given, leave it out entirely rather than guessing.',
          'Return the finished text only — no preamble, no headings, no markdown fences.',
        ].join(' '),
        `CONTEXT — these are the only facts you may use:\n${context}`,
        { temperature: 0.6 }
      )

      return {
        output: {
          kind,
          text,
          generated_for: person
            ? `${person.full_name}${person.role_title ? `, ${person.role_title}` : ''}`
            : profile.trading_name || profile.legal_name,
          profile_complete: `${gate.percent}%`,
        },
        success: Boolean(text?.trim()),
      }
    },
  })
}
