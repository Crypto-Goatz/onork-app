'use client'

/**
 * The Chrome extension banner + install walkthrough, for /hub.
 *
 * WHY THIS IS NOT JUST A DOWNLOAD BUTTON. The extension is NOT published in the
 * Chrome Web Store, so there is no one-click install — the customer has to open
 * chrome://extensions, turn on Developer mode, and Load unpacked. Until today
 * the app linked a Web Store SEARCH url and told people to install from the
 * store, so everyone who followed it landed on a results page for something
 * that does not exist.
 *
 * Prose does not teach this flow. "Open chrome://extensions" is where
 * non-technical people stop reading. So each step animates a small MOCK of the
 * exact control they are hunting for: the address bar typing itself, the
 * Developer-mode switch flipping on, the folder dropping into place. They match
 * a real thing on screen to a picture, instead of parsing a sentence.
 *
 * Everything in here is a mock. Nothing queries Chrome, and nothing claims the
 * extension is installed — we cannot see that from a web page, and a false
 * "Installed" badge is worse than no badge. The only state we keep is whether
 * the customer dismissed the banner.
 *
 * STEP 5 IS THE ONE PEOPLE SKIP, and it is why a fixed build can sit on disk
 * while the old one keeps throwing: Chrome runs the files it already loaded
 * until you press Reload. That cost us three "fixes" that could never reach a
 * browser, so it is called out explicitly rather than left as folklore.
 */

import { useEffect, useState } from 'react'
import {
  Chrome, Download, X, ArrowRight, Check, FolderOpen, MousePointer2,
  RefreshCw, KeyRound, FileArchive, ChevronRight,
} from 'lucide-react'

const DISMISS_KEY = 'on_ext_banner_dismissed'
const ZIP = '/downloads/0n-extension.zip'

/** Bump when the shipped extension changes, so the banner reads honestly. */
const EXT_VERSION = '7.2.2'

type Step = {
  n: number
  title: string
  body: string
  /** The animated mock for this step. */
  visual: React.ReactNode
}

/* ── the little animated mocks ─────────────────────────────────────────── */

function UnzipMock() {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-col items-center gap-1.5 opacity-50">
        <FileArchive className="h-7 w-7 text-white/70" />
        <span className="font-mono text-[10px] text-white/40">.zip</span>
      </div>
      <ChevronRight className="h-4 w-4 text-white/30" />
      <div className="ext-drop flex flex-col items-center gap-1.5">
        <FolderOpen className="h-7 w-7 text-[#6EE05A]" />
        <span className="font-mono text-[10px] text-[#6EE05A]/70">folder</span>
      </div>
    </div>
  )
}

function AddressBarMock() {
  return (
    <div className="w-full max-w-[260px]">
      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-2">
        <Chrome className="h-3.5 w-3.5 shrink-0 text-white/40" />
        {/* Fixed ch width + steps() so the reveal lands on characters. */}
        <span className="ext-type font-mono text-[11px] text-white/85">chrome://extensions</span>
        <span className="ext-caret -ml-1 h-3.5 w-[1.5px] shrink-0 bg-[#6EE05A]" />
      </div>
    </div>
  )
}

function DevModeMock() {
  return (
    <div className="flex w-full max-w-[260px] items-center justify-between rounded-lg border border-white/15 bg-black/40 px-3 py-2.5">
      <span className="text-[11px] text-white/70">Developer mode</span>
      <span className="ext-track relative inline-flex h-4 w-[34px] shrink-0 items-center rounded-full px-0.5">
        <span className="ext-knob h-3 w-3 rounded-full bg-white shadow" />
      </span>
    </div>
  )
}

function LoadUnpackedMock() {
  return (
    <div className="relative w-full max-w-[260px]">
      <div className="flex gap-2">
        <span className="relative overflow-hidden rounded-md border border-[#6EE05A]/50 bg-[#6EE05A]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#6EE05A]">
          Load unpacked
          <span className="ext-sheen absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </span>
        <span className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-white/35">Pack</span>
      </div>
      <MousePointer2 className="ext-cursor absolute -bottom-1 left-[86px] h-4 w-4 text-white drop-shadow" />
    </div>
  )
}

function ConnectMock() {
  return (
    <div className="w-full max-w-[260px] space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-black/40 px-2.5 py-2">
        <KeyRound className="h-3.5 w-3.5 shrink-0 text-white/40" />
        <span className="font-mono text-[10px] tracking-tight text-white/55">0n_live_••••••••••••</span>
      </div>
      <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#6EE05A] py-1.5 text-[11px] font-semibold text-black">
        <Check className="ext-pop h-3.5 w-3.5" /> Connected
      </div>
    </div>
  )
}

