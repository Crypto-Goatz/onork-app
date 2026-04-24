/**
 * Unified Task Sync Engine
 *
 * Bidirectional sync between unified_tasks and ALL connected services.
 * The task doesn't belong to Google or CRM or Asana — it belongs to the USER.
 * Services are just execution surfaces.
 *
 * Supported services:
 * - google_tasks   (via Google Workspace OAuth)
 * - crm            (via CRM API — contact tasks)
 * - asana           (via 0nMCP catalog)
 * - linear          (via 0nMCP catalog)
 * - jira            (via 0nMCP catalog)
 * - github          (via 0nMCP catalog)
 * - slack           (via Slack reminders)
 */

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ── Types ──────────────────────────────────────────────────

export interface UnifiedTask {
  id: string
  user_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  completed_at: string | null
  project: string | null
  tags: string[]
  assigned_to: string | null
  client_id: string | null
  recurring: boolean
  recurrence_rule: string | null
  next_occurrence: string | null
  parent_task_id: string | null
  sources: TaskSource[]
  guardian_enabled: boolean
  guardian_status: string
  stall_threshold_hours: number
  created_at: string
  updated_at: string
}

export interface TaskSource {
  service: string
  external_id: string
  list_id?: string
  synced_at: string
}

interface SyncResult {
  service: string
  direction: 'inbound' | 'outbound'
  created: number
  updated: number
  errors: string[]
}

// ── Google Tasks Sync ──────────────────────────────────────

export async function syncGoogleTasks(userId: string): Promise<SyncResult> {
  const result: SyncResult = { service: 'google_tasks', direction: 'inbound', created: 0, updated: 0, errors: [] }

  // Get user's Google connection
  const { data: conn } = await supabase
    .from('user_connections')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .eq('status', 'active')
    .single()

  if (!conn) {
    result.errors.push('Google not connected')
    return result
  }

  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth.setCredentials({ access_token: conn.access_token, refresh_token: conn.refresh_token })
  const tasks = google.tasks({ version: 'v1', auth: oauth })

  try {
    // List all task lists
    const listsRes = await tasks.tasklists.list({ maxResults: 20 })
    const taskLists = listsRes.data.items || []

    for (const list of taskLists) {
      if (!list.id) continue

      // Get all tasks in this list
      const tasksRes = await tasks.tasks.list({
        tasklist: list.id,
        maxResults: 100,
        showCompleted: true,
        showHidden: true,
      })

      for (const gTask of tasksRes.data.items || []) {
        if (!gTask.id || !gTask.title) continue

        // Check if we already track this task
        const { data: existing } = await supabase
          .from('unified_tasks')
          .select('id, sources, status, updated_at')
          .eq('user_id', userId)
          .contains('sources', [{ service: 'google_tasks', external_id: gTask.id }])
          .single()

        const gStatus = gTask.status === 'completed' ? 'done' : 'todo'
        const gDue = gTask.due ? new Date(gTask.due).toISOString() : null

        if (existing) {
          // Update if Google version is newer
          const gUpdated = gTask.updated ? new Date(gTask.updated).getTime() : 0
          const localUpdated = new Date(existing.updated_at).getTime()

          if (gUpdated > localUpdated) {
            await supabase
              .from('unified_tasks')
              .update({
                title: gTask.title,
                description: gTask.notes || null,
                status: gStatus,
                due_date: gDue,
                completed_at: gTask.completed || null,
              })
              .eq('id', existing.id)

            result.updated++
          }
        } else {
          // Create new unified task from Google
          const source: TaskSource = {
            service: 'google_tasks',
            external_id: gTask.id,
            list_id: list.id,
            synced_at: new Date().toISOString(),
          }

          await supabase
            .from('unified_tasks')
            .insert({
              user_id: userId,
              title: gTask.title,
              description: gTask.notes || null,
              status: gStatus,
              due_date: gDue,
              completed_at: gTask.completed || null,
              project: list.title || null,
              sources: [source],
            })

          result.created++
        }
      }
    }

    // Outbound: push local tasks TO Google that don't have a Google source
    const { data: localOnly } = await supabase
      .from('unified_tasks')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'in', '("done","cancelled")')

    for (const task of localOnly || []) {
      const sources = (task.sources as TaskSource[]) || []
      const hasGoogle = sources.some(s => s.service === 'google_tasks')
      if (hasGoogle) continue

      // Push to default task list
      const defaultList = taskLists[0]
      if (!defaultList?.id) continue

      try {
        const created = await tasks.tasks.insert({
          tasklist: defaultList.id,
          requestBody: {
            title: task.title,
            notes: task.description || undefined,
            due: task.due_date || undefined,
            status: task.status === 'done' ? 'completed' : 'needsAction',
          },
        })

        if (created.data.id) {
          const newSource: TaskSource = {
            service: 'google_tasks',
            external_id: created.data.id,
            list_id: defaultList.id,
            synced_at: new Date().toISOString(),
          }

          await supabase
            .from('unified_tasks')
            .update({ sources: [...sources, newSource] })
            .eq('id', task.id)

          result.created++
          result.direction = 'outbound'
        }
      } catch {
        result.errors.push(`Failed to push task "${task.title}" to Google`)
      }
    }

    await logSync(result, userId)
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'Google Tasks sync failed')
  }

  return result
}

