// Turns /context's breakdown into what the bar draws.

import type { SessionContextBreakdown } from 'claude-code'

import type { Segment, Snapshot } from '../../types'

export function snapshotFrom(breakdown: SessionContextBreakdown): Snapshot {
  const segments: Segment[] = []
  for (const category of breakdown.categories) {
    if (category.kind === 'deferred' || category.isDeferred) continue
    if (category.tokens <= 0 && category.kind !== 'free') continue
    segments.push({
      name: category.name,
      tokens: Math.max(0, category.tokens),
      color: category.color,
      kind: category.kind,
    })
  }
  return {
    segments,
    usedTokens: breakdown.totalTokens,
    maxTokens: breakdown.rawMaxTokens,
    percent: breakdown.percentage,
  }
}