function ReloadMock() {
  return (
    <div className="flex w-full max-w-[260px] items-center gap-2.5 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/[0.07] px-3 py-2.5">
      <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-[#f59e0b] [animation-duration:3s]" />
      <span className="text-[11px] leading-snug text-[#f59e0b]">
        Press <span className="font-semibold">Reload</span> after replacing the folder
      </span>
    </div>
  )
}

const STEPS: Step[] = [
  {
    n: 1,
    title: 'Unzip the download',
    body: 'Double-click the file you just downloaded. Keep the folder somewhere permanent — Chrome loads the extension from this folder every time it starts, so deleting it uninstalls the extension.',
    visual: <UnzipMock />,
  },
  {
    n: 2,
    title: 'Open the extensions page',
    body: 'Type chrome://extensions into the address bar and press Enter. Links cannot open this page — Chrome blocks that on purpose, so it has to be typed.',
    visual: <AddressBarMock />,
  },
  {
    n: 3,
    title: 'Turn on Developer mode',
    body: 'The switch is in the top-right corner of that page. It has to be on before the next button appears — that is the whole reason this step exists.',
    visual: <DevModeMock />,
  },
  {
    n: 4,
    title: 'Click "Load unpacked"',
    body: 'It appears at the top-left once Developer mode is on. Choose the folder you unzipped — the folder itself, not a file inside it.',
    visual: <LoadUnpackedMock />,
  },
  {
    n: 5,
    title: 'Paste your token',
    body: 'Click the extension icon in the toolbar, then paste a token from Settings → Chrome Extension. That ties it to your 0n account.',
    visual: <ConnectMock />,
  },
  {
    n: 6,
    title: 'Updating later',
    body: 'Download again, replace the folder, then press Reload on the extension card. Chrome keeps running the files it already loaded until you do — skip this and you will still be on the old version.',
    visual: <ReloadMock />,
  },
]

export default function ExtensionInstall() {
  const [dismissed, setDismissed] = useState(true) // assume hidden until read
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(1)

  // Read dismissal after mount — localStorage on the server is a crash, and
  // rendering the banner then hiding it is a flash of the thing they dismissed.
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
    } catch {
      setDismissed(false)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
  }

  if (dismissed) return null

  const step = STEPS.find((s) => s.n === active) ?? STEPS[0]

  return (
    <section className="overflow-hidden rounded-2xl border border-[#6EE05A]/25 bg-gradient-to-br from-[#6EE05A]/[0.10] via-[#6EE05A]/[0.04] to-transparent">
      {/* ── Banner ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#6EE05A]/30 bg-[#6EE05A]/10">
            <Chrome className="h-6 w-6 text-[#6EE05A]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white">0n — AI Command Center</h3>
              <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[10px] text-white/50">
                v{EXT_VERSION}
              </span>
            </div>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-white/60">
              The Chrome extension. Your account, your tools and your CRM in every tab.
              Takes about a minute to set up — we walk you through it.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={ZIP}
            download
            onClick={() => { setOpen(true); setActive(1) }}
            className="inline-flex items-center gap-2 rounded-full bg-[#6EE05A] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#5cb83a]"
          >
            <Download className="h-4 w-4" /> Download
          </a>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="grid h-9 w-9 place-items-center rounded-full text-white/40 transition hover:bg-white/5 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/*
        The walkthrough opens on the download click, because that is the moment
        the file lands in Downloads and the customer is asking "now what?".
        It is also openable on its own — someone who already downloaded it and
        got lost should not have to download twice to see the steps again.
      */}
      {!open && (
        <div className="border-t border-white/10 px-5 pb-4 pt-3 md:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group inline-flex items-center gap-1.5 text-xs text-white/45 transition hover:text-white/80"
          >
            Already downloaded? See the 6 setup steps
            <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {open && (
        <div className="border-t border-white/10 bg-black/25 p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-white/40">
              Setting it up · not in the Chrome store, so it loads from a folder
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-white/40 transition hover:text-white/70"
            >
              Hide
            </button>
          </div>

          {/* Step rail — numbers, not a progress bar. A bar implies we know
              which step they finished, and we cannot see that. */}
          <div className="flex flex-wrap items-center gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setActive(s.n)}
                aria-current={s.n === active}
                className={
                  s.n === active
                    ? 'h-7 w-7 rounded-full bg-[#6EE05A] text-xs font-bold text-black'
                    : 'h-7 w-7 rounded-full border border-white/15 text-xs font-medium text-white/45 transition hover:border-white/40 hover:text-white/80'
                }
              >
                {s.n}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_280px] md:items-center">
            <div>
              <h4 className="text-sm font-semibold text-white">
                Step {step.n} · {step.title}
              </h4>
              <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/60">{step.body}</p>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={step.n === 1}
                  onClick={() => setActive((n) => Math.max(1, n - 1))}
                  className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 transition enabled:hover:border-white/40 enabled:hover:text-white disabled:opacity-25"
                >
                  Back
                </button>
                {step.n < STEPS.length ? (
                  <button
                    type="button"
                    onClick={() => setActive((n) => Math.min(STEPS.length, n + 1))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
                  >
                    Next <ArrowRight className="h-3 w-3" />
                  </button>
                ) : (
                  <a
                    href="/dashboard/settings/extension"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#6EE05A] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#5cb83a]"
                  >
                    <KeyRound className="h-3 w-3" /> Get a token
                  </a>
                )}
              </div>
            </div>

            {/* The mock. `key` forces a remount per step so the entrance
                animations replay instead of showing a mid-animation frame. */}
            <div
              key={step.n}
              className="grid min-h-[104px] place-items-center rounded-xl border border-white/10 bg-[#0d1117] p-4"
            >
              {step.visual}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
