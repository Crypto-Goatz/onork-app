/**
 * GET /.well-known/mcp.json — MCP server discovery document.
 *
 * Lets MCP-aware clients (Claude Desktop, IDE plugins, agent harnesses)
 * auto-detect the 0nCore MCP endpoint, its protocol version, transport,
 * and the auth scheme required for tenant-bound tools.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const proto = req.headers.get('x-forwarded-proto') || 'https'
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '0ncore.com'
  const origin = `${proto}://${host}`

  return NextResponse.json(
    {
      schema: 'https://modelcontextprotocol.io/schemas/discovery/v1',
      name: '0nCore MCP',
      version: '1.0.0',
      description:
        'Live MCP server for the 0nCore / 0nMCP ecosystem — VPIS scoring, SXO/AEO scans, ' +
        'stack scanner, CRM contact search, tag management, LinkedIn post generation, ' +
        'and Detect & Refine click-quality stats.',
      protocolVersion: '2025-03-26',
      transport: {
        type: 'streamable-http',
        endpoint: `${origin}/api/mcp`,
        methods: ['POST', 'GET'],
        accept: ['application/json', 'text/event-stream'],
      },
      auth: {
        scheme: 'bearer',
        tokenPrefix: '0n_live_',
        header: 'Authorization',
        queryParam: 'token',
        scopes: ['read', 'write', 'execute'],
        // Discovery + listing are open. tools/call follows per-tool gating
        // (tenant-bound tools require a 0n_ token).
        publicMethods: ['initialize', 'tools/list', 'ping'],
        tokenProvisioning: `${origin}/api/tokens`,
      },
      capabilities: {
        tools: { listChanged: false },
      },
      tools: [
        { name: 'vpis_score', tenant: false },
        { name: 'sxo_scan', tenant: false },
        { name: 'stack_scan', tenant: false },
        { name: 'generate_post', tenant: false },
        { name: 'search_contacts', tenant: true },
        { name: 'create_tag', tenant: true },
        { name: 'dr_register_domain', tenant: true },
        { name: 'dr_stats', tenant: true },
      ],
      contact: {
        operator: 'RocketOpp LLC',
        support: 'support@0ncore.com',
        homepage: 'https://0ncore.com',
        docs: 'https://0nmcp.com',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
