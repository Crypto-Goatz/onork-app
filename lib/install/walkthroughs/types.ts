/**
 * Walkthrough types for the Unified Install Hub.
 * Per docs/unified-install-hub-spec.md §4 — fully data-driven.
 */

export interface WalkthroughStep {
  id: string                          // snake_case, stable
  title: string
  body_md: string                     // markdown — rendered with our standard renderer
  copy_blocks?: { label: string; value: string }[]
  screenshot?: string                 // /public path
  external_link?: { label: string; href: string }
  verify?: {
    kind: 'webhook' | 'api_check' | 'manual'
    endpoint?: string
    success_message?: string
  }
}

export interface Walkthrough {
  id: string
  integration_id: string
  estimated_minutes: number
  prerequisites?: string[]
  steps: WalkthroughStep[]
}
