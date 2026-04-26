/**
 * HIPAA 2026 Readiness Assessment Scanner
 * PRIVATE add-on — RocketOpp sub-location only (6MSqx0trfxgLxeHBJE1k)
 *
 * Passive-only scanning: HTTP GET/HEAD requests, no auth attempts, no form submissions.
 * 63 checks across public URL, dashboard URL, and universal categories.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HIPAAInput {
  publicUrl: string
  dashboardUrl: string
  entityType: 'covered-entity' | 'business-associate' | 'both' | 'unsure'
  employeeCount: string
  primaryState: string
  companyName: string
  contactEmail: string
  locationId?: string
  /** Optional package list (npm/pypi/maven) to query the Spectra Assure Community catalog. */
  packages?: Array<{ repo: 'npm' | 'pypi' | 'nuget' | 'maven' | 'gem' | 'composer' | 'cargo'; pkg: string; version?: string; namespace?: string }>
  /** Customer attestation for the 2026 weighted scoring engine. Optional — only used for Tier 4 executive-summary roll-up. */
  attestation?: import('./scoring-engine-2026').HIPAA2026Input
}

export interface HIPAACheck {
  id: string
  name: string
  ruleSection: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: 'technical' | 'administrative' | 'physical' | 'organizational'
  currentRule: 'required' | 'addressable' | 'not-specified'
  nprm2026: 'required' | 'addressable-removed' | 'new-requirement'
  status: 'pass' | 'fail' | 'warning' | 'attestation-required'
  detail: string
  remediation?: string
}

export interface HIPAAResult {
  companyName: string
  publicUrl: string
  dashboardUrl: string
  scanDate: string
  auditor: string

  currentRuleScore: number
  nprm2026Score: number
  currentGrade: string
  nprmGrade: string

  publicChecks: HIPAACheck[]
  dashboardChecks: HIPAACheck[]
  universalChecks: HIPAACheck[]
  /** Software supply chain checks derived from a Spectra Assure Community scan when a package list was provided. */
  supplyChainChecks?: HIPAACheck[]
  /** Spectra Assure summary across all scanned packages — for full Tier 4 report inclusion. */
  supplyChainReport?: {
    packagesScanned: number
    totalCves: number
    critical: number
    high: number
    totalDependencies: number
    apiTier: string
  }
  /** 2026 weighted executive score across 5 domains (auth/encryption/web-privacy/integrity/resilience). Only present when attestation was provided. */
  executiveScore2026?: import('./scoring-engine-2026').HIPAA2026Result

  criticalFindings: number
  highFindings: number
  mediumFindings: number
  lowFindings: number
  passCount: number
  failCount: number

  stateOverlay?: { state: string; law: string; relevance: string }

  remediationPriority: { priority: number; checkId: string; name: string; effort: string; impact: string }[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_WEIGHT: Record<string, number> = { critical: 10, high: 7, medium: 4, low: 2 }

const FETCH_OPTS: RequestInit = {
  redirect: 'follow',
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; 0nCore-HIPAA-Scanner/1.0)',
    Accept: 'text/html,application/xhtml+xml,*/*',
  },
}
const TIMEOUT = 12_000