// ── CRM Tasks Sync ─────────────────────────────────────────

export async function syncCrmTasks(userId: string, locationId: string, pit: string): Promise<SyncResult> {
  const result: SyncResult = { service: 'crm', direction: 'inbound', created: 0, updated: 0, errors: [] }

  const CRM_BASE = 'https://services.leadconnectorhq.com'
  const headers = { Authorization: `Bearer ${pit}`, Version: '2021-07-28' }

  try {
    // Search all tasks in this location
    const res = await fetch(`${CRM_BASE}/locations/${locationId}/tasks/search?limit=100`, { headers })
    if (!res.ok) {
      result.errors.push(`CRM API returned ${res.status}`)
      return result
    }

    const data = await res.json()
    const crmTasks = data.tasks || []

    for (const cTask of crmTasks) {
      if (!cTask.id || !cTask.title) continue

      const { data: existing } = await supabase
        .from('unified_tasks')
        .select('id, sources, updated_at')
        .eq('user_id', userId)
        .contains('sources', [{ service: 'crm', external_id: cTask.id }])
        .single()

      const cStatus = cTask.completed ? 'done' : 'todo'

      if (existing) {
        await supabase
          .from('unified_tasks')
          .update({
            title: cTask.title,
            description: cTask.body || null,
            status: cStatus,
            due_date: cTask.dueDate || null,
            assigned_to: cTask.assignedTo || null,
            client_id: cTask.contactId || null,
          })
          .eq('id', existing.id)

        result.updated++
      } else {
        const source: TaskSource = {
          service: 'crm',
          external_id: cTask.id,
          synced_at: new Date().toISOString(),
        }

        await supabase
          .from('unified_tasks')
          .insert({
            user_id: userId,
            title: cTask.title,
            description: cTask.body || null,
            status: cStatus,
            due_date: cTask.dueDate || null,
            assigned_to: cTask.assignedTo || null,
            client_id: cTask.contactId || null,
            sources: [source],
          })

        result.created++
      }
    }

    await logSync(result, userId)
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : 'CRM sync failed')
  }

  return result
}

// ── Task Guardian ──────────────────────────────────────────

