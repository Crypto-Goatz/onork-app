/**
 * /account/security — the vault door, where it now lives.
 *
 * Unchanged behaviour, new address. Showing someone their 0n key is the single
 * most sensitive thing this product does, so it keeps its device (IKY)
 * challenge: an unrecognised browser answers a question only the account holder
 * can, before any key is rendered. Moving the entrance did not move that.
 */
import VaultDoor from '@/app/hub/VaultDoor'

export const metadata = { title: 'Security — 0n' }
export default function SecurityPage() {
  return <VaultDoor />
}
