/**
 * Decision Ladder — determines whether a capability request should
 * proceed, require a challenge, or be blocked outright.
 */

export type Decision = 'proceed' | 'challenge' | 'block'

/**
 * decide() — evaluate whether a capability can execute given
 * the current trust score and the capability's tier.
 */
export function decide(score: number, tier: number): Decision {
  // Tier 1: always proceed (read-only operations)
  if (tier <= 1) return 'proceed'

  // Tier 2: challenge if score < 85
  if (tier === 2) {
    return score < 85 ? 'challenge' : 'proceed'
  }

  // Tier 3: challenge if score < 90
  if (tier === 3) {
    if (score < 50) return 'block' // red = block for tier 3
    return score < 90 ? 'challenge' : 'proceed'
  }

  // Tier 4: challenge if score < 95, block if red
  if (tier >= 4) {
    if (score < 50) return 'block'
    return score < 95 ? 'challenge' : 'proceed'
  }

  return 'proceed'
}

/**
 * challengeCount() — how many challenges are required
 * based on the current trust state.
 */
export function challengeCount(state: string): number | 'block' {
  switch (state) {
    case 'green':
      return 0
    case 'yellow':
      return 1
    case 'orange':
      return 2
    case 'red':
      return 'block'
    default:
      return 1
  }
}

/**
 * Get human-readable explanation for a decision
 */
export function decisionReason(score: number, tier: number, state: string): string {
  const d = decide(score, tier)
  if (d === 'proceed') return 'Trust score sufficient for this operation'
  if (d === 'block') return `Operation blocked — trust state is ${state.toUpperCase()} (score: ${score})`
  const count = challengeCount(state)
  if (count === 'block') return `Operation blocked — trust state is RED`
  return `Verification required — ${count} challenge${count !== 1 ? 's' : ''} needed (${state.toUpperCase()}, tier ${tier})`
}
