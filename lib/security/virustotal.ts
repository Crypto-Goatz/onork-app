/**
 * VirusTotal v3 client — URL + file-hash scanning for the registry install gate.
 *
 * Requires VIRUSTOTAL_API_KEY (free tier: 4 req/min, 500/day, plenty for a
 * registry of ~100 items refreshing weekly).
 *
 * Two scan paths used here:
 *   1. URL scan       → POST /urls            → analysis URL
 *   2. File-hash scan → GET  /files/{sha256}  → already-known reports only
 *
 * URL scans are async — the API returns an analysis id; you poll
 * /analyses/{id} until status === 'completed'. We poll up to 10× with a 2s
 * backoff; if not finished, we leave the scan as `pending` and the caller
 * re-checks later.
 */

const VT_BASE = 'https://www.virustotal.com/api/v3'

export interface ScanVerdict {
  status: 'passed' | 'flagged' | 'error' | 'pending' | 'skipped'
  engines_total: number
  engines_flagged: number
  threat_categories: string[]
  raw: unknown
  reason?: string
}

function getKey(): string | null {
  return process.env.VIRUSTOTAL_API_KEY || null
}

function headers(): Record<string, string> {
  const key = getKey()
  return {
    'x-apikey': key || '',
    'Content-Type': 'application/json',
  }
}

function urlIdentifier(url: string): string {
  // VT's identifier for a URL is its url-safe base64 sha256, but the API
  // also accepts the urlsafe-b64 of the URL itself. We use the URL-safe
  // base64 of the URL (no padding).
  const enc =
    typeof Buffer !== 'undefined'
      ? Buffer.from(url, 'utf-8').toString('base64')
      : btoa(url)
  return enc.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function summarizeStats(
  stats: Record<string, number> | undefined,
  results: Record<string, { category?: string; result?: string }> | undefined,
): { engines_total: number; engines_flagged: number; threat_categories: string[] } {
  const malicious = stats?.malicious ?? 0
  const suspicious = stats?.suspicious ?? 0
  const harmless = stats?.harmless ?? 0
  const undetected = stats?.undetected ?? 0
  const timeout = stats?.timeout ?? 0
  const engines_total = malicious + suspicious + harmless + undetected + timeout
  const engines_flagged = malicious + suspicious

  const cats = new Set<string>()
  if (results) {
    for (const r of Object.values(results)) {
      if (r.category === 'malicious' || r.category === 'suspicious') {
        if (r.result) cats.add(r.result)
      }
    }
  }
  return { engines_total, engines_flagged, threat_categories: Array.from(cats) }
}

function verdictFromStats(stats: ReturnType<typeof summarizeStats>): 'passed' | 'flagged' {
  // Threshold: any malicious or 2+ suspicious flips to `flagged`.
  if (stats.engines_flagged === 0) return 'passed'
  return 'flagged'
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function scanUrl(url: string, opts?: { pollMs?: number; maxPolls?: number }): Promise<ScanVerdict> {
  if (!getKey()) {
    return {
      status: 'skipped',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: 'VIRUSTOTAL_API_KEY not set',
    }
  }

  // 1. Try existing analysis first (free hit if anyone scanned this URL recently)
  const id = urlIdentifier(url)
  try {
    const existing = await fetch(`${VT_BASE}/urls/${id}`, { headers: headers() })
    if (existing.ok) {
      const body = (await existing.json()) as {
        data?: { attributes?: { last_analysis_stats?: Record<string, number>; last_analysis_results?: Record<string, { category?: string; result?: string }> } }
      }
      const stats = summarizeStats(
        body.data?.attributes?.last_analysis_stats,
        body.data?.attributes?.last_analysis_results,
      )
      if (stats.engines_total > 0) {
        return { status: verdictFromStats(stats), ...stats, raw: body }
      }
    }
  } catch {
    // fall through to fresh scan
  }

  // 2. Submit fresh scan
  let analysisId: string | null = null
  try {
    const submit = await fetch(`${VT_BASE}/urls`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(url)}`,
    })
    if (!submit.ok) {
      const text = await submit.text()
      return {
        status: 'error',
        engines_total: 0,
        engines_flagged: 0,
        threat_categories: [],
        raw: { status: submit.status, text },
        reason: `submit failed: ${submit.status}`,
      }
    }
    const body = (await submit.json()) as { data?: { id?: string } }
    analysisId = body.data?.id || null
  } catch (err) {
    return {
      status: 'error',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: err instanceof Error ? err.message : 'submit threw',
    }
  }

  if (!analysisId) {
    return {
      status: 'error',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: 'no analysis id returned',
    }
  }

  // 3. Poll the analysis
  const pollMs = opts?.pollMs ?? 2000
  const maxPolls = opts?.maxPolls ?? 10
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, pollMs))
    try {
      const poll = await fetch(`${VT_BASE}/analyses/${analysisId}`, { headers: headers() })
      if (!poll.ok) continue
      const body = (await poll.json()) as {
        data?: { attributes?: { status?: string; stats?: Record<string, number>; results?: Record<string, { category?: string; result?: string }> } }
      }
      if (body.data?.attributes?.status === 'completed') {
        const stats = summarizeStats(body.data.attributes.stats, body.data.attributes.results)
        return { status: verdictFromStats(stats), ...stats, raw: body }
      }
    } catch {
      // keep polling
    }
  }

  return {
    status: 'pending',
    engines_total: 0,
    engines_flagged: 0,
    threat_categories: [],
    raw: { analysisId },
    reason: 'analysis still running — re-check later',
  }
}

export async function scanFileBySha256(sha256: string): Promise<ScanVerdict> {
  if (!getKey()) {
    return {
      status: 'skipped',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: 'VIRUSTOTAL_API_KEY not set',
    }
  }
  if (!/^[a-f0-9]{64}$/i.test(sha256)) {
    return {
      status: 'error',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: 'invalid sha256',
    }
  }
  try {
    const res = await fetch(`${VT_BASE}/files/${sha256}`, { headers: headers() })
    if (res.status === 404) {
      // No prior report — for free tier we don't auto-upload (1MB-only)
      return {
        status: 'pending',
        engines_total: 0,
        engines_flagged: 0,
        threat_categories: [],
        raw: null,
        reason: 'no prior report — submit file separately',
      }
    }
    if (!res.ok) {
      return {
        status: 'error',
        engines_total: 0,
        engines_flagged: 0,
        threat_categories: [],
        raw: null,
        reason: `vt ${res.status}`,
      }
    }
    const body = (await res.json()) as {
      data?: { attributes?: { last_analysis_stats?: Record<string, number>; last_analysis_results?: Record<string, { category?: string; result?: string }> } }
    }
    const stats = summarizeStats(
      body.data?.attributes?.last_analysis_stats,
      body.data?.attributes?.last_analysis_results,
    )
    if (stats.engines_total === 0) {
      return {
        status: 'pending',
        engines_total: 0,
        engines_flagged: 0,
        threat_categories: [],
        raw: body,
        reason: 'no engines reported yet',
      }
    }
    return { status: verdictFromStats(stats), ...stats, raw: body }
  } catch (err) {
    return {
      status: 'error',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: err instanceof Error ? err.message : 'scan threw',
    }
  }
}
