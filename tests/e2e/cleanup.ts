/**
 * Cleanup script — purges e2e-test-* profile + auth rows from Supabase.
 * Runs after the smoke suite in CI to keep the DB tidy.
 *
 * Requires:
 *   SUPABASE_URL              (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run with:
 *   npx tsx tests/e2e/cleanup.ts
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('[cleanup] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — skipping.')
  process.exit(0)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function main() {
  // Find all matching profiles.
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, email')
    .like('email', 'e2e-test-%@cryptogoatz.com')

  if (error) {
    console.error('[cleanup] profile lookup failed:', error.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('[cleanup] no e2e-test rows to remove.')
    return
  }

  console.log(`[cleanup] removing ${rows.length} e2e profile(s):`, rows.map((r) => r.email).join(', '))

  // Delete auth users (cascades to profiles via FK / trigger).
  for (const row of rows) {
    const { error: authErr } = await supabase.auth.admin.deleteUser(row.id)
    if (authErr) {
      console.warn(`[cleanup] auth delete failed for ${row.email}:`, authErr.message)
      // Fall back to direct profile delete.
      await supabase.from('profiles').delete().eq('id', row.id)
    }
  }

  // Sweep any orphan profile rows that survived (no matching auth user).
  await supabase
    .from('profiles')
    .delete()
    .like('email', 'e2e-test-%@cryptogoatz.com')

  console.log('[cleanup] done.')
}

main().catch((err) => {
  console.error('[cleanup] fatal:', err)
  process.exit(1)
})
