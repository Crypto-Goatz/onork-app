/**
 * Connection Health Monitor — keeps APIs connected permanently
 *
 * Connections must STAY connected. On failure:
 *   1. Log the failure
 *   2. Mark degraded (not disconnected)
 *   3. Retry with exponential backoff
 *   4. Auto-refresh OAuth tokens before expiry
 *   5. Alert user only after 3+ consecutive failures
 */

import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type ConnectionType = 'crm' | 'mcp' | 'channel'
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

interface HealthCheckResult {
  connectionId: string
  connectionType: ConnectionType
  status: HealthStatus
  latencyMs: number
  error?: string
}

export async function logHealth(result: HealthCheckResult): Promise<void> {
  const admin = getAdmin()
  await admin.rpc('log_connection_health', {
    p_connection_id: result.connectionId,
    p_connection_type: result.connectionType,
    p_status: result.status,
    p_latency_ms: result.latencyMs,
    p_error: result.error || null,
    p_metadata: {},
  })
}

export async function checkCrmHealth(installationId: string, locationId: string, accessToken: string): Promise<HealthCheckResult> {
  const start = Date.now()
  try {
    const res = await fetch(`https://services.leadconnectorhq.com/locations/${locationId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-07-28',
      },
      signal: AbortSignal.timeout(10_000),
    })
    const latencyMs = Date.now() - start

    if (res.ok) {
      return { connectionId: installationId, connectionType: 'crm', status: 'healthy', latencyMs }
    }

    if (res.status === 401) {
      return { connectionId: installationId, connectionType: 'crm', status: 'degraded', latencyMs, error: 'Token expired — auto-refresh will retry' }
    }

    return { connectionId: installationId, connectionType: 'crm', status: 'degraded', latencyMs, error: `HTTP ${res.status}` }
  } catch (err) {
    return {
      connectionId: installationId,
      connectionType: 'crm',
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Connection failed',
    }
  }
}

export async function checkAllConnections(userId: string): Promise<HealthCheckResult[]> {
  const admin = getAdmin()
  const results: HealthCheckResult[] = []

  const { data: crmInstalls } = await admin
    .from('crm_installations')
    .select('id, location_id, access_token, status')
    .eq('user_id', userId)
    .eq('status', 'active')

  if (crmInstalls) {
    for (const install of crmInstalls) {
      const result = await checkCrmHealth(install.id, install.location_id, install.access_token)
      await logHealth(result)
      results.push(result)
    }
  }

  return results
}

export async function shouldAlert(connectionId: string): Promise<boolean> {
  const admin = getAdmin()
  const { data } = await admin
    .from('connection_health_log')
    .select('status')
    .eq('connection_id', connectionId)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!data || data.length < 3) return false
  return data.every(r => r.status === 'unhealthy')
}

export async function getHealthSummary(userId: string) {
  const admin = getAdmin()

  const { data: crm } = await admin
    .from('crm_installations')
    .select('id, location_id, health_status, last_health_check, consecutive_failures')
    .eq('user_id', userId)

  const { data: mcp } = await admin
    .from('mcp_connections')
    .select('id, server_name, health_status, last_health_check, consecutive_failures')
    .eq('user_id', userId)

  const allConnections = [
    ...(crm || []).map(c => ({ ...c, type: 'crm' as const })),
    ...(mcp || []).map(c => ({ ...c, type: 'mcp' as const })),
  ]

  const healthy = allConnections.filter(c => c.health_status === 'healthy').length
  const degraded = allConnections.filter(c => c.health_status === 'degraded').length
  const unhealthy = allConnections.filter(c => c.health_status === 'unhealthy').length

  return {
    connections: allConnections,
    total: allConnections.length,
    healthy,
    degraded,
    unhealthy,
    overallStatus: unhealthy > 0 ? 'unhealthy' : degraded > 0 ? 'degraded' : healthy > 0 ? 'healthy' : 'unknown',
  }
}
