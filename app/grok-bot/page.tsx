import type { Metadata } from 'next'
import Link from 'next/link'
import { Bot, Download, Monitor, Smartphone, MessageCircle, BadgeCheck, Zap, GitBranch, CalendarCheck, Users, ArrowRight, Plug } from 'lucide-react'

/**
 * GROK BOT + 0nCORE (2026-11-14). Grok Bot is xAI's always-on AI teammate. It takes any remote MCP server as a "custom
 * connector", and 0n3 (0n3.app/mcp) is that connector: it hands the Bot every app the person connected, including the
 * 0nCore CRM. Install, platform and plan facts are from xAI's own docs (docs.x.ai/grok-bot: get-started, faq,
 * computer-and-apps, skills-routines-and-automations), read 2026-11-14. No prices: xAI lists plans, not prices.
 * SXO checklist (docs/SXO-CRO9-Master-Playbook.md): BLUF, cro9:living, table in the first viewport, FAQPage + HowTo
 * JSON-LD, cross-family links. The CRM is "the CRM" or "0nCore", never the vendor's name.
 */

const URL_SELF = 'https://www.0ncore.com/grok-bot'
const TITLE = 'Grok Bot + 0nCore: download Grok Bot and connect it to your CRM'
const DESC =
  'Download Grok Bot for Mac, Windows, Linux, iPhone and Android, then connect it to 0nCore through 0n3. Your Bot works your contacts, pipelines, calendars and workflows around the clock, with a receipt for every action.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  alternates: { canonical: URL_SELF },
  openGraph: { title: TITLE, description: DESC, url: URL_SELF, type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
  other: { 'cro9:living': '1' },
}

const FAQ: [string, string][] = [
  ['What is Grok Bot?', "Grok Bot is xAI's always-on AI teammate. Each Bot has its own cloud computer, remembers your work, connects to your apps and runs routines on a schedule or from a webhook. You talk to it in the desktop app, on your phone, in X Chat, by tagging @bot on X, or in Slack."],
  ['Where do I download Grok Bot?', 'At x.ai/bot. The desktop app runs on macOS (Apple silicon and Intel), Windows (x64 and Arm64) and Linux (x64 and Arm64 as .deb, .rpm or AppImage). Phone and tablet apps are in the App Store (iOS 18 or later) and Google Play (Android 9 or later).'],
  ['Which plans include Grok Bot?', 'Premium, Super and Ultra on The X Subscription; SuperGrok, SuperGrok Plus, SuperGrok Heavy and X Premium+; Grok Business; and paid Cursor plans. Plus and Free do not include it.'],
  ['How does Grok Bot reach my 0nCore CRM?', 'Through 0n3, the 0n hub. Add 0n3 to Grok Bot once as a custom connector (Remote HTTPS, https://0n3.app/mcp, with a key 0n3 makes just for Grok Bot). Your 0nCore CRM and every other app you connected to 0n3 become things your Bot can do.'],
  ['What can my Bot do in 0nCore?', 'Find and update contacts, tag them, move opportunities through pipelines, book and read calendar appointments, add notes and tasks, start workflows and send messages, in your own sub-account, with a receipt for each action.'],
  ['Can 0nCore start Grok Bot?', 'Yes. Add a webhook trigger to a Grok Bot routine and save its URL and key in 0n3. A new lead, a booked call or a paid invoice can then start that routine with the details attached.'],
  ['I run an agency. Can each client have a Bot?', 'Yes. Each Bot connects with its own 0n3 key, so a Bot can work one client sub-account and nothing else, and you can cut it off alone at any time.'],
]

const STEPS: [string, string][] = [
  ['Download Grok Bot', 'Get the desktop app at x.ai/bot, or search Grok Bot in the App Store or Google Play. Finish the short intro and it makes your first Bot.'],
  ['Open 0n3 with your 0nCore email', 'Sign in at 0n3.app with the same email you use for 0nCore. Your CRM is already there; add any other apps the Bot should use.'],
  ['Make a key for Grok Bot', 'Open 0n3.app/install and pick Grok Bot. 0n3 makes a key for Grok Bot alone and shows the URL and header.'],
  ['Add the connector', 'In Grok Bot: Connect apps → Add a custom connector → Name 0n3 → Type Remote HTTPS → Server URL https://0n3.app/mcp → HTTP header Authorization: Bearer <your key> → Add plugin.'],
  ['Give it a job', 'Ask: "Use 0n3: list today\'s appointments and any new leads, then draft a follow-up for each." When it is right, ask it to run every weekday at 8.'],
]

