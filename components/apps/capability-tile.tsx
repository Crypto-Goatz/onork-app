'use client'
/**
 * Capability tile — embeddable mini-version of each brain capability for
 * use inside spawned App Factory apps at /apps/<slug>. Each tile knows
 * how to:
 *   - introduce itself (header + icon + tone)
 *   - take a quick input (textarea / form)
 *   - call the capability's /api/<slug>/think endpoint
 *   - render the output inline
 *
 * One file, all capabilities. Switching on the capability slug picks the
 * right input shape + result renderer. This is the working composer mode.
 */
import { useState } from 'react'
import {
  Sparkles, Package, GraduationCap, Shield, Search, Palette, Mic, Mail,
  Activity, ScanLine, Loader2, Send, ExternalLink, Copy, Check,
  type LucideIcon,
} from 'lucide-react'

interface Tile {
  slug: string
  name: string
  desc: string
  icon: LucideIcon
  tone: string
  surface_route: string
}

const REGISTRY: Record<string, Tile> = {
  notes: {
    slug: 'notes', name: 'Notes', desc: 'Drop any thought; brain decides shape.',
    icon: Sparkles, tone: 'emerald', surface_route: '/dashboard/notes',
  },
  service_packager: {
    slug: 'service_packager', name: 'Service Packager', desc: '8 sellable outputs from one input.',
    icon: Package, tone: 'sky', surface_route: '/dashboard/service-packager',
  },
  course_builder: {
    slug: 'course_builder', name: 'Course Builder', desc: 'Conversational AI courses.',
    icon: GraduationCap, tone: 'violet', surface_route: '/dashboard/courses',
  },
  hipaa_scanner: {
    slug: 'hipaa_scanner', name: 'HIPAA Scanner', desc: '63 weighted compliance checks.',
    icon: Shield, tone: 'amber', surface_route: '/dashboard/hipaa',
  },
  cro9_engine: {
    slug: 'cro9_engine', name: 'CRO9 SEO', desc: 'Adaptive SEO scoring.',
    icon: Search, tone: 'sky', surface_route: '/dashboard/cro9-engine',
  },
  brand_builder: {
    slug: 'brand_builder', name: 'Brand Builder', desc: 'Identity + asset generator.',
    icon: Palette, tone: 'rose', surface_route: '/dashboard/brand',
  },
  voice_ai: {
    slug: 'voice_ai', name: 'Voice AI', desc: 'Phone + web voice agents.',
    icon: Mic, tone: 'emerald', surface_route: '/dashboard/voice',
  },
  email_paste: {
    slug: 'email_paste', name: 'Email Generator', desc: 'AI generates an email; tap to copy.',
    icon: Mail, tone: 'sky', surface_route: '/tools/email-paste',
  },
  '0nexec': {
    slug: '0nexec', name: '0nExec', desc: 'Score-based orbits + formulas.',
    icon: Activity, tone: 'violet', surface_route: '/console/exec',
  },
  report_builder: {
    slug: 'report_builder', name: 'Multi-Scanner Reports', desc: 'Run any URL through 13 scanners.',
    icon: ScanLine, tone: 'amber', surface_route: '/dashboard/reports/builder',
  },
}

const TONES: Record<string, { ring: string; bg: string; text: string; gradient: string }> = {
  emerald: {
    ring: 'ring-emerald-500/20',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
  },
  sky: {
    ring: 'ring-sky-500/20',
    bg: 'bg-sky-500/10',
    text: 'text-sky-300',
    gradient: 'from-sky-500/15 via-sky-500/5 to-transparent',
  },
  violet: {
    ring: 'ring-violet-500/20',
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    gradient: 'from-violet-500/15 via-violet-500/5 to-transparent',
  },
  amber: {
    ring: 'ring-amber-500/20',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
  },
  rose: {
    ring: 'ring-rose-500/20',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
  },
}

interface Props {
  capability: string
  /** Optional context passed in from chain mode — output of previous tile */
  contextInput?: string
  /** Called when this tile produces an output, used by chain mode */
  onOutput?: (output: string) => void
  className?: string
}

