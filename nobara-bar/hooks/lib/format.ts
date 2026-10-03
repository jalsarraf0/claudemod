// Compact token counts: 950, 9.5k, 116k, 1M, 1.2M.

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '')
}

export function formatTokens(tokens: number): string {
  const n = Math.max(0, Math.round(tokens))
  if (n < 1000) return String(n)
  if (n < 10_000) return `${trim(n / 1000)}k`
  if (n < 999_500) return `${Math.round(n / 1000)}k`
  if (n < 10_000_000) return `${trim(n / 1_000_000)}M`
  return `${Math.round(n / 1_000_000)}M`
}

export type Heat = 'cool' | 'warm' | 'hot'

export function heatOf(percent: number): Heat {
  if (percent >= 85) return 'hot'
  if (percent >= 70) return 'warm'
  return 'cool'
}
