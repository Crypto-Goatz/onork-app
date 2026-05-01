/**
 * Registry install gate — single source of truth for whether an item is
 * safe to install. Wraps the VirusTotal client and persists results to
 * `registry_security_scans`.
 *
 * Policy:
 *   - PASSED   → install allowed
 *   - FLAGGED  → install BLOCKED, reason surfaced in UI
 *   - PENDING  → install BLOCKED until scan completes (re-check)
 *   - ERROR    → install BLOCKED with a "rescan" button
 *   - SKIPPED  → no scanner configured. Treat as "passed" only when
 *                NEXT_PUBLIC_REGISTRY_GATE_MODE === 'permissive' (dev).
 *
 * Scans are cached for 7 days (expires_at). Re-scan if expired or forced.
 */

import { createClient } from '@supabase/supabase-js'
import { scanUrl, scanFileBySha256, type ScanVerdict } from './virustotal'

export type TargetType = 'mcp' | 'ucp_product' | 'marketplace_app' | 'user_mcp' | 'extension'
export type ScanStatus = 'pending' | 'passed' | 'flagged' | 'error' | 'skipped'

const CACHE_DAYS = 7

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

export interface RegistryScanRow {
  id: string
  target_type: TargetType
  target_id: string
  target_url: string | null
  target_hash: string | null
  scanner: string
  status: ScanStatus
  engines_total: number
  engines_flagged: number
  threat_categories: string[]
  raw_response: unknown
  scanned_at: string
  expires_at: string | null
}

export async function getLatestScan(
  targetType: TargetType,
  targetId: string,
  scanner = 'virustotal',
): Promise<RegistryScanRow | null> {
  const sb = admin()
  const { data } = await sb
    .from('registry_security_scans')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('scanner', scanner)
    .maybeSingle<RegistryScanRow>()
  return data
}

export interface ScanRequest {
  target_type: TargetType
  target_id: string
  target_url?: string
  target_hash?: string
  force?: boolean
}

export interface ScanResult {
  scan: RegistryScanRow
  fresh: boolean
}

export async function runScan(req: ScanRequest): Promise<ScanResult> {
  const sb = admin()
  const scanner = 'virustotal'

  // 1. Check cache unless force
  const existing = await getLatestScan(req.target_type, req.target_id, scanner)
  if (existing && !req.force) {
    const stillFresh = existing.expires_at && new Date(existing.expires_at).getTime() > Date.now()
    if (stillFresh && existing.status !== 'pending' && existing.status !== 'error') {
      return { scan: existing, fresh: false }
    }
  }

  // 2. Run the scan
  let verdict: ScanVerdict
  if (req.target_hash) {
    verdict = await scanFileBySha256(req.target_hash)
    if (verdict.status === 'pending' && req.target_url) {
      // No file report yet — fall back to URL scan if available
      verdict = await scanUrl(req.target_url)
    }
  } else if (req.target_url) {
    verdict = await scanUrl(req.target_url)
  } else {
    verdict = {
      status: 'error',
      engines_total: 0,
      engines_flagged: 0,
      threat_categories: [],
      raw: null,
      reason: 'target_url or target_hash required',
    }
  }

  // 3. Upsert
  const expiresAt = new Date(Date.now() + CACHE_DAYS * 24 * 3600 * 1000).toISOString()
  const row = {
    target_type: req.target_type,
    target_id: req.target_id,
    target_url: req.target_url || null,
    target_hash: req.target_hash || null,
    scanner,
    status: verdict.status,
    engines_total: verdict.engines_total,
    engines_flagged: verdict.engines_flagged,
    threat_categories: verdict.threat_categories,
    raw_response: verdict.raw ?? null,
    scanned_at: new Date().toISOString(),
    expires_at: expiresAt,
  }

  const { data, error } = await sb
    .from('registry_security_scans')
    .upsert(row, { onConflict: 'target_type,target_id,scanner' })
    .select('*')
    .single<RegistryScanRow>()

  if (error || !data) {
    throw new Error(`scan persist failed: ${error?.message || 'no row'}`)
  }
  return { scan: data, fresh: true }
}

// ─── Install gate ────────────────────────────────────────────────────────────
export interface GateResult {
  allowed: boolean
  reason?: string
  status: ScanStatus
  engines_flagged: number
  engines_total: number
  threat_categories: string[]
  scan_id?: string
  scanned_at?: string
}

export function evaluateGate(scan: RegistryScanRow | null): GateResult {
  if (!scan) {
    return {
      allowed: false,
      reason: 'No security scan on file. Run a scan before installing.',
      status: 'pending',
      engines_flagged: 0,
      engines_total: 0,
      threat_categories: [],
    }
  }

  const base = {
    scan_id: scan.id,
    status: scan.status,
    engines_flagged: scan.engines_flagged,
    engines_total: scan.engines_total,
    threat_categories: scan.threat_categories || [],
    scanned_at: scan.scanned_at,
  }

  if (scan.status === 'passed') return { allowed: true, ...base }
  if (scan.status === 'flagged') {
    return {
      allowed: false,
      reason: `Flagged by ${scan.engines_flagged}/${scan.engines_total} engines: ${(scan.threat_categories || []).slice(0, 3).join(', ') || 'unknown'}`,
      ...base,
    }
  }
  if (scan.status === 'pending') {
    return { allowed: false, reason: 'Scan still running — re-check in a few seconds.', ...base }
  }
  if (scan.status === 'error') {
    return { allowed: false, reason: 'Scanner error — re-run scan before installing.', ...base }
  }
  if (scan.status === 'skipped') {
    const permissive = process.env.NEXT_PUBLIC_REGISTRY_GATE_MODE === 'permissive'
    return {
      allowed: permissive,
      reason: permissive
        ? 'No scanner configured (permissive mode).'
        : 'Scanner not configured — set VIRUSTOTAL_API_KEY.',
      ...base,
    }
  }

  return { allowed: false, reason: `Unknown scan status: ${scan.status}`, ...base }
}
