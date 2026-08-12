import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import DecisionsForm, { type Round } from '../DecisionsForm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const metadata = { title: 'Decisions — 0nCORE', robots: { index: false, follow: false } }

/**
 * /decisions/[token] — one round of questions, answered in one pass.
 *
 * The token is the auth. This is emailed to one person and contains no client
 * data — only decisions about what to build — so a login gate would add
 * friction to the exact thing that needs to be frictionless, and gain nothing
 * an unguessable path does not already give.
 *
 * Rounds live in the database rather than in code: posting a new set of
 * questions is an INSERT, not a deploy.
 */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data } = await db
    .from('decision_rounds')
    .select('id, round, title, intro, completed, questions, status, answered_at')
    .eq('token', token)
    .maybeSingle()

  if (!data) notFound()

  return <DecisionsForm round={data as Round} token={token} />
}
