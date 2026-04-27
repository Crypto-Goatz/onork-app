import { NextResponse } from 'next/server'

/**
 * Standardized API error response.
 * Never exposes stack traces or raw internals.
 */
export function apiError(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      support: 'https://0ncore.com/support',
    },
    { status },
  )
}

/**
 * Maps common error types to proper HTTP responses.
 * Catches Supabase, Stripe, and generic JS errors.
 */
export function handleApiError(error: unknown): NextResponse {
  const err = error instanceof Error ? error : new Error(String(error))
  const msg = err.message.toLowerCase()

  // Rate limit
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return apiError('Rate limit exceeded. Please wait and try again.', 429)
  }

  // Auth errors
  if (msg.includes('unauthorized') || msg.includes('invalid token') || msg.includes('jwt expired') || msg.includes('no auth')) {
    return apiError('Authentication required. Please sign in again.', 401)
  }

  // Forbidden / provisioning
  if (msg.includes('forbidden') || msg.includes('not allowed') || msg.includes('permission')) {
    return apiError('Access denied. Your account may need provisioning — contact support.', 403)
  }

  // Not found
  if (msg.includes('not found') || msg.includes('no rows') || msg.includes('does not exist')) {
    return apiError('The requested resource was not found.', 404)
  }

  // Validation
  if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required field')) {
    return apiError('Invalid request. Please check your input and try again.', 400)
  }

  // Stripe-specific
  if (msg.includes('stripe') || msg.includes('payment')) {
    return apiError('Payment processing error. Please try again or contact support.', 502)
  }

  // Default: 500 with generic message
  console.error('[API Error]', err.message)
  return apiError('An unexpected error occurred. Please try again.', 500)
}