const COMPARE: [string, string, string][] = [
  ['Your CRM', 'Not built in', 'Contacts, pipelines, calendars, workflows, invoices'],
  ['Apps it can use', 'About 27 built in', '130+ through 0n3'],
  ['Which account', 'The one you connected', 'Any of yours, per action'],
  ['Record of every action', 'The chat', 'A receipt in 0n3'],
  ['Who can start it', 'You, a schedule, a webhook', 'Plus any 0nCore or 0n3 event'],
  ['Per-client control', 'One Bot, one set of apps', 'One key per Bot, per sub-account'],
]

const DOWNLOAD = [
  { icon: Monitor, title: 'Desktop', text: 'macOS (Apple silicon and Intel), Windows (x64 and Arm64), Linux (x64 and Arm64 as .deb, .rpm or AppImage).' },
  { icon: Smartphone, title: 'Phone and tablet', text: 'Search Grok Bot in the App Store (iOS 18 or later) or Google Play (Android 9 or later). Chats sync across devices.' },
  { icon: MessageCircle, title: 'Also on', text: 'X Chat, X itself (tag @bot on a post), and Slack for Team Bots.' },
  { icon: BadgeCheck, title: 'Plans', text: 'X Premium, Super and Ultra; SuperGrok and X Premium+; Grok Business; paid Cursor plans. Not on Plus or Free.' },
]

const USES = [
  { icon: Zap, title: 'Speed to lead', text: 'A new lead arrives; the Bot looks them up, tags them, texts them and books the call while you sleep.' },
  { icon: GitBranch, title: 'Pipeline upkeep', text: 'Every morning it moves stale deals, adds the next task and tells you which three need you today.' },
  { icon: CalendarCheck, title: 'Calendar prep', text: 'Before each appointment it pulls the contact, their history and notes into a one-page brief.' },
  { icon: Users, title: 'Client reporting', text: 'For agencies: one Bot per client sub-account, a weekly summary for each, nothing shared between them.' },
]

const ld = [
  { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: '0nCore', item: 'https://www.0ncore.com' },
    { '@type': 'ListItem', position: 2, name: 'Grok Bot', item: URL_SELF },
  ] },
  { '@context': 'https://schema.org', '@type': 'HowTo', name: 'Install Grok Bot and connect it to 0nCore', totalTime: 'PT5M', step: STEPS.map(([name, text]) => ({ '@type': 'HowToStep', name, text })) },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
]

const primary = 'inline-flex items-center gap-2 rounded-lg bg-[#6EE05A] px-5 py-2.5 text-sm font-semibold text-[#0d1117] hover:bg-[#5bc74a]'
const ghost = 'inline-flex items-center gap-2 rounded-lg border border-[#30363d] px-5 py-2.5 text-sm font-medium text-[#e6edf3] hover:border-[#484f58] hover:bg-[#21262d]'
const card = 'rounded-xl border border-[#30363d] bg-[#161b22] p-5'

