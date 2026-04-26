/**
 * HIPAA 2026 Scoring Engine — TypeScript port of the executive-summary
 * weighted scoring model.
 *
 * Five weighted domains:
 *   1. Authentication (30%)  — FIDO2/WebAuthn focus
 *   2. Encryption     (20%)  — TLS 1.3 + AES-256-GCM
 *   3. Web Privacy    (20%)  — Pixel / server-side GTM
 *   4. Integrity      (20%)  — Immutable WORM logs + 365d retention
 *   5. Resilience     (10%)  — 72hr restoration tested
 *
 * Compliant threshold: 85+
 *
 * Used by Tier 4 HIPAA reports as an executive-summary roll-up that
 * sits on top of the granular 63-check passive scanner. Inputs come
 * partly from passive scan (encryption.tls_version, logging hints)
 * and partly from a customer attestation form (mfa_method,
 * retention_days, tested_72hr_recovery).
 */

export type AuthMethod = 'fido2' | 'totp' | 'sms' | 'none' | string

export interface HIPAA2026Input {
  authentication?: {
    mfa_enforced?: boolean
    mfa_method?: AuthMethod
    /** Optional: passwordless / WebAuthn registered devices count */
    passwordless_count?: number
  }
  encryption?: {
    /** "1.3", "1.2", or older */
    tls_version?: string
    /** "AES-256-GCM" required for full credit */
    algorithm?: string
    /** Optional: HSM / KMS in use */
    key_management?: 'hsm' | 'kms' | 'software' | string
  }
  web_privacy?: {
    has_pixels?: boolean
    server_side_gtm?: boolean
    /** Optional: which pixels were detected */
    detected_trackers?: string[]
  }
  logging?: {
    is_immutable?: boolean
    retention_days?: number
    /** Optional: log shipping target — "splunk" | "datadog" | "s3-glacier" | etc. */
    storage_target?: string
  }
  resilience?: {
    tested_72hr_recovery?: boolean
    /** Optional: most recent DR test ISO date */
    last_dr_test?: string
    /** Optional: RTO in hours */
    rto_hours?: number
  }
}

export interface RoadmapItem {
  priority: 'P0' | 'P1' | 'P2'
  task: string
  domain: keyof HIPAA2026Result['breakdown']
}

export interface HIPAA2026Result {
  overall_score: number
  status: 'COMPLIANT' | 'NON_COMPLIANT'
  breakdown: {
    authentication: number
    encryption: number
    web_privacy: number
    integrity: number
    resilience: number
  }
  remediation_roadmap: RoadmapItem[]
  timestamp: string
}

const WEIGHTS = {
  authentication: 0.30,
  encryption: 0.20,
  web_privacy: 0.20,
  integrity: 0.20,
  resilience: 0.10,
} as const

const METHOD_SCORES: Record<string, number> = {
  fido2: 1.0,
  webauthn: 1.0,
  totp: 0.7,
  hotp: 0.7,
  sms: 0.3,
  email: 0.2,
  none: 0,
}

