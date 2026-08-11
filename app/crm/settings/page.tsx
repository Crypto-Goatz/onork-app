import SidebarSideToggle from '../SidebarSideToggle'
import SettingsRows from '../SettingsRows'
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

        <section className="mt-6">
          <SettingsRows />
        </section>

        {/* The existing CRM settings — custom fields, custom values, team —
            kept below rather than dropped. The design's five rows are the
            navigation; this is the surface that actually works today. */}
        <section className="mt-10 border-t border-[color:var(--console-border)] pt-8">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-[color:var(--console-text-3)]">
            CRM configuration
          </h2>
          <LegacyCrmSettings />
        </section>
      </div>
    </div>
  )
}
