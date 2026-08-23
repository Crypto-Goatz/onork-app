/**
 * /dashboard/settings/groq — folded into the vault door, 2026-08-23.
 *
 * The paste-and-verify form that lived here is now the Groq panel on /vault,
 * which is what vault.0ncore.com serves. Keeping a second copy of it would be
 * two sources of truth for the one thing that must never disagree with itself:
 * whether a customer's key is stored.
 *
 * Middleware already redirects this path before the owner gate can bounce a
 * non-owner to /hub. This file is the second belt — if the matcher ever stops
 * covering the path, a bookmark still lands on the door instead of rendering a
 * stale form that writes to the vault from an address nobody maintains.
 */
import { redirect } from 'next/navigation'

export default function LegacyGroqSettingsPage() {
  redirect('/vault')
}
