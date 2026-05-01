/**
 * GET /api/security/scan/[targetType]/[targetId]
 *
 * Read latest scan + gate decision for a registry target.
 * No auth required — scan results are public-readable.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getLatestScan, evaluateGate, type TargetType } from '@/lib/security/registry-scan'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TARGET_TYPES: TargetType[] = ['mcp', 'ucp_product', 'marketplace_app', 'user_mcp', 'extension']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ targetType: string; targetId: string }> },
) {
  const { targetType, targetId } = await params
  if (!TARGET_TYPES.includes(targetType as TargetType)) {
    return NextResponse.json(
      { error: `target_type must be one of ${TARGET_TYPES.join(', ')}` },
      { status: 400 },
    )
  }
  const scan = await getLatestScan(targetType as TargetType, targetId)
  return NextResponse.json({
    scan,
    gate: evaluateGate(scan),
  })
}
