import { createClient } from '@/lib/supabase/server'

/**
 * The signed-in person, from the 0nCore session cookie — never from a user_id in the URL, body or a header.
 * (2026-11-20: /api/marketplace/my-apps and /execute trusted ?user_id= / x-user-id, so anyone holding a person's
 * account id could list, change, uninstall or run that person's apps.)
 */
export async function sessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}