async function safeFetch(url: string, method: 'GET' | 'HEAD' = 'GET'): Promise<Response | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)
    const res = await fetch(url, { ...FETCH_OPTS, method, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch {
    return null
  }
}

async function fetchHTML(url: string): Promise<{ res: Response | null; html: string }> {
  const res = await safeFetch(url, 'GET')
  if (!res) return { res: null, html: '' }
  try {
    const html = await res.text()
    return { res, html }
  } catch {
    return { res, html: '' }
  }
}

function grade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function normalizeUrl(raw: string): string {
  let u = raw.trim()
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  return u.replace(/\/+$/, '')
}

// ---------------------------------------------------------------------------
// State overlay data (top states with specific healthcare privacy laws)
// ---------------------------------------------------------------------------

const STATE_OVERLAYS: Record<string, { law: string; relevance: string }> = {
  CA: { law: 'CCPA / CMIA', relevance: 'California Confidentiality of Medical Information Act requires additional breach notification within 15 days and restricts sale of health data.' },
  NY: { law: 'NY SHIELD Act', relevance: 'Requires reasonable safeguards for private information including health data; broader breach notification requirements.' },
  TX: { law: 'TX HB 300', relevance: 'Texas medical privacy law with private right of action; requires employee training within 90 days of hire.' },
  MA: { law: '201 CMR 17.00', relevance: 'Massachusetts data security regulation requires written information security programs for personal data including health records.' },
  CO: { law: 'CPA + HB 1130', relevance: 'Colorado Privacy Act plus state health data protections with right to opt out of profiling.' },
  WA: { law: 'My Health My Data Act', relevance: 'Washington comprehensive health data privacy law applies to non-HIPAA entities too; requires consent for collection/sharing.' },
  CT: { law: 'CTDPA', relevance: 'Connecticut Data Privacy Act includes health data sensitivity provisions and processor requirements.' },
  NV: { law: 'NRS 603A', relevance: 'Nevada requires encryption of personal data in transit and storage; health data included.' },
  IL: { law: 'BIPA', relevance: 'Illinois Biometric Information Privacy Act applies if biometric patient data is collected.' },
  FL: { law: 'FIPA + HB 1547', relevance: 'Florida Information Protection Act with 30-day breach notification requirement for health data.' },
}

// ---------------------------------------------------------------------------
// Check definitions
// ---------------------------------------------------------------------------

interface CheckDef {
  id: string
  name: string
  ruleSection: string
  severity: HIPAACheck['severity']
  category: HIPAACheck['category']
  currentRule: HIPAACheck['currentRule']
  nprm2026: HIPAACheck['nprm2026']
  effort: string
  impact: string
}

// ----- PUBLIC URL CHECKS (PUB-01..PUB-23) -----

const PUBLIC_CHECKS: CheckDef[] = [
  // TLS / Certificate
  { id: 'PUB-01', name: 'HTTPS enforced', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-02', name: 'HSTS header present', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-03', name: 'HSTS max-age >= 1 year', ruleSection: '164.312(e)(1)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'PUB-04', name: 'HTTP->HTTPS redirect', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-05', name: 'HSTS includeSubDomains', ruleSection: '164.312(e)(1)', severity: 'medium', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'medium' },
  { id: 'PUB-06', name: 'HSTS preload directive', ruleSection: '164.312(e)(1)', severity: 'low', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'low' },
  { id: 'PUB-07', name: 'Certificate validity', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  // Security headers
  { id: 'PUB-08', name: 'Content-Security-Policy header', ruleSection: '164.312(a)(2)(iv)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'medium', impact: 'high' },
  { id: 'PUB-09', name: 'X-Frame-Options / frame-ancestors', ruleSection: '164.312(a)(2)(iv)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'PUB-10', name: 'X-Content-Type-Options: nosniff', ruleSection: '164.312(a)(2)(iv)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  { id: 'PUB-11', name: 'Referrer-Policy header', ruleSection: '164.312(e)(1)', severity: 'medium', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'medium' },
  { id: 'PUB-12', name: 'Permissions-Policy header', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'medium' },
  { id: 'PUB-13', name: 'No Server version disclosure', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  { id: 'PUB-14', name: 'No X-Powered-By disclosure', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  // Content checks
  { id: 'PUB-15', name: 'No exposed /phpinfo.php', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-16', name: 'No exposed /.env file', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-17', name: 'No exposed /.git directory', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-18', name: 'No exposed /backup path', ruleSection: '164.312(a)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'PUB-19', name: 'No exposed /dump.sql', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'PUB-20', name: 'Notice of Privacy Practices present', ruleSection: '164.520', severity: 'high', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'medium', impact: 'high' },
  { id: 'PUB-21', name: 'Third-party tracker assessment', ruleSection: '164.502(a)', severity: 'high', category: 'organizational', currentRule: 'addressable', nprm2026: 'required', effort: 'medium', impact: 'high' },
  { id: 'PUB-22', name: 'No mixed content (HTTP on HTTPS)', ruleSection: '164.312(e)(1)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'PUB-23', name: 'No ePHI in URL structure', ruleSection: '164.312(e)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'PUB-24', name: 'No CMS version disclosure', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  { id: 'PUB-25', name: 'No WordPress XML-RPC', ruleSection: '164.312(a)(1)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'PUB-26', name: 'No exposed /wp-admin', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  { id: 'PUB-27', name: 'Homepage returns 200 OK', ruleSection: '164.308(a)(8)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'medium', impact: 'medium' },
  { id: 'PUB-28', name: 'Content updated within 12 months', ruleSection: '164.308(a)(8)', severity: 'low', category: 'organizational', currentRule: 'addressable', nprm2026: 'required', effort: 'medium', impact: 'low' },
]

// ----- DASHBOARD URL CHECKS (DASH-01..DASH-21) -----

const DASHBOARD_CHECKS: CheckDef[] = [
  // TLS on dashboard
  { id: 'DASH-01', name: 'Dashboard HTTPS enforced', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-02', name: 'Dashboard HSTS header', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-03', name: 'Dashboard HSTS max-age >= 1 year', ruleSection: '164.312(e)(1)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-04', name: 'Dashboard HTTP->HTTPS redirect', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'critical' },
  // Auth indicators
  { id: 'DASH-05', name: 'MFA indicators present', ruleSection: '164.312(d)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'DASH-06', name: 'Session cookie Secure flag', ruleSection: '164.312(e)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-07', name: 'Session cookie HttpOnly flag', ruleSection: '164.312(a)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-08', name: 'Session cookie SameSite attribute', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'medium' },
  { id: 'DASH-09', name: 'No credentials in URL', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-10', name: 'Rate limiting indicators', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'medium', impact: 'medium' },
  // Dashboard security headers
  { id: 'DASH-11', name: 'Dashboard CSP header', ruleSection: '164.312(a)(2)(iv)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'medium', impact: 'high' },
  { id: 'DASH-12', name: 'Dashboard X-Frame-Options', ruleSection: '164.312(a)(2)(iv)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-13', name: 'Dashboard X-Content-Type-Options', ruleSection: '164.312(a)(2)(iv)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  { id: 'DASH-14', name: 'Dashboard Referrer-Policy', ruleSection: '164.312(e)(1)', severity: 'medium', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'medium' },
  { id: 'DASH-15', name: 'Dashboard Permissions-Policy', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'not-specified', nprm2026: 'new-requirement', effort: 'low', impact: 'medium' },
  { id: 'DASH-16', name: 'Dashboard no Server disclosure', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  { id: 'DASH-17', name: 'Dashboard no X-Powered-By', ruleSection: '164.312(a)(1)', severity: 'medium', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'medium' },
  // Content
  { id: 'DASH-18', name: 'Dashboard no exposed /.env', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-19', name: 'Dashboard no exposed /.git', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-20', name: 'Dashboard no ePHI in URL', ruleSection: '164.312(e)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-21', name: 'Dashboard no mixed content', ruleSection: '164.312(e)(1)', severity: 'high', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-22', name: 'No exposed /phpinfo.php on dashboard', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-23', name: 'No exposed /test.php on dashboard', ruleSection: '164.312(a)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-24', name: 'No open self-registration', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-25', name: 'No wildcard CORS origin', ruleSection: '164.312(e)(2)', severity: 'critical', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'critical' },
  { id: 'DASH-26', name: 'No EOL software detected', ruleSection: '164.308(a)(5)(ii)(B)', severity: 'critical', category: 'technical', currentRule: 'addressable', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'DASH-27', name: 'No exposed /composer.json', ruleSection: '164.312(a)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
  { id: 'DASH-28', name: 'No exposed /storage/logs', ruleSection: '164.312(a)(1)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'low', impact: 'high' },
]

// ----- UNIVERSAL CHECKS (UNI-01..UNI-07) -----

const UNIVERSAL_CHECKS: CheckDef[] = [
  { id: 'UNI-01', name: 'BAA documentation policy', ruleSection: '164.308(b)(1)', severity: 'critical', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'UNI-02', name: 'Incident response plan', ruleSection: '164.308(a)(6)', severity: 'critical', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'UNI-03', name: 'Workforce training documentation', ruleSection: '164.308(a)(5)', severity: 'high', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'high', impact: 'high' },
  { id: 'UNI-04', name: 'Risk analysis conducted', ruleSection: '164.308(a)(1)(ii)(A)', severity: 'critical', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'UNI-05', name: 'Data backup and recovery plan', ruleSection: '164.308(a)(7)', severity: 'critical', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'UNI-06', name: 'Access control policy', ruleSection: '164.312(a)(1)', severity: 'critical', category: 'administrative', currentRule: 'required', nprm2026: 'required', effort: 'high', impact: 'critical' },
  { id: 'UNI-07', name: 'Audit logging capability', ruleSection: '164.312(b)', severity: 'high', category: 'technical', currentRule: 'required', nprm2026: 'required', effort: 'medium', impact: 'high' },
]

// ---------------------------------------------------------------------------
// Scanner implementation
// ---------------------------------------------------------------------------

function checkForExposedPath(url: string, path: string): Promise<HIPAACheck['status']> {
  return safeFetch(`${url}${path}`, 'HEAD').then(res => {
    if (!res) return 'pass' // Can't reach = not exposed
    // 200 or 403 (forbidden means something is there)
    if (res.status === 200) return 'fail'
    if (res.status === 403) return 'warning'
    return 'pass'
  })
}

function hasHeader(headers: Headers, name: string): boolean {
  return !!headers.get(name)
}

function getHeader(headers: Headers, name: string): string {
  return headers.get(name) || ''
}

// PHI-like patterns in URLs
const PHI_URL_PATTERNS = [
  /ssn[=\/]/i, /social.?security/i, /patient.?id[=\/]/i, /mrn[=\/]/i,
  /dob[=\/]/i, /date.?of.?birth/i, /diagnosis/i, /insurance.?id/i,
]

// Tracker patterns
const TRACKER_PATTERNS = [
  { name: 'Meta Pixel', pattern: /fbq\(|facebook\.net\/en_US\/fbevents|connect\.facebook\.net/i },
  { name: 'Google Analytics (no BAA)', pattern: /gtag\(|google-analytics\.com|googletagmanager\.com/i },
  { name: 'TikTok Pixel', pattern: /analytics\.tiktok\.com/i },
  { name: 'Hotjar', pattern: /hotjar\.com/i },
  { name: 'FullStory', pattern: /fullstory\.com/i },
  { name: 'Clarity', pattern: /clarity\.ms/i },
]

async function runPublicChecks(publicUrl: string): Promise<HIPAACheck[]> {
  const url = normalizeUrl(publicUrl)
  const { res, html } = await fetchHTML(url)
  const checks: HIPAACheck[] = []

  function push(def: CheckDef, status: HIPAACheck['status'], detail: string, remediation?: string) {
    checks.push({ ...def, status, detail, remediation })
  }

  // PUB-01: HTTPS enforced
  if (!res) {
    push(PUBLIC_CHECKS[0], 'fail', 'Could not reach the public URL.', 'Ensure the site is accessible over HTTPS.')
  } else if (res.url.startsWith('https://')) {
    push(PUBLIC_CHECKS[0], 'pass', 'Site is served over HTTPS.')
  } else {
    push(PUBLIC_CHECKS[0], 'fail', 'Site is NOT served over HTTPS.', 'Configure TLS and enforce HTTPS on all pages.')
  }

  const headers = res?.headers
  const hsts = headers ? getHeader(headers, 'strict-transport-security') : ''

  // PUB-02: HSTS present
  push(PUBLIC_CHECKS[1], hsts ? 'pass' : 'fail',
    hsts ? 'HSTS header is present.' : 'HSTS header is missing.',
    hsts ? undefined : 'Add Strict-Transport-Security header with max-age of at least 31536000.')

  // PUB-03: HSTS max-age >= 1 year
  const maxAgeMatch = hsts.match(/max-age=(\d+)/i)
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0
  push(PUBLIC_CHECKS[2], maxAge >= 31536000 ? 'pass' : (hsts ? 'warning' : 'fail'),
    maxAge >= 31536000 ? `HSTS max-age is ${maxAge} seconds (>= 1 year).` : `HSTS max-age is ${maxAge} seconds (< 1 year).`,
    maxAge >= 31536000 ? undefined : 'Set HSTS max-age to at least 31536000 (1 year).')

  // PUB-04: HTTP redirect
  const httpUrl = url.replace(/^https:/, 'http:')
  const httpRes = await safeFetch(httpUrl, 'HEAD')
  const redirectsToHttps = httpRes ? httpRes.url.startsWith('https://') : false
  push(PUBLIC_CHECKS[3], redirectsToHttps ? 'pass' : 'warning',
    redirectsToHttps ? 'HTTP requests redirect to HTTPS.' : 'Could not confirm HTTP->HTTPS redirect.',
    redirectsToHttps ? undefined : 'Configure server to 301 redirect all HTTP traffic to HTTPS.')

  // PUB-05: HSTS includeSubDomains
  push(PUBLIC_CHECKS[4], /includeSubDomains/i.test(hsts) ? 'pass' : 'warning',
    /includeSubDomains/i.test(hsts) ? 'HSTS includes subdomains.' : 'HSTS does not include subdomains.',
    /includeSubDomains/i.test(hsts) ? undefined : 'Add includeSubDomains to HSTS header.')

  // PUB-06: HSTS preload
  push(PUBLIC_CHECKS[5], /preload/i.test(hsts) ? 'pass' : 'warning',
    /preload/i.test(hsts) ? 'HSTS preload directive is set.' : 'HSTS preload directive is not set.',
    /preload/i.test(hsts) ? undefined : 'Add preload to HSTS header and submit to hstspreload.org.')

  // PUB-07: Certificate validity (we can tell if the fetch succeeded over HTTPS)
  push(PUBLIC_CHECKS[6], (res && res.url.startsWith('https://')) ? 'pass' : 'fail',
    (res && res.url.startsWith('https://')) ? 'TLS certificate is valid (connection succeeded).' : 'TLS certificate may be invalid or missing.',
    (res && res.url.startsWith('https://')) ? undefined : 'Install a valid TLS certificate from a trusted CA.')

  // Security headers (PUB-08 to PUB-14)
  if (headers) {
    const csp = getHeader(headers, 'content-security-policy')
    push(PUBLIC_CHECKS[7], csp ? 'pass' : 'fail', csp ? 'CSP header is present.' : 'CSP header is missing.', csp ? undefined : 'Implement a Content-Security-Policy header to prevent XSS and injection attacks.')

    const xfo = getHeader(headers, 'x-frame-options')
    const cspFrame = csp.includes('frame-ancestors')
    push(PUBLIC_CHECKS[8], (xfo || cspFrame) ? 'pass' : 'fail',
      (xfo || cspFrame) ? 'Clickjacking protection is present.' : 'No clickjacking protection found.',
      (xfo || cspFrame) ? undefined : 'Add X-Frame-Options: DENY or CSP frame-ancestors directive.')

    push(PUBLIC_CHECKS[9], getHeader(headers, 'x-content-type-options').toLowerCase() === 'nosniff' ? 'pass' : 'fail',
      getHeader(headers, 'x-content-type-options').toLowerCase() === 'nosniff' ? 'X-Content-Type-Options: nosniff is set.' : 'X-Content-Type-Options header is missing or not nosniff.',
      getHeader(headers, 'x-content-type-options').toLowerCase() === 'nosniff' ? undefined : 'Set X-Content-Type-Options: nosniff header.')

    push(PUBLIC_CHECKS[10], hasHeader(headers, 'referrer-policy') ? 'pass' : 'warning',
      hasHeader(headers, 'referrer-policy') ? 'Referrer-Policy header is present.' : 'Referrer-Policy header is missing.',
      hasHeader(headers, 'referrer-policy') ? undefined : 'Add Referrer-Policy: strict-origin-when-cross-origin header.')

    push(PUBLIC_CHECKS[11], hasHeader(headers, 'permissions-policy') ? 'pass' : 'warning',
      hasHeader(headers, 'permissions-policy') ? 'Permissions-Policy header is present.' : 'Permissions-Policy header is missing.',
      hasHeader(headers, 'permissions-policy') ? undefined : 'Add Permissions-Policy header to restrict browser features.')

    const serverHeader = getHeader(headers, 'server')
    const serverDisclosure = serverHeader && /\d/.test(serverHeader)
    push(PUBLIC_CHECKS[12], serverDisclosure ? 'fail' : 'pass',
      serverDisclosure ? `Server version disclosed: "${serverHeader}".` : 'No server version disclosure detected.',
      serverDisclosure ? 'Remove version numbers from the Server header.' : undefined)

    push(PUBLIC_CHECKS[13], hasHeader(headers, 'x-powered-by') ? 'fail' : 'pass',
      hasHeader(headers, 'x-powered-by') ? `X-Powered-By disclosed: "${getHeader(headers, 'x-powered-by')}".` : 'X-Powered-By header is not exposed.',
      hasHeader(headers, 'x-powered-by') ? 'Remove X-Powered-By header from responses.' : undefined)
  } else {
    // No response — mark all header checks as fail
    for (let i = 7; i <= 13; i++) {
      push(PUBLIC_CHECKS[i], 'fail', 'Could not fetch headers from the public URL.', 'Ensure the site is accessible.')
    }
  }

  // Content checks (PUB-15 to PUB-23)
  // Exposed files
  const exposedPaths = [
    { idx: 14, path: '/phpinfo.php' },
    { idx: 15, path: '/.env' },
    { idx: 16, path: '/.git/HEAD' },
    { idx: 17, path: '/backup' },
    { idx: 18, path: '/dump.sql' },
  ]
  const exposedResults = await Promise.all(exposedPaths.map(p => checkForExposedPath(url, p.path)))
  for (let i = 0; i < exposedPaths.length; i++) {
    const def = PUBLIC_CHECKS[exposedPaths[i].idx]
    const st = exposedResults[i]
    push(def, st,
      st === 'pass' ? `${exposedPaths[i].path} is not exposed.` :
      st === 'fail' ? `${exposedPaths[i].path} is publicly accessible!` :
      `${exposedPaths[i].path} returned 403 (may exist but is blocked).`,
      st !== 'pass' ? `Block access to ${exposedPaths[i].path} in server configuration.` : undefined)
  }

  // PUB-20: Privacy Practices
  const hasPrivacy = /notice\s+of\s+privacy\s+practices|hipaa\s+privacy|privacy\s+practices/i.test(html)
  push(PUBLIC_CHECKS[19], hasPrivacy ? 'pass' : 'fail',
    hasPrivacy ? 'Page references Notice of Privacy Practices / HIPAA.' : 'No Notice of Privacy Practices or HIPAA reference found.',
    hasPrivacy ? undefined : 'Publish a Notice of Privacy Practices on the public site as required by the HIPAA Privacy Rule.')

  // PUB-21: Trackers
  const foundTrackers = TRACKER_PATTERNS.filter(t => t.pattern.test(html))
  if (foundTrackers.length === 0) {
    push(PUBLIC_CHECKS[20], 'pass', 'No common third-party trackers detected on the page.')
  } else {
    push(PUBLIC_CHECKS[20], 'warning',
      `Trackers detected: ${foundTrackers.map(t => t.name).join(', ')}. Verify BAAs are in place.`,
      'Ensure a BAA is signed with each tracking vendor or remove trackers from pages that may handle ePHI.')
  }

  // PUB-22: Mixed content
  const mixedContent = /src=["']http:\/\//i.test(html) || /href=["']http:\/\/[^"']*\.(css|js)/i.test(html)
  push(PUBLIC_CHECKS[21], mixedContent ? 'fail' : 'pass',
    mixedContent ? 'Mixed content detected (HTTP resources on HTTPS page).' : 'No mixed content detected.',
    mixedContent ? 'Update all resource URLs to HTTPS.' : undefined)

  // PUB-23: ePHI in URL
  const hasPhiUrl = PHI_URL_PATTERNS.some(p => p.test(url))
  push(PUBLIC_CHECKS[22], hasPhiUrl ? 'fail' : 'pass',
    hasPhiUrl ? 'Potential ePHI identifiers found in URL structure.' : 'No ePHI patterns detected in URL.',
    hasPhiUrl ? 'Remove ePHI from URL paths and query parameters; use opaque IDs.' : undefined)

  // PUB-24: CMS version disclosure (WordPress generator tag)
  const cmsVersionMatch = html.match(/content=["'](?:WordPress|Joomla|Drupal)\s+([\d.]+)/i)
  push(PUBLIC_CHECKS[23], cmsVersionMatch ? 'fail' : 'pass',
    cmsVersionMatch ? `CMS version disclosed: ${cmsVersionMatch[0]}.` : 'No CMS version disclosure found in page source.',
    cmsVersionMatch ? 'Remove the generator meta tag from your CMS. In WordPress: add remove_action("wp_head", "wp_generator") to functions.php.' : undefined)

  // PUB-25: WordPress XML-RPC
  const xmlrpcStatus = await checkForExposedPath(url, '/xmlrpc.php')
  push(PUBLIC_CHECKS[24], xmlrpcStatus === 'pass' ? 'pass' : xmlrpcStatus === 'fail' ? 'fail' : 'warning',
    xmlrpcStatus === 'pass' ? '/xmlrpc.php is not exposed.' : xmlrpcStatus === 'fail' ? '/xmlrpc.php is publicly accessible — attack surface for brute force and DDoS amplification.' : '/xmlrpc.php returned 403 (exists but blocked).',
    xmlrpcStatus !== 'pass' ? 'Disable XML-RPC via plugin or block in .htaccess / Cloudflare.' : undefined)

  // PUB-26: WordPress admin exposure
  const wpAdminStatus = await checkForExposedPath(url, '/wp-admin/')
  push(PUBLIC_CHECKS[25], wpAdminStatus === 'pass' ? 'pass' : wpAdminStatus === 'fail' ? 'warning' : 'pass',
    wpAdminStatus === 'fail' ? '/wp-admin/ is publicly accessible (should redirect to login or be blocked).' : '/wp-admin/ is properly restricted.',
    wpAdminStatus === 'fail' ? 'Restrict /wp-admin/ access by IP or implement a WAF rule.' : undefined)

  // PUB-27: Homepage returns 200
  push(PUBLIC_CHECKS[26], (res && res.status === 200) ? 'pass' : 'fail',
    (res && res.status === 200) ? 'Homepage returns HTTP 200 OK.' : `Homepage returns HTTP ${res?.status || 'unreachable'} — site may be broken or misconfigured.`,
    (res && res.status === 200) ? undefined : 'Investigate and fix the root cause of the non-200 response. A broken website indicates no operational monitoring.')

  // PUB-28: Content freshness (look for dates in meta/content)
  const datePatterns = html.match(/\b20(2[0-6]|1\d)[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])\b/g) || []
  const wpModified = html.match(/modified["']?\s*:\s*["'](\d{4}-\d{2}-\d{2})/i)
  let contentFresh = false
  const now = Date.now()
  const oneYear = 365 * 24 * 60 * 60 * 1000
  for (const d of [...datePatterns, ...(wpModified ? [wpModified[1]] : [])]) {
    const parsed = new Date(d)
    if (!isNaN(parsed.getTime()) && (now - parsed.getTime()) < oneYear) { contentFresh = true; break }
  }
  push(PUBLIC_CHECKS[27], contentFresh ? 'pass' : 'warning',
    contentFresh ? 'Content appears to have been updated within the last 12 months.' : 'No evidence of content updates within the last 12 months — may indicate abandoned site.',
    contentFresh ? undefined : 'Review and update website content regularly. Stale sites suggest no operational oversight.')

  return checks
}

async function runDashboardChecks(dashboardUrl: string): Promise<HIPAACheck[]> {
  const url = normalizeUrl(dashboardUrl)
  const { res, html } = await fetchHTML(url)
  const checks: HIPAACheck[] = []

  function push(def: CheckDef, status: HIPAACheck['status'], detail: string, remediation?: string) {
    checks.push({ ...def, status, detail, remediation })
  }

  const headers = res?.headers
  const hsts = headers ? getHeader(headers, 'strict-transport-security') : ''

  // DASH-01: HTTPS
  push(DASHBOARD_CHECKS[0], (res && res.url.startsWith('https://')) ? 'pass' : 'fail',
    (res && res.url.startsWith('https://')) ? 'Dashboard is served over HTTPS.' : 'Dashboard is NOT served over HTTPS.',
    (res && res.url.startsWith('https://')) ? undefined : 'Configure TLS for the dashboard.')

  // DASH-02: HSTS
  push(DASHBOARD_CHECKS[1], hsts ? 'pass' : 'fail',
    hsts ? 'Dashboard HSTS header is present.' : 'Dashboard HSTS header is missing.',
    hsts ? undefined : 'Add Strict-Transport-Security header to dashboard responses.')

  // DASH-03: HSTS max-age
  const maxAgeMatch = hsts.match(/max-age=(\d+)/i)
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0
  push(DASHBOARD_CHECKS[2], maxAge >= 31536000 ? 'pass' : (hsts ? 'warning' : 'fail'),
    maxAge >= 31536000 ? `Dashboard HSTS max-age is ${maxAge}s.` : `Dashboard HSTS max-age is ${maxAge}s (< 1 year).`,
    maxAge >= 31536000 ? undefined : 'Set dashboard HSTS max-age to at least 31536000.')

  // DASH-04: HTTP redirect
  const httpUrl = url.replace(/^https:/, 'http:')
  const httpRes = await safeFetch(httpUrl, 'HEAD')
  const redir = httpRes ? httpRes.url.startsWith('https://') : false
  push(DASHBOARD_CHECKS[3], redir ? 'pass' : 'warning',
    redir ? 'Dashboard HTTP redirects to HTTPS.' : 'Could not confirm dashboard HTTP->HTTPS redirect.',
    redir ? undefined : 'Configure dashboard to redirect HTTP to HTTPS.')

  // DASH-05: MFA indicators
  const mfaPatterns = /two.?factor|2fa|authenticator|otp|mfa|multi.?factor|verification\s+code/i
  push(DASHBOARD_CHECKS[4], mfaPatterns.test(html) ? 'pass' : 'warning',
    mfaPatterns.test(html) ? 'MFA indicators detected in dashboard login page.' : 'No MFA indicators detected in dashboard. May still be implemented server-side.',
    mfaPatterns.test(html) ? undefined : 'Implement multi-factor authentication. Under NPRM 2026, MFA will be required for all ePHI access.')

  // DASH-06 to DASH-08: Session cookies
  const setCookie = headers ? getHeader(headers, 'set-cookie') : ''
  push(DASHBOARD_CHECKS[5], /;\s*secure/i.test(setCookie) || !setCookie ? (setCookie ? 'pass' : 'warning') : 'fail',
    /;\s*secure/i.test(setCookie) ? 'Session cookies have Secure flag.' : !setCookie ? 'No Set-Cookie header observed (may use SPA auth).' : 'Session cookies missing Secure flag.',
    /;\s*secure/i.test(setCookie) || !setCookie ? undefined : 'Set the Secure flag on all session cookies.')

  push(DASHBOARD_CHECKS[6], /;\s*httponly/i.test(setCookie) || !setCookie ? (setCookie ? 'pass' : 'warning') : 'fail',
    /;\s*httponly/i.test(setCookie) ? 'Session cookies have HttpOnly flag.' : !setCookie ? 'No Set-Cookie header observed.' : 'Session cookies missing HttpOnly flag.',
    /;\s*httponly/i.test(setCookie) || !setCookie ? undefined : 'Set the HttpOnly flag on all session cookies.')

  push(DASHBOARD_CHECKS[7], /;\s*samesite/i.test(setCookie) || !setCookie ? (setCookie ? 'pass' : 'warning') : 'warning',
    /;\s*samesite/i.test(setCookie) ? 'Session cookies have SameSite attribute.' : 'No SameSite attribute detected.',
    /;\s*samesite/i.test(setCookie) || !setCookie ? undefined : 'Set SameSite=Strict or SameSite=Lax on session cookies.')

  // DASH-09: Credentials in URL
  const hasCreds = /password=|token=|session_id=|auth=|api_key=/i.test(url)
  push(DASHBOARD_CHECKS[8], hasCreds ? 'fail' : 'pass',
    hasCreds ? 'Credentials or session IDs detected in dashboard URL.' : 'No credentials detected in dashboard URL.',
    hasCreds ? 'Never include credentials or session tokens in URLs.' : undefined)

  // DASH-10: Rate limiting
  const rateLimitHeaders = headers ? (
    hasHeader(headers, 'x-ratelimit-limit') ||
    hasHeader(headers, 'retry-after') ||
    hasHeader(headers, 'x-rate-limit-limit') ||
    hasHeader(headers, 'ratelimit-limit')
  ) : false
  push(DASHBOARD_CHECKS[9], rateLimitHeaders ? 'pass' : 'warning',
    rateLimitHeaders ? 'Rate limiting headers detected.' : 'No rate limiting headers observed (may still be implemented server-side).',
    rateLimitHeaders ? undefined : 'Implement rate limiting on login and API endpoints to prevent brute-force attacks.')

  // DASH-11 to DASH-17: Dashboard security headers
  if (headers) {
    const csp = getHeader(headers, 'content-security-policy')
    push(DASHBOARD_CHECKS[10], csp ? 'pass' : 'fail', csp ? 'Dashboard CSP is present.' : 'Dashboard CSP is missing.', csp ? undefined : 'Add CSP header to dashboard.')

    const xfo = getHeader(headers, 'x-frame-options')
    push(DASHBOARD_CHECKS[11], (xfo || csp.includes('frame-ancestors')) ? 'pass' : 'fail',
      (xfo || csp.includes('frame-ancestors')) ? 'Dashboard clickjacking protection is present.' : 'Dashboard has no clickjacking protection.',
      (xfo || csp.includes('frame-ancestors')) ? undefined : 'Add X-Frame-Options: DENY to dashboard.')

    push(DASHBOARD_CHECKS[12], getHeader(headers, 'x-content-type-options').toLowerCase() === 'nosniff' ? 'pass' : 'fail',
      getHeader(headers, 'x-content-type-options').toLowerCase() === 'nosniff' ? 'Dashboard X-Content-Type-Options is set.' : 'Dashboard missing X-Content-Type-Options.',
      getHeader(headers, 'x-content-type-options').toLowerCase() === 'nosniff' ? undefined : 'Set X-Content-Type-Options: nosniff.')

    push(DASHBOARD_CHECKS[13], hasHeader(headers, 'referrer-policy') ? 'pass' : 'warning',
      hasHeader(headers, 'referrer-policy') ? 'Dashboard Referrer-Policy is present.' : 'Dashboard Referrer-Policy is missing.',
      hasHeader(headers, 'referrer-policy') ? undefined : 'Add Referrer-Policy header.')

    push(DASHBOARD_CHECKS[14], hasHeader(headers, 'permissions-policy') ? 'pass' : 'warning',
      hasHeader(headers, 'permissions-policy') ? 'Dashboard Permissions-Policy is present.' : 'Dashboard Permissions-Policy is missing.',
      hasHeader(headers, 'permissions-policy') ? undefined : 'Add Permissions-Policy header.')

    const serverHeader = getHeader(headers, 'server')
    push(DASHBOARD_CHECKS[15], (serverHeader && /\d/.test(serverHeader)) ? 'fail' : 'pass',
      (serverHeader && /\d/.test(serverHeader)) ? `Dashboard server version disclosed: "${serverHeader}".` : 'No dashboard server version disclosure.',
      (serverHeader && /\d/.test(serverHeader)) ? 'Remove version from Server header.' : undefined)

    push(DASHBOARD_CHECKS[16], hasHeader(headers, 'x-powered-by') ? 'fail' : 'pass',
      hasHeader(headers, 'x-powered-by') ? 'Dashboard X-Powered-By is exposed.' : 'Dashboard X-Powered-By is not exposed.',
      hasHeader(headers, 'x-powered-by') ? 'Remove X-Powered-By header.' : undefined)
  } else {
    for (let i = 10; i <= 16; i++) {
      push(DASHBOARD_CHECKS[i], 'fail', 'Could not fetch dashboard headers.', 'Ensure the dashboard URL is accessible.')
    }
  }

  // DASH-18 + DASH-19: Exposed files
  const dashExposedPaths = [
    { idx: 17, path: '/.env' },
    { idx: 18, path: '/.git/HEAD' },
  ]
  const dashExposedResults = await Promise.all(dashExposedPaths.map(p => checkForExposedPath(url, p.path)))
  for (let i = 0; i < dashExposedPaths.length; i++) {
    const def = DASHBOARD_CHECKS[dashExposedPaths[i].idx]
    const st = dashExposedResults[i]
    push(def, st,
      st === 'pass' ? `Dashboard ${dashExposedPaths[i].path} is not exposed.` :
      st === 'fail' ? `Dashboard ${dashExposedPaths[i].path} is publicly accessible!` :
      `Dashboard ${dashExposedPaths[i].path} returned 403 (may exist).`,
      st !== 'pass' ? `Block dashboard access to ${dashExposedPaths[i].path}.` : undefined)
  }

  // DASH-20: ePHI in URL
  const hasPhiUrl = PHI_URL_PATTERNS.some(p => p.test(url))
  push(DASHBOARD_CHECKS[19], hasPhiUrl ? 'fail' : 'pass',
    hasPhiUrl ? 'Potential ePHI in dashboard URL.' : 'No ePHI in dashboard URL.',
    hasPhiUrl ? 'Remove ePHI from URLs.' : undefined)

  // DASH-21: Mixed content
  const mixedContent = /src=["']http:\/\//i.test(html) || /href=["']http:\/\/[^"']*\.(css|js)/i.test(html)
  push(DASHBOARD_CHECKS[20], mixedContent ? 'fail' : 'pass',
    mixedContent ? 'Dashboard has mixed content.' : 'No mixed content on dashboard.',
    mixedContent ? 'Update all dashboard resource URLs to HTTPS.' : undefined)

  // DASH-22: phpinfo on dashboard
  const phpinfoStatus = await checkForExposedPath(url, '/phpinfo.php')
  push(DASHBOARD_CHECKS[21], phpinfoStatus === 'pass' ? 'pass' : phpinfoStatus === 'fail' ? 'fail' : 'warning',
    phpinfoStatus === 'pass' ? 'Dashboard /phpinfo.php is not exposed.' : phpinfoStatus === 'fail' ? 'CRITICAL: /phpinfo.php is publicly accessible on dashboard — full server config exposed!' : '/phpinfo.php returned 403 on dashboard (may exist).',
    phpinfoStatus !== 'pass' ? 'Delete phpinfo.php from the server immediately: rm /path/to/public/phpinfo.php' : undefined)

  // DASH-23: test.php on dashboard
  const testPhpStatus = await checkForExposedPath(url, '/test.php')
  push(DASHBOARD_CHECKS[22], testPhpStatus === 'pass' ? 'pass' : testPhpStatus === 'fail' ? 'fail' : 'warning',
    testPhpStatus === 'pass' ? 'No /test.php found on dashboard.' : testPhpStatus === 'fail' ? '/test.php is publicly accessible — debug file on production.' : '/test.php returned 403 on dashboard.',
    testPhpStatus !== 'pass' ? 'Remove all test/debug files from production servers.' : undefined)

  // DASH-24: Open self-registration
  const registerRes = await safeFetch(`${url}/register`, 'GET')
  const registerHtml = registerRes ? await registerRes.text().catch(() => '') : ''
  const hasRegForm = registerRes?.status === 200 && (/type=["']password/i.test(registerHtml) || /name=["']email/i.test(registerHtml))
  push(DASHBOARD_CHECKS[23], hasRegForm ? 'fail' : 'pass',
    hasRegForm ? 'Open self-registration found at /register — anyone can create an account without authorization.' : 'No open self-registration detected.',
    hasRegForm ? 'Disable public registration. In Laravel: Auth::routes(["register" => false]). Require invitation-only account creation.' : undefined)

  // DASH-25: CORS wildcard
  const corsOrigin = headers ? getHeader(headers, 'access-control-allow-origin') : ''
  const corsHeaders = headers ? getHeader(headers, 'access-control-allow-headers') : ''
  const wildcardCors = corsOrigin === '*' && /authorization/i.test(corsHeaders)
  push(DASHBOARD_CHECKS[24], wildcardCors ? 'fail' : corsOrigin === '*' ? 'warning' : 'pass',
    wildcardCors ? 'CRITICAL: Wildcard CORS (Access-Control-Allow-Origin: *) with Authorization header allowed. Any website can make authenticated API calls.' : corsOrigin === '*' ? 'Wildcard CORS detected but without Authorization header exposure.' : 'CORS is properly restricted.',
    wildcardCors || corsOrigin === '*' ? 'Restrict Access-Control-Allow-Origin to specific trusted domains. Never use wildcard with Authorization headers.' : undefined)

  // DASH-26: EOL software detection
  const serverHeader = headers ? getHeader(headers, 'server') : ''
  const poweredBy = headers ? getHeader(headers, 'x-powered-by') : ''
  const combined = `${serverHeader} ${poweredBy}`.toLowerCase()
  const eolPatterns = [
    { pattern: /php\/(5\.|7\.[0-4])/i, name: 'PHP', match: '' },
    { pattern: /openssl\/(0\.|1\.0\.[0-2])/i, name: 'OpenSSL', match: '' },
    { pattern: /apache\/2\.[0-3]\./i, name: 'Apache', match: '' },
    { pattern: /nginx\/1\.(1[0-9]|[0-9])\./i, name: 'nginx', match: '' },
  ]
  const eolFound: string[] = []
  for (const ep of eolPatterns) {
    const m = combined.match(ep.pattern)
    if (m) eolFound.push(`${ep.name} ${m[0]}`)
  }
  push(DASHBOARD_CHECKS[25], eolFound.length > 0 ? 'fail' : 'pass',
    eolFound.length > 0 ? `End-of-life software detected: ${eolFound.join(', ')}. Known CVEs may exist with published exploits.` : 'No EOL software versions detected in response headers.',
    eolFound.length > 0 ? 'Upgrade all server software to currently supported versions. EOL software cannot be patched and represents an ongoing vulnerability.' : undefined)

  // DASH-27: composer.json
  const composerStatus = await checkForExposedPath(url, '/composer.json')
  push(DASHBOARD_CHECKS[26], composerStatus === 'pass' ? 'pass' : composerStatus === 'fail' ? 'fail' : 'warning',
    composerStatus === 'pass' ? 'Dashboard /composer.json is not exposed.' : composerStatus === 'fail' ? '/composer.json publicly accessible — reveals all PHP dependencies and versions.' : '/composer.json returned 403.',
    composerStatus !== 'pass' ? 'Block access to /composer.json in server configuration.' : undefined)

  // DASH-28: storage/logs
  const logsStatus = await checkForExposedPath(url, '/storage/logs/laravel.log')
  push(DASHBOARD_CHECKS[27], logsStatus === 'pass' ? 'pass' : logsStatus === 'fail' ? 'fail' : 'warning',
    logsStatus === 'pass' ? 'Application logs are not publicly exposed.' : logsStatus === 'fail' ? 'Application logs are publicly accessible — may contain stack traces, credentials, and ePHI.' : 'Log path returned 403.',
    logsStatus !== 'pass' ? 'Block access to /storage/logs/ directory. Move logs outside the web root.' : undefined)

  return checks
}

function runUniversalChecks(): HIPAACheck[] {
  // These are attestation-required — we cannot verify them via scanning
  return UNIVERSAL_CHECKS.map(def => ({
    ...def,
    status: 'attestation-required' as const,
    detail: `This check requires organizational attestation. Cannot be verified via external scan.`,
    remediation: `Document and maintain ${def.name.toLowerCase()} per HIPAA ${def.ruleSection}.`,
  }))
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function computeScore(checks: HIPAACheck[], useNprm: boolean): number {
  let earned = 0
  let total = 0

  for (const c of checks) {
    const w = SEVERITY_WEIGHT[c.severity] || 2
    const rule = useNprm ? c.nprm2026 : c.currentRule
    if (rule === 'not-specified' && !useNprm) continue
    total += w
    if (c.status === 'pass') earned += w
    else if (c.status === 'warning') earned += w * 0.5
    else if (c.status === 'attestation-required') earned += w * 0.5
  }

  let rawScore = total === 0 ? 100 : Math.round((earned / total) * 100)

  // ── Hard Score Caps (from EMC methodology) ──
  // These override the weighted score when catastrophic findings exist
  const phpinfoExposed = checks.some(c => (c.id === 'PUB-15' || c.id === 'DASH-22') && c.status === 'fail')
  const eolSoftware = checks.some(c => c.id === 'DASH-26' && c.status === 'fail')
  const criticalCount = checks.filter(c => c.severity === 'critical' && c.status === 'fail').length
  const noMfa = checks.some(c => c.id === 'DASH-05' && (c.status === 'fail' || c.status === 'warning'))

  if (useNprm) {
    // 2026 NPRM caps (stricter)
    if (phpinfoExposed) rawScore = Math.min(rawScore, 20)
    if (eolSoftware) rawScore = Math.min(rawScore, 30)
    if (criticalCount >= 3) rawScore = Math.min(rawScore, 45)
    if (noMfa) rawScore = Math.min(rawScore, 50)
  } else {
    // Current rule caps
    if (phpinfoExposed) rawScore = Math.min(rawScore, 40)
    if (eolSoftware) rawScore = Math.min(rawScore, 55)
  }

  return rawScore
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runHIPAAScan(input: HIPAAInput): Promise<HIPAAResult> {
  const [publicChecks, dashboardChecks] = await Promise.all([
    runPublicChecks(input.publicUrl),
    runDashboardChecks(input.dashboardUrl),
  ])
  const universalChecks = runUniversalChecks()

  // Software supply chain (Spectra Assure Community API) — only when a
  // package list is supplied AND SPECTRA_ASSURE_TOKEN is configured.
  // Failure is non-fatal so the rest of the HIPAA assessment still completes.
  let supplyChainChecks: HIPAACheck[] | undefined
  let supplyChainReport: HIPAAResult['supplyChainReport']
  if (input.packages && input.packages.length > 0) {
    try {
      const { isSpectraAssureConfigured, bulkVersionReports, spectraAssureToHIPAAChecks, getAccount } = await import(
        './spectra-assure'
      )
      if (isSpectraAssureConfigured()) {
        const [reports, account] = await Promise.all([
          bulkVersionReports(input.packages),
          getAccount().catch(() => ({ tier: 'Community' } as { tier: string })),
        ])
        const valid = reports.filter((r): r is NonNullable<typeof r> => Boolean(r))
        supplyChainChecks = spectraAssureToHIPAAChecks(valid) as HIPAACheck[]
        supplyChainReport = {
          packagesScanned: valid.length,
          totalCves: valid.reduce((s, r) => s + r.vulnerabilities.total, 0),
          critical: valid.reduce((s, r) => s + (r.vulnerabilities.critical || 0), 0),
          high: valid.reduce((s, r) => s + (r.vulnerabilities.high || 0), 0),
          totalDependencies: valid.reduce((s, r) => s + r.dependencies, 0),
          apiTier: account.tier,
        }
      }
    } catch (err) {
      console.error('[hipaa] Spectra Assure scan failed:', err)
    }
  }

  const allChecks = [
    ...publicChecks,
    ...dashboardChecks,
    ...universalChecks,
    ...(supplyChainChecks || []),
  ]

  // 2026 executive-summary scoring engine — runs only when an attestation
  // is provided (Tier 4 reports). Pulls passive signals from the scan
  // (TLS version, detected trackers) and merges with customer attestation
  // for the fields a passive scan cannot observe (MFA method, log
  // retention, 72hr DR test, etc.).
  let executiveScore2026: HIPAAResult['executiveScore2026']
  if (input.attestation) {
    try {
      const { score2026, buildInputFromScan } = await import('./scoring-engine-2026')

      // Extract passive signals from check results
      const tlsCheck = publicChecks.find((c) => c.id === 'PUB-01')
      const tlsVersion = tlsCheck?.status === 'pass' ? '1.3' : undefined  // TODO: detect actual version
      const trackerCheck = publicChecks.find((c) => c.id === 'PUB-21')
      const hasPixels = trackerCheck?.status === 'fail' || trackerCheck?.status === 'warning'
      const detectedTrackers = hasPixels && trackerCheck
        ? trackerCheck.detail.match(/Meta Pixel|Google Analytics|TikTok|Hotjar|FullStory|Clarity/g) ?? undefined
        : undefined

      const merged = buildInputFromScan(
        { tlsVersion, hasPixels, detectedTrackers },
        input.attestation,
      )
      executiveScore2026 = score2026(merged)
    } catch (err) {
      console.error('[hipaa] 2026 scoring engine failed:', err)
    }
  }

  const currentRuleScore = computeScore(allChecks, false)
  const nprm2026Score = computeScore(allChecks, true)

  const criticalFindings = allChecks.filter(c => c.severity === 'critical' && (c.status === 'fail' || c.status === 'warning')).length
  const highFindings = allChecks.filter(c => c.severity === 'high' && (c.status === 'fail' || c.status === 'warning')).length
  const mediumFindings = allChecks.filter(c => c.severity === 'medium' && (c.status === 'fail' || c.status === 'warning')).length
  const lowFindings = allChecks.filter(c => c.severity === 'low' && (c.status === 'fail' || c.status === 'warning')).length
  const passCount = allChecks.filter(c => c.status === 'pass').length
  const failCount = allChecks.filter(c => c.status === 'fail').length

  // Build remediation priority
  const failedChecks = allChecks.filter(c => c.status === 'fail' || c.status === 'warning')
  failedChecks.sort((a, b) => (SEVERITY_WEIGHT[b.severity] || 0) - (SEVERITY_WEIGHT[a.severity] || 0))
  const remediationPriority = failedChecks.map((c, i) => ({
    priority: i + 1,
    checkId: c.id,
    name: c.name,
    effort: (PUBLIC_CHECKS.find(p => p.id === c.id) || DASHBOARD_CHECKS.find(p => p.id === c.id) || UNIVERSAL_CHECKS.find(p => p.id === c.id))?.effort || 'unknown',
    impact: (PUBLIC_CHECKS.find(p => p.id === c.id) || DASHBOARD_CHECKS.find(p => p.id === c.id) || UNIVERSAL_CHECKS.find(p => p.id === c.id))?.impact || 'unknown',
  }))

  // State overlay
  const stateCode = input.primaryState.toUpperCase().trim()
  const overlay = STATE_OVERLAYS[stateCode]
  const stateOverlay = overlay ? { state: stateCode, ...overlay } : undefined

  return {
    companyName: input.companyName,
    publicUrl: input.publicUrl,
    dashboardUrl: input.dashboardUrl,
    scanDate: new Date().toISOString(),
    auditor: '0nCore HIPAA Scanner v2.0',

    currentRuleScore,
    nprm2026Score,
    currentGrade: grade(currentRuleScore),
    nprmGrade: grade(nprm2026Score),

    publicChecks,
    dashboardChecks,
    universalChecks,
    supplyChainChecks,
    supplyChainReport,
    executiveScore2026,

    criticalFindings,
    highFindings,
    mediumFindings,
    lowFindings,
    passCount,
    failCount,

    stateOverlay,
    remediationPriority,
  }
}
