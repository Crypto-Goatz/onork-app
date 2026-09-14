/** One HTTP probe with a budget. Shared by the ecosystem map and the admin panel. */
export type Probe = { ok: boolean; status: number | null; ms: number; note?: string }

export async function probe(url: string, timeoutMs = 6000): Promise<Probe> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  const t0 = Date.now()
  try {
    const res = await fetch(url, { signal: ctl.signal, redirect: 'manual', cache: 'no-store', headers: { 'user-agent': '0n-ecosystem-probe' } })
    const ms = Date.now() - t0
    // 3xx counts as alive: apex→www redirects are the estate's normal shape.
    return { ok: res.status < 500, status: res.status, ms }
  } catch (e) {
    return { ok: false, status: null, ms: Date.now() - t0, note: e instanceof Error ? e.message : String(e) }
  } finally {
    clearTimeout(timer)
  }
}
