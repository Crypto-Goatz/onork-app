'use client'

/**
 * The 0nCore business profile.
 *
 * This is the record the whole ecosystem reads from — the thing that makes
 * "it's already configured to your brand" true rather than a slogan. So the
 * page has two jobs: make filling it in feel worth doing, and make the payoff
 * immediate.
 *
 * The completeness meter is the honest version of a progress bar: it is
 * weighted by what generation actually depends on, and the missing list names
 * the specific fields, so "62%" is actionable instead of nagging.
 *
 * When generation refuses, the refusal is shown as a checklist of what to add —
 * not an error. The refusal is a feature: the alternative is a fabricated
 * career history published under a real person's name.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Building2, User, Sparkles, Save, Plus, Trash2, Check, Loader2,
  AlertCircle, Copy, Star, Linkedin, Image as ImageIcon, FileText,
} from 'lucide-react'

interface Profile {
  [k: string]: unknown
  trading_name?: string | null
  legal_name?: string | null
  tagline?: string | null
  industry?: string | null
  founded_year?: number | null
  company_size?: string | null
  short_description?: string | null
  long_description?: string | null
  value_proposition?: string | null
  target_audience?: string | null
  differentiators?: string[] | null
  website?: string | null
  email?: string | null
  phone?: string | null
  city?: string | null
  region?: string | null
  country?: string | null
  logo_url?: string | null
  colors?: Record<string, string> | null
  brand_voice?: string | null
}

interface Person {
  id?: string
  full_name: string
  role_title?: string | null
  email?: string | null
  linkedin_url?: string | null
  bio_short?: string | null
  headshot_url?: string | null
  is_primary?: boolean
}

interface Completeness {
  percent: number
  missing: { label: string; weight: number }[]
}

const GENERATORS = [
  {
    tool: 'write_linkedin_personal',
    input: 'Write my LinkedIn About section.',
    label: 'LinkedIn profile',
    hint: 'The About section, in first person',
    icon: Linkedin,
    needsPerson: true,
  },
  {
    tool: 'write_linkedin_company',
    input: 'Write the LinkedIn company page About section.',
    label: 'Company page',
    hint: 'Your LinkedIn company About',
    icon: Building2,
    needsPerson: false,
  },
  {
    tool: 'write_company_boilerplate',
    input: 'Write our company boilerplate.',
    label: 'Boilerplate',
    hint: 'The paragraph that ends a press release',
    icon: FileText,
    needsPerson: false,
  },
  {
    tool: 'write_cover_image_brief',
    input: 'Write an art direction brief for our LinkedIn cover image.',
    label: 'Cover image brief',
    hint: 'Art direction, in your brand colours',
    icon: ImageIcon,
    needsPerson: false,
  },
] as const

const label = 'text-xs font-medium text-[#8b949e] mb-1.5 block'
const field =
  'bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 w-full text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:border-[#6EE05A] focus:ring-1 focus:ring-[#6EE05A]/20 focus:outline-none transition-colors duration-150'
const card = 'bg-[#161b22] border border-[#30363d] rounded-xl p-5'

/**
 * Meter width as a static Tailwind class.
 *
 * No inline styles anywhere in this repo, so the width cannot be interpolated —
 * Tailwind only emits classes it can see as complete literals at build time.
 * Bucketing to 5% is plenty of resolution for a completeness bar and keeps every
 * class a real string in the source.
 */