export default function GrokBotPage() {
  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {ld.map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[#30363d] bg-[#0d1117]/90 px-4 py-3 backdrop-blur sm:px-8">
        <Link href="/home" className="flex items-center gap-2">
          <img src="/brand/0ncore-icon.png" alt="0nCore" className="h-6" />
          <span className="text-sm font-bold text-[#e6edf3]"><span className="text-[#6EE05A]">0n</span>Core</span>
        </Link>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/downloads" className="text-[#8b949e] hover:text-[#e6edf3]">Downloads</Link>
          <Link href="/pricing" className="text-[#8b949e] hover:text-[#e6edf3]">Pricing</Link>
          <Link href="/signup" className="rounded-md bg-[#6EE05A] px-4 py-1.5 font-semibold text-[#0d1117] hover:bg-[#5bc74a]">Get started free</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#30363d] px-3 py-1 font-mono text-xs uppercase tracking-widest text-[#8b949e]"><Bot className="h-3.5 w-3.5 text-[#6EE05A]" />Grok Bot · xAI · works with 0nCore</span>
        <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-[#e6edf3] sm:text-5xl">Grok Bot never sleeps. Now it works <span className="text-[#6EE05A]">your CRM</span>.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#c9d1d9]">
          Download Grok Bot, connect it to 0nCore through 0n3 in five minutes, and your Bot follows up leads, moves deals, books calls and starts your workflows around the clock, in your own sub-account, with a receipt for every action.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="https://x.ai/bot" rel="noopener" className={primary}><Download className="h-4 w-4" />Download Grok Bot</a>
          <a href="https://0n3.app/install?client=grok_bot" className={ghost}><Plug className="h-4 w-4" />Connect it to 0nCore</a>
          <a href="https://0n3.app/grok-bot" className={ghost}>Full guide<ArrowRight className="h-4 w-4" /></a>
        </div>
        <p className="mt-3 text-xs text-[#8b949e]">macOS · Windows · Linux · iPhone · iPad · Android</p>

        <h2 className="mt-12 text-xl font-semibold text-[#e6edf3]">Grok Bot alone vs Grok Bot with 0nCore</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-[#30363d] bg-[#161b22]">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#30363d]">
                <th className="px-4 py-3" />
                <th className="px-4 py-3 font-medium text-[#8b949e]">Grok Bot</th>
                <th className="px-4 py-3 font-medium text-[#6EE05A]">Grok Bot + 0nCore</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map(([k, a, b]) => (
                <tr key={k} className="border-t border-[#30363d]/60">
                  <td className="px-4 py-3 font-medium text-[#e6edf3]">{k}</td>
                  <td className="px-4 py-3 text-[#8b949e]">{a}</td>
                  <td className="px-4 py-3 text-[#e6edf3]">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 text-xl font-semibold text-[#e6edf3]">Download Grok Bot</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DOWNLOAD.map(({ icon: Icon, title, text }) => (
            <div key={title} className={card}>
              <Icon className="h-5 w-5 text-[#6EE05A]" />
              <h3 className="mt-3 text-base font-medium text-[#e6edf3]">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#8b949e]">{text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-[#e6edf3]">Connect it in five minutes</h2>
        <ol className="mt-4 grid gap-3">
          {STEPS.map(([name, text], i) => (
            <li key={name} className={`${card} flex items-start gap-4`}>
              <span className="inline-flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#6EE05A] text-sm font-bold text-[#0d1117]">{i + 1}</span>
              <span>
                <span className="block text-base font-medium text-[#e6edf3]">{name}</span>
                <span className="mt-1 block text-sm leading-relaxed text-[#c9d1d9]">{text}</span>
              </span>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl font-semibold text-[#e6edf3]">What your Bot does in 0nCore</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {USES.map(({ icon: Icon, title, text }) => (
            <div key={title} className={card}>
              <Icon className="h-5 w-5 text-[#6EE05A]" />
              <h3 className="mt-3 text-base font-medium text-[#e6edf3]">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#8b949e]">{text}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-[#e6edf3]">Questions</h2>
        <div className="mt-4 grid gap-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className={card}>
              <summary className="cursor-pointer text-base font-medium text-[#e6edf3]">{q}</summary>
              <p className="mt-3 text-sm leading-relaxed text-[#c9d1d9]">{a}</p>
            </details>
          ))}
        </div>

        <h2 className="mt-12 text-xl font-semibold text-[#e6edf3]">Keep going</h2>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <a href="https://0n3.app/grok-bot" className="text-[#58a6ff] hover:underline">Grok Bot + 0n3: every app it can reach</a>
          <a href="https://0n3.app/integrate/grok_bot/stripe" className="text-[#58a6ff] hover:underline">Connect Grok Bot to Stripe</a>
          <a href="https://0n3.app/integrate/grok_bot/pipedrive" className="text-[#58a6ff] hover:underline">Connect Grok Bot to Pipedrive</a>
          <Link href="/agencies" className="text-[#58a6ff] hover:underline">0nCore for agencies</Link>
          <Link href="/downloads" className="text-[#58a6ff] hover:underline">All downloads</Link>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <a href="https://x.ai/bot" rel="noopener" className={primary}><Download className="h-4 w-4" />Download Grok Bot</a>
          <a href="https://0n3.app/install?client=grok_bot" className={ghost}><Plug className="h-4 w-4" />Connect it to 0nCore</a>
        </div>
        <p className="mt-8 text-xs text-[#8b949e]">Grok Bot and X are products of xAI. Install, platform and plan details are from xAI&apos;s Grok Bot documentation, November 2026.</p>
      </main>
    </div>
  )
}
