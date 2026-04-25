/**
 * safe-fetch — consistent error handling + toast notifications for ALL API calls.
 *
 * Usage:
 *   const { data, error } = await safeFetch('/api/contacts')
 *   const { data, error } = await safeFetch('/api/contacts', { method: 'POST', body: {...}, toast: true })
 *
 * Features:
 * - Auto-JSON parsing
 * - Timeout (15s default, configurable)
 * - Error extraction from response body
 * - Optional toast on success/error
 * - Returns { data, error } — never throws
 */

import { toast } from 'sonner'

interface SafeFetchOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | FormData
  timeout?: number
  showErrorToast?: boolean
  showSuccessToast?: boolean | string
  silentError?: boolean
}

interface SafeFetchResult<T = unknown> {
  data: T | null
  error: string | null
  status: number
  ok: boolean
}

export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult<T>> {
  const {
    body,
    timeout = 15000,
    showErrorToast = true,
    showSuccessToast = false,
    silentError = false,
    ...fetchOptions
  } = options

  // Build fetch init
  const init: RequestInit = {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string> || {}),
    },
  }

  if (body && !(body instanceof FormData)) {
    init.body = JSON.stringify(body)
  } else if (body instanceof FormData) {
    init.body = body
    // Remove Content-Type so browser sets multipart boundary
    delete (init.headers as Record<string, string>)['Content-Type']
  }

  // Default method to POST if body is provided
  if (body && !init.method) init.method = 'POST'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    init.signal = controller.signal

    const res = await fetch(url, init)
    clearTimeout(timeoutId)

    let data: T | null = null
    let errorMsg: string | null = null

    try {
      const json = await res.json()
      if (res.ok) {
        data = json as T
      } else {
        errorMsg = json.error || json.message || json.msg || `Request failed (${res.status})`
      }
    } catch {
      if (res.ok) {
        data = null // No JSON body but request succeeded
      } else {
        errorMsg = `Request failed (${res.status})`
      }
    }

    if (errorMsg && showErrorToast && !silentError) {
      toast.error('Error', { description: errorMsg })
    }

    if (res.ok && showSuccessToast) {
      const msg = typeof showSuccessToast === 'string' ? showSuccessToast : 'Done'
      toast.success(msg)
    }

    return { data, error: errorMsg, status: res.status, ok: res.ok }
  } catch (err) {
    const errorMsg = err instanceof Error
      ? err.name === 'AbortError'
        ? 'Request timed out. Check your connection.'
        : err.message
      : 'Network error'

    if (showErrorToast && !silentError) {
      toast.error('Connection error', { description: errorMsg })
    }

    return { data: null, error: errorMsg, status: 0, ok: false }
  }
}

/**
 * Shorthand for silent fetches (no toasts, for background data loading)
 */
export async function quietFetch<T = unknown>(url: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult<T>> {
  return safeFetch<T>(url, { ...options, showErrorToast: false, silentError: true })
}
