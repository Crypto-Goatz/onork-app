/**
 * Spectra Assure (secure.software / ReversingLabs) Community API client.
 *
 * Token format: `rlcmm-...` (Community Integration tier).
 * Base URL: https://data.reversinglabs.com/api/oss/community/v2/free/
 *
 * Looks up published npm / pypi / nuget / maven packages in the
 * pre-scanned ReversingLabs catalog and surfaces malware, CVE,
 * license, and behavioral findings into the HIPAA assessment.
 *
 * Quota: 100,000 requests/month per Community token.
 *
 * Docs: https://docs.secure.software/community/api-reference/
 */

const BASE_URL = (process.env.SPECTRA_ASSURE_HOST ||
  'https://data.reversinglabs.com/api/oss/community/v2/free').replace(/\/$/, '')
const TOKEN = process.env.SPECTRA_ASSURE_TOKEN || ''

export type CommunityRepo = 'npm' | 'pypi' | 'nuget' | 'maven' | 'gem' | 'composer' | 'cargo'

export interface SpectraPackageVersionReport {
  purl: string
  package: string
  version: string
  repo: CommunityRepo
  publishedAt?: string
  riskScore?: number
  /** Total CVE count, with severity breakdown when available. */
  vulnerabilities: {
    total: number
    critical?: number
    high?: number
    medium?: number
    low?: number
  }
  /** License classification counts (undeclared, copyleft, etc). */
  licenses: Record<string, number>
  components: number
  dependencies: number
  /** Behavior / policy violations the report surfaces. */
  violations: Array<{ id: string; severity: string; title: string; description?: string }>
  /** Raw report JSON, kept for full Tier 4 reports + audit retention. */
  raw: unknown
}

export interface SpectraAccount {
  name: string
  email: string
  company: string
  tier: string
  apiRequestsUsed: number
  apiRequestsAllowed: number
}

export function isSpectraAssureConfigured(): boolean {
  return Boolean(TOKEN)
}

function authHeaders(): HeadersInit {
  if (!TOKEN) throw new Error('SPECTRA_ASSURE_TOKEN env var not set')
  return {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/json',
  }
}

/**
 * Verify token + return account/quota info.
 */
