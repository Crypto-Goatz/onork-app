import type { TourStep } from '@/components/onboarding/Tour'

/**
 * The welcome tour. Runs once on first arrival, replayable from settings.
 *
 * The Groq step is marked `critical`: skipping it is allowed, but it raises the
 * interstitial first, because a user who silently declines it runs on the
 * shared platform allowance and hits a wall later with no idea why.
 *
 * Steps with no `target` render centred. Steps with one spotlight that element,
 * so every selector here must exist in the dashboard markup as
 * `data-tour="..."` — a missing target degrades to a centred card rather than
 * breaking the tour.
 */
export const WELCOME_TOUR: TourStep[] = [
  {
    title: 'Welcome to 0nCore 👋',
    body: "Sixty seconds and you'll know where everything lives. The single most valuable thing you can do first is connect your own AI key — it makes everything here run on your account instead of a shared allowance.",
  },
  {
    target: '[data-tour="nav-dashboard"]',
    title: 'This is your dashboard',
    body: 'Everything you connect shows up here — your clients, your automations, and the AI that runs them. It fills in as you connect things.',
  },
  {
    // No `target`, on purpose — this step is a centred card now.
    //
    // It used to spotlight `[data-tour="connect-groq"]`, anchored off a
    // sidebar href of /dashboard/settings/groq. Two things were wrong with
    // that. No nav item has ever carried that href, so the selector matched
    // nothing and the step already degraded to a centred card — the spotlight
    // was decorative. And the destination itself is behind the owner gate, so
    // the one user this step exists for could not reach it. The vault door is
    // the connect surface now (vault.0ncore.com), and it is not in this
    // sidebar to point at.
    title: 'Connect your free AI key',
    body: "Groq is free, needs no credit card, and takes about a minute. Connect it in your vault and every AI feature runs on your own account — unmetered by us, and your key is stored encrypted where nobody here can read it.",
    critical: true,
    cta: { label: 'Open your vault to connect Groq', href: 'https://vault.0ncore.com/' },
  },
  {
    target: '[data-tour="nav-clients"]',
    title: 'Your clients live here',
    body: 'Each client gets their own workspace. Connect one and its tools, automations and reporting light up automatically — you never wire up a menu by hand.',
  },
  {
    target: '[data-tour="nav-settings"]',
    title: 'Settings & billing',
    body: 'Your plan, your connected apps, and your AI key all live here. Replay this tour any time from the same place.',
  },
]