export function score2026(data: HIPAA2026Input = {}): HIPAA2026Result {
  const scores = {
    authentication: 0,
    encryption: 0,
    web_privacy: 0,
    integrity: 0,
    resilience: 0,
  }
  const roadmap: RoadmapItem[] = []

  // --------------------------------------------------------------------
  // 1. Authentication (30%) — FIDO2/WebAuthn focus
  // --------------------------------------------------------------------
  const auth = data.authentication ?? {}
  if (!auth.mfa_enforced) {
    scores.authentication = 0
    roadmap.push({
      priority: 'P0',
      task: 'Enforce mandatory MFA for all ePHI access. FIDO2/WebAuthn preferred.',
      domain: 'authentication',
    })
  } else {
    const method = (auth.mfa_method ?? 'none').toLowerCase()
    const base = METHOD_SCORES[method] ?? 0
    scores.authentication = base * 100
    if (base < 0.7) {
      roadmap.push({
        priority: 'P1',
        task: `MFA method "${auth.mfa_method}" is below recommended strength. Migrate to FIDO2/WebAuthn (passkeys).`,
        domain: 'authentication',
      })
    } else if (base < 1.0) {
      roadmap.push({
        priority: 'P2',
        task: `Consider upgrading from ${auth.mfa_method?.toUpperCase()} to FIDO2/WebAuthn for phishing resistance.`,
        domain: 'authentication',
      })
    }
  }

  // --------------------------------------------------------------------
  // 2. Encryption (20%) — TLS 1.3 + AES-256-GCM
  // --------------------------------------------------------------------
  const enc = data.encryption ?? {}
  const tlsVal =
    enc.tls_version === '1.3' ? 1.0 : enc.tls_version === '1.2' ? 0.7 : 0
  const atRest = enc.algorithm === 'AES-256-GCM' ? 1.0 : 0
  scores.encryption = ((tlsVal + atRest) / 2) * 100

  if (tlsVal < 0.7) {
    roadmap.push({
      priority: 'P0',
      task: 'Upgrade to TLS 1.2+ immediately. TLS 1.0/1.1 are deprecated.',
      domain: 'encryption',
    })
  } else if (tlsVal < 1.0) {
    roadmap.push({
      priority: 'P2',
      task: 'Upgrade from TLS 1.2 to TLS 1.3 for forward secrecy and post-handshake auth.',
      domain: 'encryption',
    })
  }
  if (atRest < 1.0) {
    roadmap.push({
      priority: 'P0',
      task: 'Enforce AES-256-GCM for all ePHI at rest. Document key rotation cadence.',
      domain: 'encryption',
    })
  }

  // --------------------------------------------------------------------
  // 3. Web Privacy (20%) — Pixel / Server-side GTM
  // --------------------------------------------------------------------
  const web = data.web_privacy ?? {}
  if (web.has_pixels && !web.server_side_gtm) {
    scores.web_privacy = 0
    const trackerList = web.detected_trackers?.length
      ? ` Detected: ${web.detected_trackers.join(', ')}.`
      : ''
    roadmap.push({
      priority: 'P1',
      task: `Implement server-side GTM to scrub PHI before vendor transmission.${trackerList} Replace any direct pixel/SDK that runs in the browser.`,
      domain: 'web_privacy',
    })
  } else {
    scores.web_privacy = 100
  }

  // --------------------------------------------------------------------
  // 4. Integrity / Logs (20%) — Immutable WORM + 365d retention
  // --------------------------------------------------------------------
  const logs = data.logging ?? {}
  if (logs.is_immutable && (logs.retention_days ?? 0) >= 365) {
    scores.integrity = 100
  } else if (logs.is_immutable || (logs.retention_days ?? 0) >= 365) {
    scores.integrity = 50
    if (!logs.is_immutable) {
      roadmap.push({
        priority: 'P1',
        task: 'Move audit logs to immutable WORM storage (S3 Object Lock / Glacier / Splunk WORM).',
        domain: 'integrity',
      })
    }
    if ((logs.retention_days ?? 0) < 365) {
      roadmap.push({
        priority: 'P1',
        task: `Increase log retention to >=365 days (currently ${logs.retention_days ?? 0}). Recommended: 6 years per 164.316(b).`,
        domain: 'integrity',
      })
    }
  } else {
    scores.integrity = 0
    roadmap.push({
      priority: 'P0',
      task: 'No immutable + 365d-retained audit logs. Ship to WORM-compliant storage immediately.',
      domain: 'integrity',
    })
  }

  // --------------------------------------------------------------------
  // 5. Resilience (10%) — 72hr restoration tested
  // --------------------------------------------------------------------
  const res = data.resilience ?? {}
  scores.resilience = res.tested_72hr_recovery ? 100 : 0
  if (!res.tested_72hr_recovery) {
    roadmap.push({
      priority: 'P1',
      task: 'Run a documented 72-hour disaster-recovery restoration test. Capture RTO/RPO. Repeat annually.',
      domain: 'resilience',
    })
  } else if (res.rto_hours && res.rto_hours > 24) {
    roadmap.push({
      priority: 'P2',
      task: `Current RTO is ${res.rto_hours}h. Target <24h for ePHI-critical systems.`,
      domain: 'resilience',
    })
  }

  // --------------------------------------------------------------------
  // Final weighted score
  // --------------------------------------------------------------------
  const finalScore =
    scores.authentication * WEIGHTS.authentication +
    scores.encryption * WEIGHTS.encryption +
    scores.web_privacy * WEIGHTS.web_privacy +
    scores.integrity * WEIGHTS.integrity +
    scores.resilience * WEIGHTS.resilience

  // Sort roadmap P0 → P1 → P2
  const priorityOrder: Record<RoadmapItem['priority'], number> = {
    P0: 0,
    P1: 1,
    P2: 2,
  }
  roadmap.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return {
    overall_score: Math.round(finalScore * 100) / 100,
    status: finalScore >= 85 ? 'COMPLIANT' : 'NON_COMPLIANT',
    breakdown: scores,
    remediation_roadmap: roadmap,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Hybrid: combine passive-scan observations (already collected by
 * runHIPAAScan) with customer attestations into a 2026-engine input.
 *
 * Pass attestation as an override for fields the passive scanner
 * cannot detect (auth method, log retention, DR test, etc.).
 */
export function buildInputFromScan(
  passiveSignals: {
    tlsVersion?: string
    detectedTrackers?: string[]
    hasPixels?: boolean
  },
  attestation: HIPAA2026Input = {},
): HIPAA2026Input {
  return {
    authentication: attestation.authentication ?? {},
    encryption: {
      tls_version: passiveSignals.tlsVersion,
      ...attestation.encryption,
    },
    web_privacy: {
      has_pixels:
        attestation.web_privacy?.has_pixels ?? passiveSignals.hasPixels,
      server_side_gtm: attestation.web_privacy?.server_side_gtm,
      detected_trackers:
        attestation.web_privacy?.detected_trackers ??
        passiveSignals.detectedTrackers,
    },
    logging: attestation.logging ?? {},
    resilience: attestation.resilience ?? {},
  }
}
