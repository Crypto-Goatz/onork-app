/**
 * The one place a 0n account comes into existence.
 *
 * WHY THIS EXISTS. People reach this ecosystem four different ways — email
 * signup, Google, a marketplace install, and the SSO handshake inside a CRM
 * iframe — and until now only the first two produced an account. Someone who
 * installed an app and used it every day had a session, a company, and no
 * identity: nothing to attach an add-on to, nothing to carry them into web0n or
 * 0nTask, nothing to build a profile on. They were a visitor in a product they
 * had paid for.
 *
 * EMAIL IS THE JOIN KEY. It is the one identifier every entry path carries, and
 * it is what makes arriving through the CRM and arriving through the website the
 * same person rather than two accounts that will never be reconciled. Where a
 * path cannot supply an email, the account is keyed on the CRM company and
 * upgraded the moment an email appears — never duplicated.
 *
 * IT IS IDEMPOTENT AND IT NEVER OVERWRITES. Calling it on every request is
 * intended. An existing profile is returned as-is; only genuinely empty fields
 * are filled in. A returning user's display name, brand and settings are theirs,
 * and a login is not an invitation to reset them.
 */
import { createServiceClient } from '@/lib/connect/service-client'

export type AccountSource = 'signup' | 'google' | 'crm_sso' | 'marketplace_install' | 'device'

export interface EnsureInput {
  email?: string | null
  /** CRM company the person arrived from, when there is one. */
  companyId?: string | null
  locationId?: string | null
  displayName?: string | null
  source: AccountSource
}

export interface OnAccount {
  id: string
  email: string | null
  displayName: string | null
  created: boolean
  source: AccountSource
}

/** A stable synthetic address for a path that carries no email. Never emailed. */
function placeholderEmail(companyId: string): string {
  return `company+${companyId.toLowerCase()}@crm.0ncore.local`
}

export async function ensureOnAccount(
  input: EnsureInput,
): Promise<{ ok: true; account: OnAccount } | { ok: false; error: string }> {
  const db = createServiceClient()
  if (!db) return { ok: false, error: 'Storage unavailable.' }

  const email = (input.email || '').trim().toLowerCase() || null
  const companyId = (input.companyId || '').trim() || null

  if (!email && !companyId) {
    return { ok: false, error: 'No email and no company — nothing to key an account on.' }
  }

  const lookupEmail = email ?? placeholderEmail(companyId!)

  // 1 — by email, the identity that spans every surface.
  const { data: byEmail } = await db
    .from('profiles')
    .select('id, email, display_name, crm_agency_id, crm_location_id')
    .eq('email', lookupEmail)
    .maybeSingle()

  if (byEmail) {
    // Fill only what is genuinely missing. A returning user's fields are theirs.
    const patch: Record<string, unknown> = {}
    if (companyId && !byEmail.crm_agency_id) patch.crm_agency_id = companyId
    if (input.locationId && !byEmail.crm_location_id) patch.crm_location_id = input.locationId
    if (input.displayName && !byEmail.display_name) patch.display_name = input.displayName
    if (Object.keys(patch).length) {
      await db.from('profiles').update(patch).eq('id', byEmail.id)
    }
    return {
      ok: true,
      account: {
        id: byEmail.id as string,
        email: byEmail.email as string | null,
        displayName: (patch.display_name as string) ?? (byEmail.display_name as string | null),
        created: false,
        source: input.source,
      },
    }
  }

  // 2 — an account already made for this company under a placeholder, now
  // meeting a real email for the first time. Upgrade rather than duplicate:
  // two rows for one person is a split nobody ever reconciles.
  if (email && companyId) {
    const { data: byCompany } = await db
      .from('profiles')
      .select('id, email, display_name')
      .eq('email', placeholderEmail(companyId))
      .maybeSingle()

    if (byCompany) {
      await db.from('profiles').update({
        email,
        ...(input.displayName && !byCompany.display_name ? { display_name: input.displayName } : {}),
      }).eq('id', byCompany.id)
      return {
        ok: true,
        account: {
          id: byCompany.id as string, email,
          displayName: (byCompany.display_name as string | null) ?? input.displayName ?? null,
          created: false, source: input.source,
        },
      }
    }
  }

  // 3 — create.
  const { data: made, error } = await db
    .from('profiles')
    .insert({
      email: lookupEmail,
      display_name: input.displayName ?? null,
      full_name: input.displayName ?? null,
      crm_agency_id: companyId,
      crm_location_id: input.locationId ?? null,
      auth_provider: input.source,
      onboarding_completed: false,
      plan: 'free',
    })
    .select('id, email, display_name')
    .single()

  if (error || !made) {
    // A duplicate here means a concurrent request won the race — the account
    // exists, which is the outcome we wanted. Read it back rather than failing.
    const { data: raced } = await db
      .from('profiles').select('id, email, display_name').eq('email', lookupEmail).maybeSingle()
    if (raced) {
      return { ok: true, account: {
        id: raced.id as string, email: raced.email as string | null,
        displayName: raced.display_name as string | null, created: false, source: input.source,
      } }
    }
    return { ok: false, error: error?.message ?? 'Could not create the account.' }
  }

  return {
    ok: true,
    account: {
      id: made.id as string,
      email: made.email as string | null,
      displayName: made.display_name as string | null,
      created: true,
      source: input.source,
    },
  }
}