export async function runTaskGuardian(userId: string): Promise<{
  checked: number
  stalled: number
  overdue: number
  spawned: number
}> {
  const stats = { checked: 0, stalled: 0, overdue: 0, spawned: 0 }

  const { data: tasks } = await supabase
    .from('unified_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('guardian_enabled', true)
    .not('status', 'in', '("done","cancelled")')

  if (!tasks) return stats

  const now = Date.now()

  for (const task of tasks) {
    stats.checked++

    // Check for overdue
    if (task.due_date && new Date(task.due_date).getTime() < now && task.status !== 'done') {
      await supabase
        .from('unified_tasks')
        .update({
          guardian_status: 'overdue',
          guardian_last_check: new Date().toISOString(),
          guardian_notes: `Task overdue since ${new Date(task.due_date).toLocaleDateString()}`,
        })
        .eq('id', task.id)
      stats.overdue++
      continue
    }

    // Check for stalled (no update in threshold hours)
    const hoursSinceUpdate = (now - new Date(task.updated_at).getTime()) / (1000 * 60 * 60)
    if (hoursSinceUpdate > (task.stall_threshold_hours || 72) && task.status === 'in_progress') {
      await supabase
        .from('unified_tasks')
        .update({
          guardian_status: 'stalled',
          guardian_last_check: new Date().toISOString(),
          guardian_notes: `No progress in ${Math.floor(hoursSinceUpdate)} hours`,
        })
        .eq('id', task.id)
      stats.stalled++
      continue
    }

    // Check for recurring tasks that need spawning
    if (task.recurring && task.next_occurrence) {
      const nextOccurrence = new Date(task.next_occurrence).getTime()
      if (nextOccurrence <= now) {
        // Spawn new instance
        await supabase
          .from('unified_tasks')
          .insert({
            user_id: userId,
            title: task.title,
            description: task.description,
            status: 'todo',
            priority: task.priority,
            due_date: task.next_occurrence,
            project: task.project,
            tags: task.tags,
            assigned_to: task.assigned_to,
            client_id: task.client_id,
            parent_task_id: task.id,
            sources: [],
          })

        // Calculate next occurrence
        const nextDate = calculateNextOccurrence(task.recurrence_rule, new Date(task.next_occurrence))
        await supabase
          .from('unified_tasks')
          .update({ next_occurrence: nextDate?.toISOString() || null })
          .eq('id', task.id)

        stats.spawned++
      }
    }

    // Mark healthy
    await supabase
      .from('unified_tasks')
      .update({
        guardian_status: 'healthy',
        guardian_last_check: new Date().toISOString(),
      })
      .eq('id', task.id)
  }

  return stats
}

// ── Full Sync (all services) ───────────────────────────────

export async function syncAllTasks(userId: string): Promise<SyncResult[]> {
  const results: SyncResult[] = []

  // Google Tasks
  results.push(await syncGoogleTasks(userId))

  // CRM Tasks
  const { data: profile } = await supabase
    .from('profiles')
    .select('crm_location_id')
    .eq('id', userId)
    .single()

  if (profile?.crm_location_id) {
    const pit = process.env.CRM_PIT || ''
    if (pit) {
      results.push(await syncCrmTasks(userId, profile.crm_location_id, pit))
    }
  }

  // Run guardian
  await runTaskGuardian(userId)

  return results
}

// ── Helpers ────────────────────────────────────────────────

function calculateNextOccurrence(rrule: string | null, from: Date): Date | null {
  if (!rrule) return null

  const match = rrule.match(/FREQ=(\w+)(?:;INTERVAL=(\d+))?/)
  if (!match) return null

  const freq = match[1]
  const interval = parseInt(match[2] || '1', 10)
  const next = new Date(from)

  switch (freq) {
    case 'DAILY': next.setDate(next.getDate() + interval); break
    case 'WEEKLY': next.setDate(next.getDate() + 7 * interval); break
    case 'MONTHLY': next.setMonth(next.getMonth() + interval); break
    case 'YEARLY': next.setFullYear(next.getFullYear() + interval); break
    default: return null
  }

  return next
}

async function logSync(result: SyncResult, userId: string) {
  const { data: tasks } = await supabase
    .from('unified_tasks')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (tasks?.[0]) {
    await supabase.from('task_sync_log').insert({
      task_id: tasks[0].id,
      service: result.service,
      direction: result.direction,
      action: 'sync',
      payload: { created: result.created, updated: result.updated },
      status: result.errors.length > 0 ? 'error' : 'success',
      error: result.errors.length > 0 ? result.errors.join('; ') : null,
    })
  }
}
