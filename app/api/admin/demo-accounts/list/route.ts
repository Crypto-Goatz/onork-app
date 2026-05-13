/**
 * GET /api/admin/demo-accounts/list — read-only audit of demo/test rows.
 *
 * Admin-only (mike@rocketopp.com). Returns every profile whose email looks
 * like a demo / test / sample account, with the count of related rows in
 * the most common downstream tables, so we can decide what (if anything)
 * to actually delete.
 *
 * This endpoint NEVER deletes. It's a list-only diagnostic. If you want a
 * deletion path, build it as a separate /cleanup endpoint and have it
 * require an explicit `confirm` flag plus a row-by-row allow-list.
 *
 * Patterns matched:
 *   - exact:        demo@0ncore.com
 *   - prefixed:     demo-N@0ncore.com (any N)
 *   - test prefix:  test+...@0ncore.com, test-...@0ncore.com
 *   - reviewer:     reviewer@0ncore.com (just in case)
 *
 * Real Mike-owned accounts (mike@rocketopp.com, mike@wpsxo.com, etc.) are
 * NEVER returned — those are explicitly excluded so this endpoint can't be
 * used to enumerate real Mike accounts for a deletion mistake.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

function admin() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const DEMO_EMAIL_PATTERNS: RegExp[] = [
  /^demo@0ncore\.com$/i,
  /^demo-\d+@0ncore\.com$/i,
  /^test[+\-_].*@0ncore\.com$/i,
  /^reviewer@0ncore\.com$/i,
  /^sample@0ncore\.com$/i,
]

const NEVER_INCLUDE = new Set<string>([
  'mike@rocketopp.com',
  'mike@wpsxo.com',
  'mike@cryptogoatz.com',
])

function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const lower = email.toLowerCase()
  if (NEVER_INCLUDE.has(lower)) return false
  return DEMO_EMAIL_PATTERNS.some((re) => re.test(lower))
}

const RELATED_TABLES = [
  'crm_installations',
  'api_tokens',
  'exec_configs',
  'stack_scans',
  'onboarding_progress',
  'bot_settings',
] as const

export async function GET(_req: NextRequest) {
  // Auth: live admin session only.
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const callerEmail = session?.user?.email
  if (!callerEmail || callerEmail !== 'mike@rocketopp.com') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const sb = admin()

  // Pull every profile row, filter in-process by the patterns above. This
  // keeps the regex/exclusion logic in one place (here, not in SQL) so the
  // safety guarantees are auditable.
  const { data: profiles, error } = await sb
    .from('profiles')
    .select('id, email, full_name, company, created_at, is_admin, onboarding_complete')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const demoProfiles = (profiles ?? []).filter((p) => isDemoEmail(p.email as string | null))

  // Augment each with related-row counts so the operator can see the blast
  // radius before deciding to delete anything.
  const enriched = await Promise.all(
    demoProfiles.map(async (p) => {
      const counts: Record<string, number | null> = {}
      for (const t of RELATED_TABLES) {
        const { count, error: cErr } = await sb
          .from(t)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', p.id)
        counts[t] = cErr ? null : count ?? 0
      }
      return {
        id: p.id,
        email: p.email,
        full_name: p.full_name ?? null,
        company: p.company ?? null,
        created_at: p.created_at,
        is_admin: !!p.is_admin,
        onboarding_complete: !!p.onboarding_complete,
        related_rows: counts,
      }
    }),
  )

  return NextResponse.json({
    matched_patterns: DEMO_EMAIL_PATTERNS.map((re) => re.source),
    excluded: Array.from(NEVER_INCLUDE),
    count: enriched.length,
    profiles: enriched,
  })
}
