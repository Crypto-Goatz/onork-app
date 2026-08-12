'use client'

/**
 * Downloads — the things you install to use 0nCORE elsewhere.
 *
 * The version and file are read from ONE constant that names the artifact
 * actually served from /public/downloads. public/downloads already carried
 * several extension zips from different eras; a page that hardcodes a version
 * string separately from the file it links to eventually offers v1.4.2 while
 * shipping something else, and nobody notices because both halves look right.
 */
import Link from 'next/link'
import { Chrome, Download, KeyRound } from 'lucide-react'
import AppSidebar from './AppSidebar'

const EXTENSION = {
  name: '0n — AI Command Center',
  version: 'v6.1.0',
  file: '/downloads/0n-extension.zip',
  blurb:
    'LinkedIn lead engine, stack scanner, compose and Jaxx chat — acting in the client you choose. It carries a device key, not a CRM credential, so revoking one browser leaves the rest working.',
}

export default function DownloadsPage() {
  return (
    <div className="oncore-app flex min-h-screen bg-[color:var(--oc-bg)]">
      <AppSidebar current="downloads" activeCount={0} totalCount={0} usageLabel="$0" />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[840px] px-10 py-12">
          <h1 className="text-3xl font-semibold tracking-tight text-[color:var(--oc-ink)]">Downloads</h1>
          <p className="mt-1 text-[13.5px] text-[color:var(--oc-muted)]">
            Install these to use 0nCORE outside this tab.
          </p>

          <div className="mt-8 rounded-2xl border border-[color:var(--oc-border)] bg-[color:var(--oc-card)] p-6 shadow-[var(--oc-shadow-sm)]">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(120deg,#6EE05A_0%,#22c55e_100%)] text-[#0d1117] shadow-glow-sm">
                <Chrome className="h-6 w-6" strokeWidth={2} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-semibold text-[color:var(--oc-ink)]">
                    {EXTENSION.name}
                  </span>
                  <span className="rounded-full bg-[color:var(--oc-green-d)]/12 px-2 py-0.5 font-mono text-[11px] font-medium text-[color:var(--oc-green-d)]">
                    {EXTENSION.version}
                  </span>
                </div>

                <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-[color:var(--oc-muted)]">
                  {EXTENSION.blurb}
                </p>

                <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-relaxed text-[color:var(--oc-muted)]">
                  <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    After installing, get a device key from{' '}
                    <Link href="/crm/setup" className="font-medium text-[color:var(--oc-green-d)] underline underline-offset-2">
                      Setup &amp; Keys
                    </Link>
                    . It is shown once, and can be revoked one browser at a time.
                  </span>
                </p>

                {/* Black pill + neon glow — the Surface B primary. */}
                <a
                  href={EXTENSION.file}
                  download
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--oc-ink)] px-6 py-3 text-[13px] font-semibold text-white shadow-glow-sm transition hover:opacity-90 active:scale-[0.98]"
                >
                  <Download className="h-4 w-4" />
                  Download
                </a>

                <p className="mt-3 text-[12px] text-[color:var(--oc-faint)]">
                  Unzip, then <span className="font-mono">chrome://extensions</span> → Developer mode
                  → Load unpacked. Chromium browsers only.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
