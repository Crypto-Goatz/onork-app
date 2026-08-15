import CourseApp from './CourseApp'

export const metadata = {
  title: '0n Course Builder',
  robots: { index: false, follow: false },
}

/**
 * /app/course — the marketplace Custom Page.
 *
 * Deliberately its own route rather than a reuse of /crm/courses. That surface
 * assumes an agency signed into 0nCORE with a client list and a sidebar; this
 * one opens inside someone else's product, in an iframe, for a person who has
 * no account here and arrived through the SSO handshake. Same engine
 * underneath, different front door.
 */
export default function Page() {
  return <CourseApp />
}
