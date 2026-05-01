/**
 * Delay helpers for the automation builder.
 *
 * Canonical storage: every action node carries `config.delay_seconds` (string,
 * since CapabilityNodeData.config is Record<string, string>). 0 = run immediately.
 *
 * The 0nFlow engine reads `delay_seconds` directly per step. The visual builder
 * surfaces it as value+unit; this lib bridges the two.
 */

export type DelayUnit = 's' | 'm' | 'h' | 'd'

export const UNIT_SECONDS: Record<DelayUnit, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
}

export const UNIT_LABELS: Record<DelayUnit, string> = {
  s: 'Seconds',
  m: 'Minutes',
  h: 'Hours',
  d: 'Days',
}

export function fitDelay(totalSeconds: number): { value: number; unit: DelayUnit } {
  if (totalSeconds <= 0) return { value: 0, unit: 'm' }
  if (totalSeconds % 86400 === 0) return { value: totalSeconds / 86400, unit: 'd' }
  if (totalSeconds % 3600 === 0) return { value: totalSeconds / 3600, unit: 'h' }
  if (totalSeconds % 60 === 0) return { value: totalSeconds / 60, unit: 'm' }
  return { value: totalSeconds, unit: 's' }
}

export function fmtDelay(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'Run immediately'
  const { value, unit } = fitDelay(totalSeconds)
  const label = UNIT_LABELS[unit].toLowerCase()
  return `Wait ${value} ${value === 1 ? label.replace(/s$/, '') : label}`
}

export function fmtDelayShort(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'instant'
  const { value, unit } = fitDelay(totalSeconds)
  return `${value}${unit}`
}

export function readDelaySeconds(config: Record<string, string> | undefined | null): number {
  const raw = config?.delay_seconds
  if (!raw) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}
