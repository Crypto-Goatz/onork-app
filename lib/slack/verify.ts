/**
 * Slack request signature verification.
 *
 * Per Slack docs: every request from Slack carries `x-slack-signature`
 * and `x-slack-request-timestamp` headers. The signature is HMAC-SHA256
 * over `v0:<timestamp>:<raw body>` using SLACK_SIGNING_SECRET.
 *
 * Reject:
 *   - missing headers
 *   - timestamps older than 5 minutes (replay protection)
 *   - signatures that don't match (using timing-safe comparison)
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const SLACK_VERSION = 'v0'
export const MAX_AGE_SECONDS = 60 * 5

export interface VerifyResult {
  ok: boolean
  reason?: string
}

export function verifySlackRequest(
  headers: Headers | Record<string, string | undefined>,
  rawBody: string,
): VerifyResult {
  const secret = process.env.SLACK_SIGNING_SECRET
  if (!secret) return { ok: false, reason: 'SLACK_SIGNING_SECRET missing on server' }

  const get = (name: string) =>
    headers instanceof Headers ? headers.get(name) : headers[name.toLowerCase()] ?? headers[name]

  const ts = get('x-slack-request-timestamp')
  const sig = get('x-slack-signature')
  if (!ts || !sig) return { ok: false, reason: 'missing slack signature headers' }

  const tsNum = Number(ts)
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'bad timestamp' }
  const ageS = Math.abs(Math.floor(Date.now() / 1000) - tsNum)
  if (ageS > MAX_AGE_SECONDS) return { ok: false, reason: 'request too old' }

  const baseString = `${SLACK_VERSION}:${ts}:${rawBody}`
  const expected = `${SLACK_VERSION}=${createHmac('sha256', secret).update(baseString).digest('hex')}`

  let match = false
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    match = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    match = false
  }
  return match ? { ok: true } : { ok: false, reason: 'signature mismatch' }
}
