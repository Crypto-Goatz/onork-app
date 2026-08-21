'use client'

/**
 * The session bridge for Flows.
 *
 * Kept separate from the embed so the embed stays a pure component that takes a
 * token — testable, and reusable anywhere else we want the builder (the Hub,
 * an add-on frame) without dragging the CRM's SSO hook along with it.
 */
import { useSso } from '../useSso'
import FlowsEmbed from './FlowsEmbed'

export default function FlowsClient() {
  const sso = useSso()
  const locationId = (sso as { activeLocationId?: string }).activeLocationId ?? null
  return <FlowsEmbed token={sso.token} locationId={locationId} />
}
