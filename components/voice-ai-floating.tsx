'use client'

import { usePathname } from 'next/navigation'
import { VoiceAIWidget } from './voice-ai-widget'

// Only show voice AI on public pages — not dashboard, crm, auth
const EXCLUDED_PREFIXES = ['/dashboard', '/crm', '/canvas', '/welcome', '/tools', '/auth', '/login', '/signup', '/admin']

export function VoiceAIFloatingButton() {
  const pathname = usePathname()
  if (EXCLUDED_PREFIXES.some(p => pathname?.startsWith(p))) return null
  return <VoiceAIWidget />
}
