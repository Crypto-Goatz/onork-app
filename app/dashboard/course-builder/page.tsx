/**
 * /dashboard/course-builder — Course Builder's entry route on the add-on frame.
 *
 * THIS IS THE MIGRATION. Course Builder was built before /x/[slug] existed and
 * kept its own front door, which checked that you were signed in and nothing
 * else — so any 0nCORE account on any plan could generate courses and publish
 * them into a CRM. It is now a registered hosted add-on
 * (lib/addon-registry.ts), the skeleton names this path as its entryRoute
 * (lib/addons/skeleton.ts), and the gate runs here.
 *
 * THE APP ITSELF IS UNTOUCHED. Migrating onto the frame meant adopting the
 * gate, not the generic configure-and-Run panel — that panel would have
 * replaced a course list with an empty form, which is not a migration.
 */
import HostedGate from '@/components/addons/HostedGate'
import CourseBuilderApp from './CourseBuilderApp'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Course Builder — 0nCORE',
  robots: { index: false, follow: false },
}

export default function Page() {
  return (
    <HostedGate slug="ai-course-builder">
      <CourseBuilderApp />
    </HostedGate>
  )
}
