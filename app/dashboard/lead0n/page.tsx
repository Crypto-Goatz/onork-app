/**
 * /dashboard/lead0n — lead0n's entry route on the add-on frame.
 *
 * DELIBERATELY ITS OWN ROUTE rather than a reuse of /crm/leadscout, for the
 * same reason /app/course is not a reuse of /crm/courses. That surface opens
 * inside someone else's product, in an iframe, for a person with no account
 * here whose identity arrives through the SSO handshake. This one opens for a
 * signed-in 0nCORE user arriving from the Hub, where there is no parent frame
 * to hand over a token and the session is the proof instead. Same screen
 * underneath — one component, one `auth` prop — different front door.
 *
 * WITHOUT THIS THE HUB TILE WAS A MAZE. lead0n's only surface was the Custom
 * Page, which outside an iframe correctly says "open this from inside your
 * CRM". A tile that unlocks and then says that is exactly the dead end the
 * Hub's exit test forbids: reach a working flow or a locked tile, never a
 * third thing.
 */
import HostedGate from '@/components/addons/HostedGate'
import LeadScoutApp from '@/app/crm/leadscout/LeadScoutApp'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'lead0n — 0nCORE',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <HostedGate slug="lead0n">
      <LeadScoutApp auth="session" />
    </HostedGate>
  )
}