export function CapabilityTile({ capability, contextInput, onOutput, className }: Props) {
  const tile = REGISTRY[capability]
  if (!tile) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 text-xs text-white/40">
        Unknown capability: <code className="font-mono">{capability}</code>
      </div>
    )
  }
  const Icon = tile.icon
  const tone = TONES[tile.tone] ?? TONES.emerald

  const [input, setInput] = useState(contextInput ?? '')
  const [busy, setBusy] = useState(false)
  const [output, setOutput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function run() {
    if (!input.trim()) return
    setBusy(true)
    setError(null)
    setOutput(null)
    try {
      const r = await fetch('/api/apps/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ capability, prompt: input.trim() }),
      })
      const data = await r.json()
      if (!r.ok || !data.ok) {
        setError(data.error || 'Capability returned an error')
        return
      }
      const text = formatOutput(capability, data.output)
      setOutput(text)
      onOutput?.(text)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className={
        `relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br p-5 backdrop-blur ${tone.gradient} ${
          className ?? ''
        }`
      }
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${tone.bg} ${tone.ring}`}>
            <Icon className={`h-5 w-5 ${tone.text}`} />
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight text-white">{tile.name}</div>
            <div className="text-[11px] text-white/40 leading-relaxed">{tile.desc}</div>
          </div>
        </div>
        <a
          href={tile.surface_route}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-white/40 hover:text-white/80 hover:bg-white/[0.04]"
          title="Open full tool"
        >
          <ExternalLink className="h-3 w-3" /> Full
        </a>
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={inputPlaceholder(capability)}
        rows={3}
        className="w-full rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.20] resize-none"
      />

      <button
        onClick={run}
        disabled={busy || !input.trim()}
        className={`inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
          busy || !input.trim()
            ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
            : `${tone.bg} ${tone.text} ring-1 ${tone.ring} hover:bg-white/[0.08] cursor-pointer active:scale-[0.99]`
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Running…
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" /> Run
          </>
        )}
      </button>

      {/* Output */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          {error}
        </div>
      )}
      {output && (
        <div className="relative rounded-lg border border-white/[0.06] bg-black/30 p-3 text-[11px] leading-relaxed text-white/80">
          <button
            onClick={copy}
            className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-md bg-white/[0.06] px-2 py-1 text-[10px] text-white/60 hover:bg-white/[0.10] hover:text-white"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
          <pre className="whitespace-pre-wrap break-words pr-12 font-sans">{output}</pre>
        </div>
      )}
    </div>
  )
}

function inputPlaceholder(slug: string): string {
  switch (slug) {
    case 'notes': return 'A thought, a list, a half-baked idea…'
    case 'service_packager': return 'Describe the service you sell…'
    case 'course_builder': return 'What course do you want to build?'
    case 'hipaa_scanner': return 'Domain to scan, e.g. example.com'
    case 'cro9_engine': return 'URL to audit + target keyword'
    case 'brand_builder': return 'Describe your brand vision…'
    case 'voice_ai': return 'What should the voice agent know about?'
    case 'email_paste': return 'Goal of the email (e.g. promote our HIPAA service)'
    case '0nexec': return 'Describe the formula or orbit you want…'
    case 'report_builder': return 'URL to scan'
    default: return 'Describe what you want…'
  }
}

function formatOutput(slug: string, output: unknown): string {
  if (typeof output === 'string') return output
  if (!output) return '(no output)'
  if (typeof output === 'object') {
    // Capability-specific friendly formatters
    const o = output as Record<string, unknown>
    if (slug === 'email_paste' && o.email && typeof o.email === 'object') {
      const e = o.email as Record<string, string>
      return [
        e.subject ? `Subject: ${e.subject}` : '',
        e.to ? `To: ${e.to}` : '',
        e.body ? `\n${e.body}` : '',
      ].filter(Boolean).join('\n')
    }
    if (typeof o.text === 'string') return o.text
    if (typeof o.message === 'string') return o.message
    if (typeof o.summary === 'string') return o.summary
    return JSON.stringify(output, null, 2)
  }
  return String(output)
}
