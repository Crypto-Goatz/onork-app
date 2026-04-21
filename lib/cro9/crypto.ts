/**
 * AES-256-GCM for per-site secrets (mostly the user's SerpAPI key).
 *
 * Key lives in CRO9_ENCRYPTION_KEY (32 bytes hex). Auto-fallback to
 * DATA_ENCRYPTION_KEY if the dedicated key is missing (safe rotation).
 */

import crypto from 'node:crypto'

function getKey(): Buffer {
  const raw = process.env.CRO9_ENCRYPTION_KEY || process.env.DATA_ENCRYPTION_KEY
  if (!raw) throw new Error('CRO9_ENCRYPTION_KEY or DATA_ENCRYPTION_KEY env var required')
  if (raw.length === 64) return Buffer.from(raw, 'hex')       // 32-byte hex
  if (raw.length === 44) return Buffer.from(raw, 'base64')    // 32-byte base64
  throw new Error('CRO9_ENCRYPTION_KEY must be 32 bytes (hex or base64)')
}

export function encryptSecret(plain: string | null | undefined): string | null {
  if (!plain) return null
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${enc.toString('base64url')}`
}

export function decryptSecret(payload: string | null | undefined): string | null {
  if (!payload) return null
  const parts = payload.split(':')
  if (parts.length !== 4 || parts[0] !== 'v1') return null
  try {
    const iv = Buffer.from(parts[1], 'base64url')
    const tag = Buffer.from(parts[2], 'base64url')
    const ct = Buffer.from(parts[3], 'base64url')
    const d = crypto.createDecipheriv('aes-256-gcm', getKey(), iv)
    d.setAuthTag(tag)
    const out = Buffer.concat([d.update(ct), d.final()])
    return out.toString('utf8')
  } catch {
    return null
  }
}

export function maskSecret(secret: string | null | undefined, visible = 4): string {
  if (!secret) return ''
  if (secret.length <= visible * 2) return '•'.repeat(secret.length)
  return secret.slice(0, visible) + '•'.repeat(Math.max(4, secret.length - visible * 2)) + secret.slice(-visible)
}
