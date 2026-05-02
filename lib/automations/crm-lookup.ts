/**
 * CRM lookup helpers — list and find/create primitives the .0n importer
 * uses to resolve placeholder names ("CRM stack", "company_url", etc.) into
 * real CRM IDs. All lookups are cached in-memory per-request to avoid
 * repeated API hits during a single import pass.
 */

import { crmGet, crmPost } from '@/lib/crm'

const cache = new Map<string, unknown>()

function cached<T>(key: string, getter: () => Promise<T>): Promise<T> {
  if (cache.has(key)) return Promise.resolve(cache.get(key) as T)
  return getter().then((v) => {
    cache.set(key, v)
    return v
  })
}

export interface CrmTag {
  id: string
  name: string
  locationId?: string
}
export interface CrmCustomField {
  id: string
  name: string
  fieldKey?: string
  dataType?: string
}
export interface CrmPipeline {
  id: string
  name: string
  stages: { id: string; name: string }[]
}

// ─────────────────────────────────────────────────────────────
// Tags
// ─────────────────────────────────────────────────────────────

export async function listTags(locationId: string): Promise<CrmTag[]> {
  return cached(`tags:${locationId}`, async () => {
    const res = await crmGet(`/locations/${locationId}/tags`, locationId)
    if (!res.ok) return []
    const data = await res.json()
    return (data.tags || []) as CrmTag[]
  })
}

export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

export async function findTagByName(
  locationId: string,
  name: string,
): Promise<CrmTag | null> {
  const n = normalizeTagName(name)
  const tags = await listTags(locationId)
  return tags.find((t) => normalizeTagName(t.name) === n) || null
}

export async function findOrCreateTag(
  locationId: string,
  name: string,
): Promise<{ tag: CrmTag; created: boolean } | null> {
  const existing = await findTagByName(locationId, name)
  if (existing) return { tag: existing, created: false }

  const res = await crmPost(`/locations/${locationId}/tags`, locationId, {
    name,
  })
  if (!res.ok) return null
  const data = await res.json()
  const tag: CrmTag = data.tag || { id: data.id, name }
  // Invalidate cache
  cache.delete(`tags:${locationId}`)
  return { tag, created: true }
}

// ─────────────────────────────────────────────────────────────
// Custom fields
// ─────────────────────────────────────────────────────────────

export async function listCustomFields(
  locationId: string,
): Promise<CrmCustomField[]> {
  return cached(`fields:${locationId}`, async () => {
    const res = await crmGet(
      `/locations/${locationId}/customFields`,
      locationId,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.customFields || []) as CrmCustomField[]
  })
}

export function normalizeFieldKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export async function findCustomField(
  locationId: string,
  nameOrKey: string,
): Promise<CrmCustomField | null> {
  const key = normalizeFieldKey(nameOrKey)
  const fields = await listCustomFields(locationId)
  return (
    fields.find((f) => normalizeFieldKey(f.fieldKey || f.name) === key) || null
  )
}

export async function findOrCreateCustomField(
  locationId: string,
  name: string,
  dataType: 'TEXT' | 'NUMERICAL' | 'LARGE_TEXT' = 'TEXT',
): Promise<{ field: CrmCustomField; created: boolean } | null> {
  const existing = await findCustomField(locationId, name)
  if (existing) return { field: existing, created: false }

  const res = await crmPost(
    `/locations/${locationId}/customFields`,
    locationId,
    {
      name,
      fieldKey: normalizeFieldKey(name),
      dataType,
      placeholder: name,
      model: 'contact',
    },
  )
  if (!res.ok) return null
  const data = await res.json()
  const field: CrmCustomField = data.customField || data
  cache.delete(`fields:${locationId}`)
  return { field, created: true }
}

// ─────────────────────────────────────────────────────────────
// Pipelines + stages
// ─────────────────────────────────────────────────────────────

export async function listPipelines(
  locationId: string,
): Promise<CrmPipeline[]> {
  return cached(`pipelines:${locationId}`, async () => {
    const res = await crmGet(
      `/opportunities/pipelines?locationId=${locationId}`,
      locationId,
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.pipelines || []) as CrmPipeline[]
  })
}

export async function findPipelineByName(
  locationId: string,
  name: string,
): Promise<CrmPipeline | null> {
  const n = name.trim().toLowerCase()
  const pipelines = await listPipelines(locationId)
  return pipelines.find((p) => p.name.toLowerCase() === n) || null
}
