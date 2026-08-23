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
    target: '[data-tour="connect-groq"]',
    title: 'Connect your free AI key',
    body: "Groq is free, needs no credit card, and takes about a minute. Connect it and every AI feature in 0nCore runs on your own account — unmetered by us, and your key is stored encrypted where nobody here can read it.",
    critical: true,
    cta: { label: 'Create your Groq account & get your key', href: 'https://console.groq.com/keys' },
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
