/**
 * /dashboard/course-builder — the OPERATOR view of Course Builder.
 *
 * Behind the H1 gate in middleware.ts, which makes every /dashboard/* route
 * owner-only. It is not the customer's door and must not be linked as one: the
 * entitled customer surface is /x/ai-course-builder, which renders this same
 * component after the add-on gate has said yes.
 */
import CourseBuilderApp from './CourseBuilderApp'

export const metadata = {
  title: 'Course Builder — 0nCORE',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <CourseBuilderApp />
}