export async function getAccount(): Promise<SpectraAccount> {
  const res = await fetch(`${BASE_URL}/user/account`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Spectra Assure /user/account failed: ${res.status}`)
  const data = (await res.json()) as { account: Record<string, unknown> }
  const a = data.account as Record<string, unknown>
  const sub = (a.subscription || {}) as Record<string, unknown>
  const ent = ((a.entitlements as Record<string, unknown>) || {}) as Record<string, unknown>
  const reqs = (ent.api_requests || {}) as Record<string, unknown>
  return {
    name: String(a.name || ''),
    email: String(a.email || ''),
    company: String(a.company || ''),
    tier: String(sub.tier || 'Community'),
    apiRequestsUsed: Number(reqs.used || 0),
    apiRequestsAllowed: Number(reqs.allowed || 0),
  }
}

/**
 * Build a PURL path segment for the report endpoints.
 * Examples:
 *   npm:        pkg:npm/0nmcp@4.5.1
 *   pypi:       pkg:pypi/numpy@1.26.0
 *   namespaced: pkg:npm/@ampproject/remapping@2.3.0
 */
function purlPath(repo: CommunityRepo, namespace: string | undefined, pkg: string, version?: string): string {
  const ns = namespace ? `${namespace}/` : ''
  const ver = version ? `@${version}` : ''
  return `pkg:${repo}/${ns}${pkg}${ver}`
}

/**
 * Get a single version's full security report.
 */
export async function getVersionReport(
  repo: CommunityRepo,
  pkg: string,
  version?: string,
  namespace?: string,
): Promise<SpectraPackageVersionReport> {
  const path = purlPath(repo, namespace, pkg, version)
  const res = await fetch(`${BASE_URL}/report/version/${path}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(`Spectra Assure version report failed (${res.status}) for ${path}`)
  const raw = (await res.json()) as Record<string, unknown>
  return normalizeVersionReport(raw, repo, namespace, pkg, version)
}

function normalizeVersionReport(
  raw: Record<string, unknown>,
  repo: CommunityRepo,
  namespace: string | undefined,
  pkg: string,
  version?: string,
): SpectraPackageVersionReport {
  const community = (raw.community || {}) as Record<string, unknown>
  const report = (community.report || raw) as Record<string, unknown>
  const info = (report.info || {}) as Record<string, unknown>
  const file = (info.file || {}) as Record<string, unknown>
  const identity = (file.identity || {}) as Record<string, unknown>
  const stats = (report.statistics || {}) as Record<string, unknown>
  const vulns = (stats.vulnerabilities || {}) as Record<string, unknown>
  const licenses = (stats.license || {}) as Record<string, number>
  const violations = ((report.violations as Array<Record<string, unknown>>) || []).map((v, i) => ({
    id: String(v.id || `${pkg}-${i}`),
    severity: String(v.severity || 'medium'),
    title: String(v.title || v.name || 'Untitled finding'),
    description: v.description ? String(v.description) : undefined,
  }))

  return {
    purl: String(identity.purl || purlPath(repo, namespace, pkg, version)),
    package: String(identity.package || pkg),
    version: String(identity.version || version || ''),
    repo: (String(identity.community || repo) as CommunityRepo),
    publishedAt: identity.published ? String(identity.published) : undefined,
    riskScore: typeof report.risk_score === 'number' ? Number(report.risk_score) : undefined,
    vulnerabilities: {
      total: Number(vulns.total || 0),
      critical: vulns.critical ? Number(vulns.critical) : undefined,
      high: vulns.high ? Number(vulns.high) : undefined,
      medium: vulns.medium ? Number(vulns.medium) : undefined,
      low: vulns.low ? Number(vulns.low) : undefined,
    },
    licenses: licenses as Record<string, number>,
    components: Number(stats.components || 0),
    dependencies: Number(stats.dependencies || 0),
    violations,
    raw,
  }
}

/**
 * Bulk lookup multiple packages. Each object can specify `repo`, `pkg`,
 * optional `version`, and optional `namespace`. Errors per-package are
 * caught and returned as null so a single bad package does not poison
 * the whole HIPAA scan.
 */
export async function bulkVersionReports(
  refs: Array<{ repo: CommunityRepo; pkg: string; version?: string; namespace?: string }>,
): Promise<Array<SpectraPackageVersionReport | null>> {
  return Promise.all(
    refs.map((r) =>
      getVersionReport(r.repo, r.pkg, r.version, r.namespace).catch((err) => {
        console.error(`[spectra-assure] lookup failed for pkg:${r.repo}/${r.pkg}@${r.version || 'latest'}:`, err)
        return null
      }),
    ),
  )
}

// ---------------------------------------------------------------------------
// HIPAA mapping
// ---------------------------------------------------------------------------

type Severity = 'critical' | 'high' | 'medium' | 'low'

interface HIPAACheckLite {
  id: string
  name: string
  ruleSection: string
  severity: Severity
  category: 'technical' | 'administrative' | 'physical' | 'organizational'
  currentRule: 'required' | 'addressable' | 'not-specified'
  nprm2026: 'required' | 'addressable-removed' | 'new-requirement'
  status: 'pass' | 'fail' | 'warning' | 'attestation-required'
  detail: string
  remediation?: string
}

/**
 * Aggregate one or more package reports into HIPAA Security Rule checks.
 * Use this when scanning a healthcare app's dependency tree (npm/pypi).
 */
export function spectraAssureToHIPAAChecks(
  reports: SpectraPackageVersionReport[],
): HIPAACheckLite[] {
  const checks: HIPAACheckLite[] = []
  if (reports.length === 0) return checks

  const totalCves = reports.reduce((s, r) => s + r.vulnerabilities.total, 0)
  const critical = reports.reduce((s, r) => s + (r.vulnerabilities.critical || 0), 0)
  const high = reports.reduce((s, r) => s + (r.vulnerabilities.high || 0), 0)
  const malwareViolations = reports.flatMap((r) => r.violations).filter((v) => /malware|trojan|backdoor/i.test(v.title))
  const tamperingViolations = reports.flatMap((r) => r.violations).filter((v) => /tamper|integrity|unsigned/i.test(v.title))
  const secretViolations = reports.flatMap((r) => r.violations).filter((v) => /secret|credential|api[_ ]key|token/i.test(v.title))
  const copyleftLicenses = reports.reduce((s, r) => s + Number(r.licenses?.copyleft || 0) + Number(r.licenses?.weak_copyleft || 0), 0)
  const undeclaredLicenses = reports.reduce((s, r) => s + Number(r.licenses?.undeclared || 0), 0)
  const totalDependencies = reports.reduce((s, r) => s + r.dependencies, 0)

  checks.push({
    id: 'spectra-malware',
    name: 'Software Supply Chain — Malware Scan (Spectra Assure)',
    ruleSection: '164.308(a)(1)(ii)(A) — Risk Analysis',
    severity: malwareViolations.length ? 'critical' : 'low',
    category: 'technical',
    currentRule: 'required',
    nprm2026: 'required',
    status: malwareViolations.length ? 'fail' : 'pass',
    detail: malwareViolations.length
      ? `${malwareViolations.length} malware indicator(s) detected across ${reports.length} scanned package(s).`
      : `No malware detected across ${reports.length} scanned package(s) (Spectra Assure pre-scan catalog).`,
    remediation: malwareViolations.length
      ? 'Quarantine artifact, replace flagged dependency, rotate credentials, and file BAA breach review per 164.408.'
      : undefined,
  })

  checks.push({
    id: 'spectra-vulnerabilities',
    name: 'Software Supply Chain — Known Vulnerabilities (CVEs)',
    ruleSection: '164.308(a)(1)(ii)(A) — Risk Analysis',
    severity: critical ? 'critical' : high ? 'high' : totalCves ? 'medium' : 'low',
    category: 'technical',
    currentRule: 'required',
    nprm2026: 'required',
    status: critical || high ? 'fail' : totalCves ? 'warning' : 'pass',
    detail: totalCves
      ? `${totalCves} CVE(s) across ${totalDependencies} dependencies — ${critical} critical, ${high} high.`
      : `No known CVEs across ${totalDependencies} dependencies.`,
    remediation: totalCves
      ? 'Patch or replace flagged dependencies. Document any deferred items in the Risk Register with risk-acceptance signature.'
      : undefined,
  })

  checks.push({
    id: 'spectra-secrets',
    name: 'Software Supply Chain — Embedded Secrets',
    ruleSection: '164.312(a)(1) — Access Control',
    severity: secretViolations.length ? 'high' : 'low',
    category: 'technical',
    currentRule: 'required',
    nprm2026: 'required',
    status: secretViolations.length ? 'fail' : 'pass',
    detail: secretViolations.length
      ? `${secretViolations.length} hard-coded secret indicator(s) detected — direct access-control violation under 164.312(a)(1).`
      : 'No embedded secrets detected in scanned packages.',
    remediation: secretViolations.length
      ? 'Rotate every exposed credential immediately. Move to Vault/secret manager. Document rotation in audit log.'
      : undefined,
  })

  checks.push({
    id: 'spectra-tampering',
    name: 'Software Supply Chain — Integrity / Tampering',
    ruleSection: '164.312(c)(1) — Integrity',
    severity: tamperingViolations.length ? 'critical' : 'low',
    category: 'technical',
    currentRule: 'required',
    nprm2026: 'required',
    status: tamperingViolations.length ? 'fail' : 'pass',
    detail: tamperingViolations.length
      ? `${tamperingViolations.length} tampering / unsigned-binary indicator(s) detected.`
      : 'Package integrity verified — no tampering indicators in scanned dependencies.',
    remediation: tamperingViolations.length
      ? 'Reject artifact. Verify build pipeline integrity. Require code signing on all production artifacts.'
      : undefined,
  })

  checks.push({
    id: 'spectra-licenses',
    name: 'Software Supply Chain — License Compliance',
    ruleSection: '164.308(b)(1) — Business Associate Contracts',
    severity: copyleftLicenses + undeclaredLicenses > 0 ? 'medium' : 'low',
    category: 'organizational',
    currentRule: 'addressable',
    nprm2026: 'required',
    status: copyleftLicenses + undeclaredLicenses > 0 ? 'warning' : 'pass',
    detail:
      copyleftLicenses + undeclaredLicenses > 0
        ? `${copyleftLicenses} copyleft + ${undeclaredLicenses} undeclared license(s) detected — review GPL / AGPL entries before BAA execution.`
        : 'License compliance verified across scanned dependencies.',
    remediation:
      copyleftLicenses + undeclaredLicenses > 0
        ? 'Replace flagged dependencies or document license obligations in your BAA addendum.'
        : undefined,
  })

  checks.push({
    id: 'spectra-sbom',
    name: 'Software Supply Chain — SBOM Available',
    ruleSection: '164.308(a)(8) — Evaluation',
    severity: 'low',
    category: 'administrative',
    currentRule: 'addressable',
    nprm2026: 'required',
    status: reports.length > 0 ? 'pass' : 'warning',
    detail:
      reports.length > 0
        ? `SBOM-equivalent inventory generated for ${reports.length} package(s) via Spectra Assure Community catalog. Retain for 6 years per 164.316(b).`
        : 'No SBOM produced — required for HIPAA NPRM 2026 evaluation evidence.',
    remediation:
      reports.length > 0
        ? undefined
        : 'Re-scan with package list provided and retain SBOM for 6 years per HIPAA records-retention rule.',
  })

  return checks
}
