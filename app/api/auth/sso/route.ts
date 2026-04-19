import { NextRequest, NextResponse } from 'next/server'
import { createDecipheriv, createHash } from 'node:crypto'

// POST /api/auth/sso — Decrypt SSO data from CRM iframe
export async function POST(req: NextRequest) {
  try {
    const { key } = await req.json()
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    const ssoKey = process.env.GHL_APP_SSO_KEY
    if (!ssoKey) return NextResponse.json({ error: 'SSO not configured' }, { status: 500 })

    // Decrypt using the same algorithm as the CRM marketplace template
    const blockSize = 16
    const keySize = 32
    const ivSize = 16
    const saltSize = 8

    const rawEncryptedData = Buffer.from(key, 'base64')
    const salt = rawEncryptedData.subarray(saltSize, blockSize)
    const cipherText = rawEncryptedData.subarray(blockSize)

    let result = Buffer.alloc(0, 0)
    while (result.length < (keySize + ivSize)) {
      const hasher = createHash('md5')
      result = Buffer.concat([
        result,
        hasher.update(Buffer.concat([
          result.subarray(-ivSize),
          Buffer.from(ssoKey, 'utf-8'),
          salt
        ])).digest()
      ])
    }

    const decipher = createDecipheriv(
      'aes-256-cbc',
      result.subarray(0, keySize),
      result.subarray(keySize, keySize + ivSize)
    )

    const decrypted = decipher.update(cipherText)
    const finalDecrypted = Buffer.concat([decrypted, decipher.final()])
    const userData = JSON.parse(finalDecrypted.toString())

    return NextResponse.json(userData)
  } catch (error) {
    console.error('[sso] Decryption failed:', error)
    return NextResponse.json({ error: 'SSO decryption failed' }, { status: 400 })
  }
}