const BAR_WIDTHS = [
  'w-0', 'w-[5%]', 'w-[10%]', 'w-[15%]', 'w-[20%]', 'w-[25%]', 'w-[30%]',
  'w-[35%]', 'w-[40%]', 'w-[45%]', 'w-[50%]', 'w-[55%]', 'w-[60%]', 'w-[65%]',
  'w-[70%]', 'w-[75%]', 'w-[80%]', 'w-[85%]', 'w-[90%]', 'w-[95%]', 'w-full',
]
function barWidth(percent: number): string {
  const i = Math.round(Math.min(100, Math.max(0, percent)) / 5)
  return BAR_WIDTHS[i]
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile>({})
  const [people, setPeople] = useState<Person[]>([])
  const [meter, setMeter] = useState<Completeness>({ percent: 0, missing: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const [busyTool, setBusyTool] = useState<string | null>(null)
  const [result, setResult] = useState<{ tool: string; text: string; for?: string } | null>(null)
  const [blocked, setBlocked] = useState<{ tool: string; add: string[] } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const r = await fetch('/api/business-profile', { cache: 'no-store' })
    if (r.ok) {
      const d = await r.json()
      setProfile(d.profile ?? {})
      setPeople(d.people ?? [])
      setMeter(d.completeness ?? { percent: 0, missing: [] })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const set = (k: keyof Profile, v: unknown) => setProfile((p) => ({ ...p, [k]: v }))

  async function save() {
    setSaving(true)
    const r = await fetch('/api/business-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    if (r.ok) {
      const d = await r.json()
      setMeter(d.completeness)
      setSavedAt(new Date().toLocaleTimeString())
    }
    setSaving(false)
  }

  async function savePerson(p: Person) {
    const r = await fetch('/api/business-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    })
    if (r.ok) load()
  }

  async function removePerson(id?: string) {
    if (!id) return
    await fetch(`/api/business-profile?person_id=${id}`, { method: 'DELETE' })
    load()
  }

  async function generate(tool: string, input: string) {
    setBusyTool(tool)
    setResult(null)
    setBlocked(null)
    const r = await fetch('/api/business-profile/think', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, tool_hint: tool }),
    })
    const d = await r.json().catch(() => ({}))
    const out = d?.output ?? {}
    if (out.add_these) setBlocked({ tool, add: out.add_these as string[] })
    else if (out.text) setResult({ tool, text: out.text as string, for: out.generated_for })
    else setBlocked({ tool, add: [out.error || 'That did not work. Try again in a moment.'] })
    setBusyTool(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="h-8 w-64 bg-[#161b22] rounded animate-pulse" />
          <div className="h-40 bg-[#161b22] rounded-xl animate-pulse" />
          <div className="h-64 bg-[#161b22] rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] font-sans">
      <main className="max-w-5xl mx-auto px-4 py-6 md:px-6 md:py-8 space-y-8">
        {/* Header + the meter */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#e6edf3]">
              Business profile
            </h1>
            <p className="text-sm text-[#c9d1d9] leading-relaxed mt-2 max-w-2xl">
              Enter your company once. Every 0n app reads from here — and so does
              the writing below, which is why what you fill in is what you get out.
            </p>
          </div>

          <div className={card}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-medium text-[#e6edf3]">
                {meter.percent}% complete
              </span>
              {savedAt && (
                <span className="text-xs text-[#8b949e] inline-flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#6EE05A]" /> Saved {savedAt}
                </span>
              )}
            </div>
            <div className="h-1.5 bg-[#0d1117] rounded-full overflow-hidden">
              <div
                className={`h-full bg-[#6EE05A] rounded-full transition-all duration-400 ease-in-out ${barWidth(meter.percent)}`}
              />
            </div>
            {meter.missing.length > 0 && (
              <p className="text-xs text-[#8b949e] mt-3">
                Still missing:{' '}
                {meter.missing.slice(0, 4).map((m) => m.label).join(' · ')}
                {meter.missing.length > 4 && ` · +${meter.missing.length - 4} more`}
              </p>
            )}
          </div>
        </div>

        {/* The company */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-[#e6edf3] inline-flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#6EE05A]" /> The company
          </h2>

          <div className={card}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Business name</label>
                <input
                  className={field}
                  value={(profile.trading_name as string) ?? ''}
                  onChange={(e) => set('trading_name', e.target.value)}
                  placeholder="Acme Dental"
                />
              </div>
              <div>
                <label className={label}>Legal name (if different)</label>
                <input
                  className={field}
                  value={(profile.legal_name as string) ?? ''}
                  onChange={(e) => set('legal_name', e.target.value)}
                  placeholder="Acme Dental Group LLC"
                />
              </div>
              <div>
                <label className={label}>Industry</label>
                <input
                  className={field}
                  value={(profile.industry as string) ?? ''}
                  onChange={(e) => set('industry', e.target.value)}
                  placeholder="Dentistry"
                />
              </div>
              <div>
                <label className={label}>Team size</label>
                <input
                  className={field}
                  value={(profile.company_size as string) ?? ''}
                  onChange={(e) => set('company_size', e.target.value)}
                  placeholder="11-50"
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>Tagline</label>
                <input
                  className={field}
                  value={(profile.tagline as string) ?? ''}
                  onChange={(e) => set('tagline', e.target.value)}
                  placeholder="Modern dentistry, without the wait."
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>What you do, in one sentence</label>
                <textarea
                  className={`${field} min-h-20`}
                  value={(profile.short_description as string) ?? ''}
                  onChange={(e) => set('short_description', e.target.value)}
                  placeholder="We're a family dental practice in Ligonier offering preventive, cosmetic and emergency care."
                />
                <p className="text-xs text-[#8b949e] mt-1.5">
                  This one carries the most weight — nearly everything below is
                  written from it.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className={label}>Why people choose you</label>
                <textarea
                  className={`${field} min-h-20`}
                  value={(profile.value_proposition as string) ?? ''}
                  onChange={(e) => set('value_proposition', e.target.value)}
                  placeholder="Same-week appointments, transparent pricing, and no upselling."
                />
              </div>
              <div>
                <label className={label}>Who you serve</label>
                <input
                  className={field}
                  value={(profile.target_audience as string) ?? ''}
                  onChange={(e) => set('target_audience', e.target.value)}
                  placeholder="Families in Westmoreland County"
                />
              </div>
              <div>
                <label className={label}>Founded</label>
                <input
                  className={field}
                  type="number"
                  value={(profile.founded_year as number) ?? ''}
                  onChange={(e) =>
                    set('founded_year', e.target.value ? Number(e.target.value) : null)
                  }
                  placeholder="2014"
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>What makes you different</label>
                <input
                  className={field}
                  value={(profile.differentiators ?? []).join(', ')}
                  onChange={(e) =>
                    set(
                      'differentiators',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    )
                  }
                  placeholder="Comma separated — e.g. Saturday hours, in-house lab, no-interest plans"
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>The longer story</label>
                <textarea
                  className={`${field} min-h-28`}
                  value={(profile.long_description as string) ?? ''}
                  onChange={(e) => set('long_description', e.target.value)}
                  placeholder="A few paragraphs on how you started and where you're headed."
                />
              </div>
            </div>
          </div>

          <div className={card}>
            <h3 className="text-base font-medium text-[#e6edf3] mb-4">
              Contact and brand
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Website</label>
                <input
                  className={field}
                  value={(profile.website as string) ?? ''}
                  onChange={(e) => set('website', e.target.value)}
                  placeholder="https://acmedental.com"
                />
              </div>
              <div>
                <label className={label}>Email</label>
                <input
                  className={field}
                  value={(profile.email as string) ?? ''}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="hello@acmedental.com"
                />
              </div>
              <div>
                <label className={label}>Phone</label>
                <input
                  className={field}
                  value={(profile.phone as string) ?? ''}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="(724) 555-0100"
                />
              </div>
              <div>
                <label className={label}>City</label>
                <input
                  className={field}
                  value={(profile.city as string) ?? ''}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="Ligonier"
                />
              </div>
              <div>
                <label className={label}>State / region</label>
                <input
                  className={field}
                  value={(profile.region as string) ?? ''}
                  onChange={(e) => set('region', e.target.value)}
                  placeholder="PA"
                />
              </div>
              <div>
                <label className={label}>Country</label>
                <input
                  className={field}
                  value={(profile.country as string) ?? ''}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="United States"
                />
              </div>
              <div>
                <label className={label}>Logo URL</label>
                <input
                  className={field}
                  value={(profile.logo_url as string) ?? ''}
                  onChange={(e) => set('logo_url', e.target.value)}
                  placeholder="https://…/logo.svg"
                />
              </div>
              <div>
                <label className={label}>Primary brand colour</label>
                <input
                  className={field}
                  value={(profile.colors as Record<string, string>)?.primary ?? ''}
                  onChange={(e) =>
                    set('colors', {
                      ...((profile.colors as Record<string, string>) ?? {}),
                      primary: e.target.value,
                    })
                  }
                  placeholder="#6EE05A"
                />
              </div>
              <div className="md:col-span-2">
                <label className={label}>How you sound</label>
                <input
                  className={field}
                  value={(profile.brand_voice as string) ?? ''}
                  onChange={(e) => set('brand_voice', e.target.value)}
                  placeholder="Warm and direct. Plain English. Never salesy."
                />
              </div>
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 inline-flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save profile
          </button>
        </section>

        {/* People */}
        <PeopleSection
          people={people}
          onSave={savePerson}
          onRemove={removePerson}
        />

        {/* Generation */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-[#e6edf3] inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#6EE05A]" /> Write it for me
            </h2>
            <p className="text-sm text-[#c9d1d9] leading-relaxed mt-2 max-w-2xl">
              Written only from what you entered above. If something needed is
              missing, you get a list of what to add instead of a made-up answer.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {GENERATORS.map((g) => {
              const Icon = g.icon
              const busy = busyTool === g.tool
              return (
                <button
                  key={g.tool}
                  onClick={() => generate(g.tool, g.input)}
                  disabled={Boolean(busyTool)}
                  className="text-left bg-[#161b22] border border-[#30363d] rounded-xl p-5 hover:border-[#484f58] hover:bg-[#1c2128] hover:translate-y-[-1px] hover:shadow-lg hover:shadow-black/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start justify-between">
                    <Icon className="w-5 h-5 text-[#6EE05A]" />
                    {busy && <Loader2 className="w-4 h-4 animate-spin text-[#8b949e]" />}
                  </div>
                  <p className="text-base font-medium text-[#e6edf3] mt-3">{g.label}</p>
                  <p className="text-xs text-[#8b949e] mt-1">{g.hint}</p>
                </button>
              )
            })}
          </div>

          {blocked && (
            <div className="bg-[#161b22] border border-[#fbbf24]/30 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#fbbf24] shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-base font-medium text-[#e6edf3]">
                    Add these first
                  </p>
                  <p className="text-sm text-[#c9d1d9] leading-relaxed">
                    Anything missing would have to be invented — and this ends up
                    on a public profile under a real name.
                  </p>
                  <ul className="space-y-1.5 pt-1">
                    {blocked.add.map((b) => (
                      <li key={b} className="text-sm text-[#c9d1d9] flex gap-2">
                        <span className="text-[#fbbf24]">·</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className={card}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#8b949e]">
                  {result.for ? `For ${result.for}` : 'Generated from your profile'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.text)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 inline-flex items-center gap-1.5"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#6EE05A]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-sm text-[#c9d1d9] leading-relaxed whitespace-pre-wrap">
                {result.text}
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

// ── People ──────────────────────────────────────────────────

function PeopleSection({
  people,
  onSave,
  onRemove,
}: {
  people: Person[]
  onSave: (p: Person) => void
  onRemove: (id?: string) => void
}) {
  const [draft, setDraft] = useState<Person | null>(null)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#e6edf3] inline-flex items-center gap-2">
          <User className="w-5 h-5 text-[#6EE05A]" /> The people
        </h2>
        <button
          onClick={() => setDraft({ full_name: '', is_primary: people.length === 0 })}
          className="bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98] inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add someone
        </button>
      </div>

      {people.length === 0 && !draft && (
        <div className={`${card} text-center`}>
          <p className="text-sm text-[#c9d1d9]">
            No one added yet. Add yourself first — the LinkedIn profile writer
            uses whoever is marked primary.
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {people.map((p) => (
          <div key={p.id} className={`${card} relative`}>
            {p.is_primary && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-[#6EE05A]/10 text-[#6EE05A] text-xs font-medium px-2.5 py-0.5 rounded-full">
                <Star className="w-3 h-3" /> Primary
              </span>
            )}
            <p className="text-base font-medium text-[#e6edf3] pr-20">{p.full_name}</p>
            <p className="text-xs text-[#8b949e] mt-1">
              {p.role_title || 'No role set'}
            </p>
            {p.bio_short && (
              <p className="text-sm text-[#c9d1d9] leading-relaxed mt-3">{p.bio_short}</p>
            )}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setDraft(p)}
                className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
              >
                Edit
              </button>
              {!p.is_primary && (
                <button
                  onClick={() => onSave({ ...p, is_primary: true })}
                  className="text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150"
                >
                  Make primary
                </button>
              )}
              <button
                onClick={() => onRemove(p.id)}
                aria-label={`Remove ${p.full_name}`}
                className="ml-auto text-[#8b949e] hover:text-[#f87171] hover:bg-[#21262d] rounded-lg p-2 transition-all duration-150"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <div className={card}>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Full name</label>
              <input
                className={field}
                value={draft.full_name}
                onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                placeholder="Jane Okafor"
              />
            </div>
            <div>
              <label className={label}>Role</label>
              <input
                className={field}
                value={draft.role_title ?? ''}
                onChange={(e) => setDraft({ ...draft, role_title: e.target.value })}
                placeholder="Founder & Clinical Director"
              />
              <p className="text-xs text-[#8b949e] mt-1.5">
                Required to write their profile — without it the bio would be
                guessing at their job.
              </p>
            </div>
            <div>
              <label className={label}>Email</label>
              <input
                className={field}
                value={draft.email ?? ''}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                placeholder="jane@acmedental.com"
              />
            </div>
            <div>
              <label className={label}>LinkedIn URL</label>
              <input
                className={field}
                value={draft.linkedin_url ?? ''}
                onChange={(e) => setDraft({ ...draft, linkedin_url: e.target.value })}
                placeholder="https://linkedin.com/in/…"
              />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Anything true about them worth including</label>
              <textarea
                className={`${field} min-h-20`}
                value={draft.bio_short ?? ''}
                onChange={(e) => setDraft({ ...draft, bio_short: e.target.value })}
                placeholder="Qualifications, years in the field, what they focus on. Only real facts — this is what the bio is built from."
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={() => {
                if (!draft.full_name.trim()) return
                onSave(draft)
                setDraft(null)
              }}
              className="bg-[#6EE05A] text-[#0d1117] font-medium rounded-lg px-4 py-2 text-sm hover:bg-[#5bc74a] transition-all duration-150 active:scale-[0.98]"
            >
              Save person
            </button>
            <button
              onClick={() => setDraft(null)}
              className="bg-[#21262d] text-[#c9d1d9] border border-[#30363d] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#30363d] hover:text-[#e6edf3] transition-all duration-150 active:scale-[0.98]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
