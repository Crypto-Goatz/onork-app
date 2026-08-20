/**
 * WHAT COUNTS AS A SYNTHETIC ACCOUNT — and why there are two answers, not one.
 *
 * The E2E smoke suite signs up a real user on production every run. That signup
 * runs the real provisioning chain, which creates a real CRM sub-account under
 * the 0nCore agency. `tests/e2e/cleanup.ts` then deletes the Supabase auth user
 * and profile — and nothing at all on the CRM side.
 *
 * Measured 2026-08-20 against companyId bknfhTkdDLapbwfZqQNi: 37 of 103
 * sub-accounts are test artifacts, 15 of them created in the preceding 48 hours
 * (8 between 00:14 and 01:24 alone, one per push). Six had the Course Builder
 * add-on installed, which put rows named `SCOPE-TEST-DELETE-ME` and
 * `e2e-test-1787180228074 — 0nCore` in the customer-facing publish picker.
 *
 * A sub-account is a billed, snapshot-deployed, outward-facing object. A test
 * that creates one per run and never removes it is a leak, so provisioning is
 * skipped for synthetic signups at the single funnel (`provisionSubLocation`).
 *
 * TWO PREDICATES, DELIBERATELY, because they carry opposite risk:
 *
 *   isSyntheticSignupEmail  — NARROW. Gates a side effect. A false positive
 *                             denies a real person their workspace, so it
 *                             matches only the exact string the suite mints:
 *                             e2e-test-<epoch-ms>@cryptogoatz.com.
 *
 *   looksLikeTestAccount    — BROAD. Display-only, for hiding noise in the
 *                             admin signup list. A false positive hides one
 *                             row from one internal page. It matches
 *                             `@cryptogoatz.com` wholesale, which includes
 *                             mike@cryptogoatz.com — a REAL address. Never
 *                             gate a side effect on this one.
 *
 * Keeping both here rather than inline is the point: this file previously had
 * three copies of "what is a test account" (the cleanup script's LIKE pattern,
 * the admin page's regex, and nothing at all in the provisioner), and the
 * missing third copy is what let 37 sub-accounts accumulate unnoticed while the
 * admin page quietly filtered the evidence out of view.
 */

/** SQL LIKE pattern for the same set as {@link isSyntheticSignupEmail}. */
export const SYNTHETIC_SIGNUP_EMAIL_LIKE = 'e2e-test-%@cryptogoatz.com'

const SYNTHETIC_SIGNUP = /^e2e-test-\d+@cryptogoatz\.com$/i

/**
 * Exactly the addresses `tests/e2e/signup-chain.spec.ts` mints.
 * Safe to gate destructive-by-omission behaviour on. See file docblock.
 */
export function isSyntheticSignupEmail(email: string | null | undefined): boolean {
  return SYNTHETIC_SIGNUP.test((email || '').trim())
}

const LOOKS_LIKE_TEST =
  /e2e-test|@cryptogoatz\.com|rls_|anth_test|schema_|conn_\d|anthropic_|ssr_|ai_dig|keycheck|maxdur|test_/i

/**
 * Broad, lossy, DISPLAY ONLY. Matches real staff addresses too.
 * Do not use this to skip, delete, or deny anything.
 */
export function looksLikeTestAccount(email: string | null | undefined): boolean {
  return LOOKS_LIKE_TEST.test(email || '')
}
