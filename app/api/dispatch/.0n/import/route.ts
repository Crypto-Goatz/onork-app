/**
 * POST /api/dispatch/.0n/import — admin-only signed .0n importer
 *
 * Verifies the signature against /.well-known/dispatch.pub before doing
 * anything. Records the import in dispatch_audit_log with the admin's
 * identity. Per blueprint security policy: any unverified .0n is rejected
 * AND raises a critical alert (sig_mismatch).
 *
 * Body: { content: string }     // raw .0n file body
 * Returns: { ok, type, source_sha } on success
 *          { error, alert_id }   on failure
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyDotOn, writeClient, DISPATCH_CACHE_HEADERS } from '@/lib/dispatch'
import { verifyAdmin } from '@/lib/admin-gate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin()
  if (!admin.ok) {
    return NextResponse.json({ error: admin.error || 'forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as { content?: string }
  if (!body.content) {
    return NextResponse.json({ error: 'missing content' }, { status: 400 })
  }

  const result = await verifyDotOn(body.content)
  if (!result.valid) {
    // raise an alert + audit log row before returning
    const sb = writeClient()
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
    const ua = req.headers.get('user-agent') || ''
    const { data: alert } = await sb
      .from('dispatch_alerts')
      .insert({
        kind: 'sig_mismatch',
        severity: 'critical',
        message: `.0n import signature failed: ${result.reason}`,
        meta: { admin_user_id: admin.userId, ip, ua },
        triggered_lockdown: true,
      })
      .select('id')
      .single()
    await sb.from('dispatch_audit_log').insert({
      admin_user_id: admin.userId,
      action: 'import',
      meta: { reason: result.reason, success: false },
      ip,
      user_agent: ua,
    })
    return NextResponse.json(
      { error: result.reason || 'invalid signature', alert_id: alert?.id },
      { status: 422 },
    )
  }

  // valid signature — log the import. v1 stops here. Phase 7 admin panel will
  // push the imported content back to the dispatch repo via GitHub API.
  const sb = writeClient()
  await sb.from('dispatch_audit_log').insert({
    admin_user_id: admin.userId,
    action: 'import',
    section: result.type,
    sha_before: null,
    sha_after: result.source_sha ?? null,
    meta: { success: true },
    ip: req.headers.get('x-forwarded-for') || '',
    user_agent: req.headers.get('user-agent') || '',
  })

  return NextResponse.json(
    { ok: true, type: result.type, source_sha: result.source_sha },
    { headers: DISPATCH_CACHE_HEADERS },
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: DISPATCH_CACHE_HEADERS })
}
