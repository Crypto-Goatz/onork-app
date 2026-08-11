import SidebarSideToggle from '../SidebarSideToggle'
import LegacyCrmSettings from '@/app/dashboard/crm/settings/page'

export const metadata = { title: 'Settings — 0nCORE', robots: { index: false, follow: false } }

/**
 * /crm/settings
 *
 * COMPOSES the existing CRM settings rather than replacing them. That page owns
 * custom fields, custom values and team members — 291 lines of working surface
 * — and it renders no shell of its own, so it drops straight in underneath.
 * Rewriting it to add one toggle would have been a rewrite to lose features.
 */
export default function Page() {
  return (
    <div className="oncore-app min-h-screen bg-[color:var(--oc-bg)]">
      <div className="mx-auto max-w-[840px] px-10 py-12">
        <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--console-text-1)]">
          Settings
        </h1>

        <section className="mt-8 space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--console-text-3)]">
            Appearance
          </h2>
          <SidebarSideToggle />
        </section>

        <section className="mt-10">
          <LegacyCrmSettings />
        </section>
      </div>
    </div>
  )
}
