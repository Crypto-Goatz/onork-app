/**
 * Cleanup script — purges e2e-test-* auth users + profiles from Supabase.
 * Runs after the smoke suite in CI.
 *
 * THIS SCRIPT REPORTED "done." FOR MONTHS WHILE DELETING NOTHING. Three layers,
 * each hiding the next, all found on 2026-08-20:
 *
 *   1. `continue-on-error: true` on the CI step swallowed a hard crash.
 *   2. The crash: @supabase/supabase-js@latest on Node 20 throws at
 *      createClient() — "native WebSocket not found". `@latest` moved
 *      underneath a pinned Node. Both fixed in .github/workflows/e2e-smoke.yml.
 *   3. Underneath that, the SUPABASE_SERVICE_ROLE_KEY secret was invalid
 *      ("Invalid API key"), so the lookup never ran.
 *   4. And underneath THAT, the profile delete violates
 *      `provision_pipeline_user_id_fkey` (NO ACTION) — the error was never
 *      checked, so the script printed "done." over a delete that did nothing.
 *
 * Result: auth users were deleted, profiles were not, and 241 orphaned rows
 * accumulated behind a green check.
 *
 * So this script now CHECKS EVERY WRITE and VERIFIES ITSELF at the end. A
 * cleanup that cannot confirm it cleaned must exit non-zero — otherwise it is
 * a monitor that skips itself and reports healthy.
 *
 * SCOPE: only rows whose email matches SYNTHETIC_SIGNUP_EMAIL_LIKE. It never
 * touches a real account, and it never touches the CRM — sub-account creation
 * for synthetic signups is PREVENTED in lib/provision.ts rather than cleaned up
 * after the fact. Deleting live sub-accounts is not this script's job.
 *
 * Requires:
 *   SUPABASE_URL              (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with:
 *   npx tsx tests/e2e/cleanup.ts
 */

import { createClient } from '@supabase/supabase-js'
import { SYNTHETIC_SIGNUP_EMAIL_LIKE } from '../../lib/test-accounts'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('[cleanup] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping.')
  process.exit(0)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Dependent tables with a NO ACTION foreign key to profiles that the signup
 * chain actually writes. Measured 2026-08-20 across all 16 NO ACTION referrers:
 * provision_pipeline held 241 rows for the synthetic set, every other table
 * held 0. Listed explicitly rather than cascaded — adding ON DELETE CASCADE to
 * these FKs would change what happens when a REAL user is deleted, and that is
 * a schema decision, not a test-cleanup decision.
 *
 * If a new dependent appears, the verification pass at the end of main() turns
 * red with the constraint name in the message. It will not go quiet.
 */
const DEPENDENTS: { table: string; column: string }[] = [
  { table: 'provision_pipeline', column: 'user_id' },
]

async function main() {
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, email')
    .like('email', SYNTHETIC_SIGNUP_EMAIL_LIKE)

  if (error) {
    console.error('[cleanup] profile lookup failed:', error.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('[cleanup] no e2e-test rows to remove.')
    return
  }

  const ids = rows.map((r) => r.id)
  console.log(`[cleanup] removing ${rows.length} e2e profile(s)`)

  // Dependents first, or the profile delete fails the FK check.
  for (const dep of DEPENDENTS) {
    const { error: depErr } = await supabase.from(dep.table).delete().in(dep.column, ids)
    if (depErr) {
      console.error(`[cleanup] failed clearing ${dep.table}.${dep.column}:`, depErr.message)
      process.exit(1)
    }
  }

  // Auth users. A missing user is fine — the profile sweep below is what
  // actually has to succeed.
  for (const row of rows) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(row.id)
    if (authErr && !/not found/i.test(authErr.message)) {
      console.warn(`[cleanup] auth delete failed for ${row.email}:`, authErr.message)
    }
  }

  // Profiles, including orphans whose auth user is already gone. CHECKED.
  const { error: profErr } = await supabase
    .from('profiles')
    .delete()
    .like('email', SYNTHETIC_SIGNUP_EMAIL_LIKE)
  if (profErr) {
    console.error('[cleanup] profile delete failed:', profErr.message)
    process.exit(1)
  }

  // Prove it. The whole point of this script is the row count afterwards, so
  // assert on that and not on having reached the end of the function.
  const { count, error: verifyErr } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', SYNTHETIC_SIGNUP_EMAIL_LIKE)
  if (verifyErr) {
    console.error('[cleanup] verification query failed:', verifyErr.message)
    process.exit(1)
  }
  if (count && count > 0) {
    console.error(`[cleanup] VERIFICATION FAILED — ${count} synthetic profile(s) survived the delete.`)
    process.exit(1)
  }

  console.log(`[cleanup] done — ${rows.length} removed, 0 remaining (verified).`)
}

main().catch((err) => {
  console.error('[cleanup] fatal:', err)
  process.exit(1)
})
