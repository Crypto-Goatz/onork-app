/**
 * /crm/flows — 0nTask's flow builder, inside 0nCore.
 *
 * One builder, two surfaces. See FlowsEmbed for why this embeds rather than
 * ports: there are 2,046 working lines in 0ntask-studio, and a second copy
 * would start identical and drift.
 */
import FlowsClient from './FlowsClient'

export const metadata = {
  title: 'Flows — 0nCORE',
  robots: { index: false, follow: false },
}

export default function FlowsPage() {
  return <FlowsClient />
}
