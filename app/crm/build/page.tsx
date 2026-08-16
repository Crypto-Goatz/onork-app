import BuildStudio from './BuildStudio'

export const metadata = {
  title: 'Build a site — 0nCORE',
  robots: { index: false, follow: false },
}

/**
 * /crm/build — the visual builder, inside 0nCore.
 *
 * EMBEDDED, NOT FORKED. The studio is 5,500 lines living in web0n. Copying it
 * here would give two builders that agree today and diverge on the first fix
 * applied to only one of them — the failure this ecosystem has paid for
 * repeatedly. One builder, framed, with the bundle handed across on export.
 */
export default function Page() {
  return <BuildStudio />
}
