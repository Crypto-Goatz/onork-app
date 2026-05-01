# Family Site Audit — verifiedsxo.com · jaxxai.com · cryptogoatz.com

> **Companion to:** `docs/SXO-CRO9-Master-Playbook.md`
> **Audit run:** 2026-05-01 · **Auditor:** automated `/api/sxo-audit` + manual review
> **Scoring scale:** 0–19 (one point per CRO9-standard signal present)

---

## Executive Summary

Three family sites currently sit between **brochure-grade** and **early
lead-capture**. None has CRO9 attached. None has Jaxx chat. Two have analytics
plumbed but no consent banner, no GTM, no pixels. CRM routing is missing on
all three. Total estimated time to flip all three from brochure → lead-capture
**≈ 4 hours** end-to-end (≈ 80 min per site).

| Domain | Score | Hosting | Analytics | CRM | Chat | Consent | Pixels | GTM | Reviews |
|--------|-------|---------|-----------|-----|------|---------|--------|-----|---------|
| verifiedsxo.com | **2 / 19** | Vercel | GA4 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| jaxxai.com | **1 / 19** | Vercel | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| cryptogoatz.com | **2 / 19** | Cloudflare | GA4 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## verifiedsxo.com — Score 2 / 19

### What's there

- ✅ Vercel hosting (already in family Vercel team `team_VtbfSzhDgB6OwglLfuPDFcd2`)
- ✅ GA4 installed (`G-…`, confirmed firing)

### What's missing

- ❌ CRM routing — no contact form posts to a CRM location
- ❌ Jaxx chat widget
- ❌ Consent Mode v2 banner (legal exposure: EU/UK/CA visitors)
- ❌ Google reviews / testimonial schema
- ❌ GTM container (analytics is hand-rolled, no pixels can be added cleanly)
- ❌ Meta / TikTok / LinkedIn pixels
- ❌ CRO9 embed
- ❌ SerpAPI rank tracking
- ❌ FAQ schema, HowTo schema, internal-link cluster
- ❌ BLUF on hero
- ❌ Living DOM marker
- ❌ UCP Live Strip
- ❌ `/llms.txt`

### Recommended fixes (priority order)

1. **GTM container** — wraps GA4, makes pixels addable in 5 min
2. **Consent Mode v2** — legal hygiene before any pixel work
3. **CRM contact form** → location `AeY8M0GNOuJPNkLQ7AAC`
4. **Jaxx chat widget** (universal family agent)
5. **CRO9 Ignite ($29/mo)** — embed + analytics, no mutation yet
6. **SXO retrofit** — apply 8 patterns to homepage + /verify + /pricing
7. **SerpAPI keywords** — 8 keywords already seeded for verifiedsxo.com

### Estimated time: **80 min**

---

## jaxxai.com — Score 1 / 19

### What's there

- ✅ Vercel hosting (family team)

### What's missing

- ❌ **Everything else**, including analytics
- ❌ GA4, GTM, consent banner, CRM, chat, pixels, reviews
- ❌ CRO9 embed
- ❌ SXO patterns
- ❌ SerpAPI tracking
- ❌ `/llms.txt`

### Why it scored lowest

jaxxai.com is currently a one-page brand showcase. There's no analytics, no
form, no chat. It's literally a billboard for the Jaxx product. That's fine
for a stage-0 launch but it's leaking demand: every visitor is a missed lead.

### Recommended fixes (priority order)

1. **GA4 + GTM** — establish the analytics floor
2. **Consent Mode v2**
3. **CRM contact form** → `AeY8M0GNOuJPNkLQ7AAC` (catch all "I want Jaxx" leads)
4. **Embed Jaxx chat on its own marketing site** (meta — Jaxx selling Jaxx)
5. **CRO9 Ignite ($29/mo)**
6. **SXO retrofit** — turn the one-pager into a real money page:
   - BLUF: "Jaxx is the AI receptionist that books your calls 24/7"
   - Table trap: vs. Drift / Intercom / human VA
   - 7 voice-search FAQs ("how much does an AI receptionist cost?")
   - HowTo schema for setup
   - Internal-link cluster → rocketopp.com/jaxx + cryptogoatz + verifiedsxo
7. **SerpAPI keywords** — 8 keywords seeded for jaxxai.com

### Estimated time: **80 min** (most-leveraged single hour in the family — flipping a billboard to a lead-capture page)

---

