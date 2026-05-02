/**
 * GET /.well-known/oauth-authorization-server (RFC 8414).
 * Mirrors /api/oauth/.well-known/oauth-authorization-server so spec-compliant
 * MCP clients can discover the AS without knowing our path layout.
 */
export { GET, runtime, dynamic, revalidate } from '@/app/api/oauth/.well-known/oauth-authorization-server/route'
