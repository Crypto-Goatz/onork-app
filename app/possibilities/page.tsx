import type { Metadata } from 'next'
import PossibilitiesExplorer from './PossibilitiesExplorer'

export const metadata: Metadata = {
  title: 'Possibilities — Pick an outcome, see 0nCore fire | 0nCore',
  description:
    'An interactive map of what 0nCore can do. Choose an outcome — nurture a lead, launch a product, get more reviews — and watch every capability light up around it. 12 outcomes, 60+ capabilities, endless combinations.',
  alternates: { canonical: 'https://www.0ncore.com/possibilities' },
  openGraph: {
    title: 'Possibilities — what do you want to make happen?',
    description: 'Pick an outcome and watch 0nCore reveal every capability it fires to get you there.',
    url: 'https://www.0ncore.com/possibilities',
  },
}

export default function Page() {
  return <PossibilitiesExplorer />
}
