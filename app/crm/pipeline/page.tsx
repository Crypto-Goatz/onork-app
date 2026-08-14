import LegacyPipeline from '@/app/dashboard/crm/pipeline/page'
import AppSidebar from '../AppSidebar'

export const metadata = { title: 'Pipeline — 0nCORE', robots: { index: false, follow: false } }

/**
 * Pipeline, wearing the app's chrome.
 *
 * THIS PAGE WAS RENDERING WHITE-ON-WHITE. It is a re-export of the dashboard
 * kanban, which styles itself with `text-white` in 27 places because it was
 * built to sit inside the dark chrome that used to wrap /crm. That chrome is
 * gone, so the board was drawing white text straight onto the white canvas —
 * present, functional, and completely invisible.
 *
 * The board is kept rather than rewritten: it is 385 lines of working
 * drag-to-move kanban that writes through to the CRM, and rewriting it to be
 * light would be a day spent to change nothing a user can do. Instead it gets
 * the sidebar every other surface has, and sits on a dark panel — which the
 * design system already sanctions for dense interactive surfaces, on the same
 * grounds as the dark command input on a light page: a working surface should
 * contrast its container rather than dissolve into it.
 */
export default function Page() {
  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="pipeline" activeCount={0} totalCount={0} usageLabel="Pipeline" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-6 py-8">
          <div className="rounded-2xl bg-[#0d1117] p-5 shadow-[var(--oc-shadow)]">
            <LegacyPipeline />
          </div>
        </div>
      </main>
    </div>
  )
}
