/**
 * /hub/room — watching the agents work.
 *
 * Gated in a server component with notFound(), so an anonymous request never
 * receives the markup. A client-side redirect would ship the whole room to
 * anyone with JavaScript disabled.
 */
import { notFound } from 'next/navigation'
import { isOwner } from '@/lib/owner'
import RoomView from './RoomView'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'The Room — 0n', robots: { index: false, follow: false } }

export default async function RoomPage() {
  if (!(await isOwner())) notFound()
  return <RoomView />
}
