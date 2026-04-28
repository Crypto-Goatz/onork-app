# SXO Auto-Indexer — Build the engine that ships 900 URLs to Bing, Yandex, Naver, and Seznam in 1.08 seconds

> **The pitch:** every site you ship needs to land in search indexes the day it goes live. The SXO Auto-Indexer is a daily cron that reads every domain's `sitemap.xml`, filters to the URLs each engine actually cares about, and submits them to the IndexNow protocol — Bing + Yandex + Naver + Seznam in a single batched POST. We run it across 10 of our own domains daily; you can ship the same engine as a billable add-on by the end of one build session.

| | |
|---|---|
| **Build time** | ~1 session |
| **Revenue** | $19 – $199 / month per site |
| **Key product** | SXO Auto-Indexer add-on |
| **Course** | Build an SEO Tool That Actually Fixes Things |

---

## Why this exists

Search engines crawl on their own clock. Bing might come back to your sitemap once a week. Yandex less. Naver and Seznam are even slower. **IndexNow** — an open protocol Microsoft, Yandex, Naver, and Seznam all support — flips that around: you tell them exactly which URLs changed and they index within 24 hours.

The catch is most sites either:

- Don't know IndexNow exists, or
- Implement it once and forget it (so new pages still wait on the slow crawl), or
- Try to roll it themselves and trip over the strict per-host rules (return 422 if the URL list contains a host other than the declared one).

The Auto-Indexer ships it as a **daily cron** that runs unattended — and as a **per-site billable add-on** so every customer site you build gets indexed automatically.

---

## What you're building

A Vercel cron at `09:00 UTC daily` that:

1. Iterates a list of customer domains
2. Fetches each domain's `sitemap.xml`
3. Strict-filters URLs to only that domain's host (this is the gotcha — supersite sitemaps that cover multiple hosts get rejected as `InvalidRequestParameters` if you don't filter)
4. POSTs the URL batch to `https://api.indexnow.org/indexnow` once per domain
5. Returns a JSON summary that surfaces in Vercel logs for daily review

Bing, Yandex, Naver, and Seznam all share the same IndexNow endpoint and the same single key file (`<key>.txt` at site root) — one submission, four indexes.

---

## Build the engine

### 1. Generate the IndexNow key

The key is any 8–128 character hex string. We use the same one across every site we operate so it's easy to verify ownership in bulk:

```text
9d9930798d75952dec01943d70efdffb
```

Drop it as `public/<key>.txt` on every domain. The file's content is just the key itself. Bing reads `https://yoursite.com/<key>.txt` to confirm you own the host before accepting submissions.

### 2. Add the daily cron route

`app/api/cron/indexnow-daily/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const INDEXNOW_KEY = '9d9930798d75952dec01943d70efdffb'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

const DOMAINS: Array<{ host: string }> = [
  { host: 'rocketadd.com' },
  { host: 'mcpfed.com' },
  { host: 'rocketopp.com' },
  { host: 'command.rocketclients.com' },
  { host: 'rocketpost.co' },
  { host: 'cro9.com' },
  { host: 'wpsxo.com' },
  { host: 'www.0nmcp.com' },
  { host: '0ncore.com' },
  { host: 'sxowebsite.com' },
]

function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get('x-vercel-cron') === '1') return true
  const auth = req.headers.get('authorization') || ''
  const secret = process.env.CRON_SECRET
  return Boolean(secret && auth === `Bearer ${secret}`)
}

async function fetchSitemapUrls(host: string): Promise<string[]> {
  const res = await fetch(`https://${host}/sitemap.xml`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'IndexNow-Daily-Submitter/1.0' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`)
  const xml = await res.text()
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || []
  // Strict per-host filter — IndexNow returns 422 if the urlList
  // contains URLs from any other host than the declared host.
  const hostHttps = `https://${host}/`
  const hostHttpsRoot = `https://${host}`
  return matches
    .map(m => m.replace(/<\/?loc>/g, '').trim())
    .filter(u => u.length > 0 && (u.startsWith(hostHttps) || u === hostHttpsRoot))
}

async function submitToIndexNow(host: string, urls: string[]) {
  if (urls.length === 0) return { status: 204, body: 'no urls' }
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: urls.slice(0, 10000),
  }
  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  })
  return { status: res.status, body: (await res.text().catch(() => '')).slice(0, 500) }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const start = Date.now()
  const results = await Promise.all(
    DOMAINS.map(async ({ host }) => {
      const t = Date.now()
      try {
        const urls = await fetchSitemapUrls(host)
        const result = await submitToIndexNow(host, urls)
        return { host, urls_extracted: urls.length, status: result.status, ms: Date.now() - t }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return { host, urls_extracted: 0, status: 'error', ms: Date.now() - t, error: msg }
      }
    }),
  )
  const failed = results.filter(r => r.status === 'error' || (typeof r.status === 'number' && r.status >= 400)).length
  const accepted = results.filter(r => r.status === 200 || r.status === 202).length
  const total_urls = results.reduce((a, r) => a + r.urls_extracted, 0)
  return NextResponse.json(
    {
      ok: failed === 0,
      timestamp: new Date().toISOString(),
      total_domains: DOMAINS.length,
      accepted,
      failed,
      total_urls_submitted: total_urls,
      elapsed_ms: Date.now() - start,
      targets: ['Bing', 'Yandex', 'Naver', 'Seznam'],
      results,
    },
    { status: failed > 0 ? 207 : 200 },
  )
}
```

### 3. Wire the cron in `vercel.json`

```json
{
  "crons": [
    { "path": "/api/cron/indexnow-daily", "schedule": "0 9 * * *" }
  ]
}
```

That's the build. Deploy and you're done.

---

## What you'll see

```text
[indexnow-daily] {
  ok: true,
  timestamp: '2026-04-27T09:00:01.241Z',
  total_domains: 10,
  accepted: 10,
  failed: 0,
  total_urls_submitted: 904,
  elapsed_ms: 1083,
  targets: [ 'Bing', 'Yandex', 'Naver', 'Seznam' ],
  …
}
```

10 domains, 904 URLs, 1.08 seconds wall-clock. Run it manually a few times to confirm acceptance, then leave it on the daily schedule.

---

## Sell it as an add-on

Three pricing tiers cover most of the customer demand:

| Tier | Price | Sites | Use case |
|---|---|---|---|
| **Starter** | $19 / mo | 1 | Solo founder, single site |
| **Studio** | $49 / mo | 5 | Agency portfolio |
| **Agency** | $199 / mo | 25 | White-label for client base |

Ship it as a marketplace product on 0nCore — the same daily cron multi-tenanted across customer sites, using a per-site IndexNow key generated automatically on signup. Customers never see the protocol details; they just see "indexed within 24 hours" on every page they ship.

---

## What to build next

- **Per-site dashboards** showing which URLs were submitted, which engines accepted, and the indexing latency
- **Programmatic key rotation** so each customer gets a unique IndexNow key (cleaner attribution)
- **Sitemap diffing** so we only submit URLs that *changed* since the last run — reduces upstream load and avoids hitting IndexNow's per-domain rate limits
- **Search Console integration** — pull back actual index status and surface "indexed / not yet" per URL

---

## Resources

- [IndexNow protocol spec](https://www.indexnow.org/documentation)
- [Bing IndexNow docs](https://www.bing.com/indexnow)
- [Yandex IndexNow docs](https://yandex.com/support/webmaster/indexnow/key.html)
- [0nCore daily cron source](https://github.com/0nork/0nMCP) — patterns reused here

This guide is part of the **Build With 0n** series. Real products. Built live. Your turn.
