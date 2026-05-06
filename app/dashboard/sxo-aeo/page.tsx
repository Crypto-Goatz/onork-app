"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Download, Loader2, ExternalLink } from "lucide-react"

interface ScanRow {
  id: string
  url: string
  domain: string
  combined_score: number
  sxo_score: number
  aeo_score: number
  created_at: string
}

interface ScanResult {
  scanId: string
  url: string
  domain: string
  pageTitle: string
  combinedScore: number
  combinedGrade: string
  sxoScore: number
  sxoGrade: string
  sxoBreakdown: { seo: number; ux: number; cro: number; geo: number }
  aeoScore: number
  aeoGrade: string
  aeoFactors: Record<string, number>
}

const AEO_LABELS: Record<string, string> = {
  bluf: "BLUF",
  definition: "Definition",
  procedure: "Procedure",
  comparison: "Comparison",
  faq: "FAQ",
  authorEEAT: "E-E-A-T",
  freshness: "Freshness",
  schema: "Schema",
  informationGain: "Info Gain",
  specificity: "Specificity",
}

function gradeColor(score: number) {
  if (score >= 90) return "text-emerald-400"
  if (score >= 80) return "text-blue-400"
  if (score >= 70) return "text-cyan-400"
  if (score >= 60) return "text-amber-400"
  return "text-rose-400"
}

function Bar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
      <div className="h-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400" style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function SxoAeoPage() {
  const [url, setUrl] = useState("")
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ScanRow[]>([])

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/sxo-aeo/history")
      if (res.ok) {
        const { scans } = await res.json()
        setHistory(scans || [])
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const runScan = async () => {
    if (!url.trim()) return
    setScanning(true)
    setError(null)
    try {
      const res = await fetch("/api/sxo-aeo/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || "Scan failed")
      }
      const data = await res.json()
      setResult(data)
      loadHistory()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SXO + AEO Scanner</h1>
        <p className="text-sm text-white/60 mt-1">
          Free internal access. Same engine as sxowebsite.com — runs the live page through both axes and gives you the full markup pack.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur p-5">
        <div className="flex gap-2">
          <input
            placeholder="https://yourdomain.com/page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runScan()}
            className="flex-1 h-12 rounded-lg bg-black/40 border border-white/10 px-4 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/60"
          />
          <button
            onClick={runScan}
            disabled={scanning || !url.trim()}
            className="h-12 px-6 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-white flex items-center gap-2 disabled:opacity-50"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {scanning ? "Scanning…" : "Scan"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-400 mt-3">{error}</p>}
      </div>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4">
              <p className="text-xs uppercase text-white/60">Combined</p>
              <p className={`text-4xl font-bold ${gradeColor(result.combinedScore)}`}>{result.combinedScore}</p>
              <Bar value={result.combinedScore} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/60">SXO</p>
              <p className={`text-4xl font-bold ${gradeColor(result.sxoScore)}`}>{result.sxoScore}</p>
              <Bar value={result.sxoScore} />
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase text-white/60">AEO</p>
              <p className={`text-4xl font-bold ${gradeColor(result.aeoScore)}`}>{result.aeoScore}</p>
              <Bar value={result.aeoScore} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
              <h2 className="font-semibold">SXO pillars</h2>
              {(["seo", "ux", "cro", "geo"] as const).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <span className="w-12 text-xs uppercase text-white/50">{k}</span>
                  <div className="flex-1"><Bar value={result.sxoBreakdown[k]} /></div>
                  <span className={`w-10 text-right text-sm font-mono ${gradeColor(result.sxoBreakdown[k])}`}>{result.sxoBreakdown[k]}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2">
              <h2 className="font-semibold">AEO dimensions</h2>
              {Object.entries(result.aeoFactors).map(([k, v]) => {
                const score100 = Math.round((v as number) * 100)
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className="w-24 text-xs text-white/60">{AEO_LABELS[k] || k}</span>
                    <div className="flex-1"><Bar value={score100} /></div>
                    <span className={`w-10 text-right text-sm font-mono ${gradeColor(score100)}`}>{score100}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <a
            href={`/api/sxo-aeo/markdown/${result.scanId}`}
            className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-white font-medium"
          >
            <Download className="h-4 w-4" /> Download .md report
          </a>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h2 className="font-semibold text-sm uppercase text-white/60 mb-3">Recent scans</h2>
          <div className="space-y-2">
            {history.slice(0, 10).map((r) => (
              <div key={r.id} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.domain}</p>
                  <p className="text-xs text-white/50 truncate">{r.url}</p>
                </div>
                <div className="hidden sm:flex gap-3 text-xs">
                  <span className={gradeColor(r.combined_score)}>combined {r.combined_score}</span>
                  <span className={gradeColor(r.sxo_score)}>SXO {r.sxo_score}</span>
                  <span className={gradeColor(r.aeo_score)}>AEO {r.aeo_score}</span>
                </div>
                <a
                  href={`/api/sxo-aeo/markdown/${r.id}`}
                  className="h-9 w-9 grid place-items-center rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
                  title="Download .md"
                >
                  <Download className="h-4 w-4" />
                </a>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 w-9 grid place-items-center rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
                  title="Visit"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
