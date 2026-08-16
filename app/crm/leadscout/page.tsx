import LeadScoutApp from './LeadScoutApp'

export const metadata = {
  title: 'LeadScout by RocketOpp',
  robots: { index: false, follow: false },
}

/**
 * /crm/leadscout — the LeadScout marketplace Custom Page.
 *
 * THE URL IS THE SPEC'S URL. The build sheet registers
 * https://app.0ncore.com/crm/leadscout, and a Custom Page URL has to match the
 * registered value exactly — so this route exists at that path rather than at a
 * tidier one. It sat 404 until now, which would have failed review on the first
 * click.
 */
export default function Page() {
  return <LeadScoutApp />
}
