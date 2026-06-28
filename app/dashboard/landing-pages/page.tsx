import { redirect } from 'next/navigation'

// Landing pages are built on the CRM's native funnel/website builder (per
// sub-account, own domain + forms + tracking) — not Vercel. Unified into Funnels.
export default function LandingPagesRedirect() {
  redirect('/dashboard/funnels')
}
