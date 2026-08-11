import CoursesPage from '../../dashboard/courses/page'

export const metadata = { title: 'Course Builder — 0nCORE', robots: { index: false, follow: false } }

/**
 * /crm/courses — the Course Builder, on the CRM surface.
 *
 * Re-exports the working page rather than copying it. A duplicate would drift,
 * and the whole point of moving things under /crm is to end up with ONE of each
 * feature, not two.
 */
export default function Page() { return <CoursesPage /> }
