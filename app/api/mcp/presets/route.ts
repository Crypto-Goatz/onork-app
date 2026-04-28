/**
 * GET /api/mcp/presets — list one-click MCP server presets (Browserbase, etc.)
 */

import { NextResponse } from 'next/server'
import { MCP_PRESETS } from '@/lib/mcp/client'

export async function GET() {
  return NextResponse.json({ presets: MCP_PRESETS })
}