## cryptogoatz.com — Score 2 / 19

### What's there

- ✅ Cloudflare hosting (NOT Vercel — note for future migrations)
- ✅ GA4 installed

### What's missing

- ❌ Same gaps as verifiedsxo.com
- ❌ CRM routing
- ❌ Chat
- ❌ Consent banner
- ❌ Reviews
- ❌ GTM
- ❌ Pixels
- ❌ CRO9 embed
- ❌ SXO patterns
- ❌ SerpAPI tracking

### Why it's the highest-priority of the three

cryptogoatz.com is the **highest-revenue** family domain (existing
GoatzStripe customers, real GMV). Every percentage of conversion lift here
turns into real dollars **today**, not pipeline-future-revenue.

### Recommended fixes (priority order)

1. **GTM container** (Cloudflare → can ship via Cloudflare Workers if Vercel
   migration is deferred)
2. **Consent Mode v2** (active EU/UK customer base)
3. **CRM contact form** → `AeY8M0GNOuJPNkLQ7AAC`
4. **Jaxx chat widget** (will absorb pre-purchase questions, lift AOV)
5. **CRO9 Ignite ($29/mo)** — start measuring, mutate later
6. **SXO retrofit** — homepage + /shop + /about
7. **SerpAPI keywords** — 8 keywords seeded for cryptogoatz.com

### Estimated time: **80 min**

---

## Cross-Cutting Recommendations

Apply these once across all three sites for compounding leverage:

### 1. Unified CRM routing → `AeY8M0GNOuJPNkLQ7AAC`

All three forms post to the **same CRM location** so leads land in one
inbox with `source` tags (`source: verifiedsxo` / `jaxxai` / `cryptogoatz`).
Single triage queue, single nurture sequence, single attribution model.

### 2. Universal Jaxx chat widget

One agent ID (`JAXX_AGENT_ID` in env) deployed across all three. Jaxx
recognizes the source domain and adapts greeting:

- verifiedsxo.com → "Want me to verify your site for SXO compliance?"
- jaxxai.com → "Want a free trial of me?"
- cryptogoatz.com → "Looking for the goat collection or our SXO services?"

### 3. CRO9 Ignite on all three — **$87/mo total**

3 sites × $29/mo = $87/mo. Buys 147-metric behavioral capture + analytics
dashboard for the entire family at the cost of one mid-range SaaS tool.
Upgrade individual sites to Optimize ($99) or Dominate ($299) once the data
shows where the lift is.

### 4. Cross-family link clusters

Every page on every family site links to ≥1 page on each of the other
two. Anchor text descriptive, not domain-y. Builds the topical mesh that
GEO/AEO engines weight heavily for "RocketOpp family" entity recognition.

### 5. SerpAPI tracking — **24 keywords already seeded**

Across the three domains, **24 keywords** are seeded in `serpapi_keywords`
(8 per domain) and ready to flip on. Daily cron `0 6 * * *` runs the rank
tracker once all three have CRO9 site IDs.

---

## Order of Operations (recommended sequence)

| Order | Site | Why first | Time |
|-------|------|-----------|------|
| 1 | **cryptogoatz.com** | Highest existing revenue — every lift = real dollars today | 80 min |
| 2 | **verifiedsxo.com** | Highest cross-family leverage (verification badge feeds the others) | 80 min |
| 3 | **jaxxai.com** | Brand showcase — lowest current revenue but the rebuild becomes a Jaxx product demo | 80 min |

**Total wall-clock: ≈ 4 hours** to flip all three from brochure → lead-capture
with full SXO + CRO9 + CRM + chat + analytics + consent stack.

---

## Post-flip Validation

After each site is flipped, re-run:

```bash
curl https://www.0ncore.com/api/sxo-audit?url=<domain>
```

Target scores post-flip:

| Domain | Pre | Target |
|--------|-----|--------|
| cryptogoatz.com | 2 | ≥ 16 |
| verifiedsxo.com | 2 | ≥ 16 |
| jaxxai.com | 1 | ≥ 16 |

Anything < 16 means a CRO9 standard signal was skipped — go fix it before
moving to the next domain.

---

## See also

- `docs/SXO-CRO9-Master-Playbook.md` — the full SXO+CRO9 reference
- `https://www.0ncore.com/api/dispatch/products/onork-app` — live product status
- `https://www.0ncore.com/api/dispatch/rules` — hard rules
