// Lays the bar row out as styled runs of text, one cell per character.
// Every glyph used here is a single column wide.

import type { OsInfo, Segment, Snapshot } from '../../types'
import { allocateCells } from './cells'
import { formatTokens, heatOf } from './format'
import { paletteFor } from './theme'

export type Run = { text: string; color?: string; bold?: boolean; dim?: boolean }

export type RowInput = {
  snapshot: Snapshot
  os: OsInfo | null
  columns: number
  isMobile: boolean
  isWorking: boolean
}

const MIN_DESKTOP_BAR = 12
const MIN_MOBILE_BAR = 4
const MOBILE_TOKENS_MIN_COLUMNS = 40

const RANK: Record<Segment['kind'], number> = { used: 0, buffer: 1, free: 2 }

export function orderSegments(segments: readonly Segment[]): Segment[] {
  return segments
    .map((segment, i) => ({ segment, i }))
    .sort((a, b) => RANK[a.segment.kind] - RANK[b.segment.kind] || a.i - b.i)
    .map(entry => entry.segment)
}

export function barRuns(segments: readonly Segment[], width: number, isMobile: boolean): Run[] {
  const ordered = orderSegments(segments)
  const cells = allocateCells(
    ordered.map(s => ({ weight: s.tokens, isRequired: s.kind === 'used' })),
    width,
  )
  const runs: Run[] = []
  ordered.forEach((segment, i) => {
    const n = cells[i] ?? 0
    if (n <= 0) return
    if (segment.kind === 'used') {
      runs.push({ text: '█'.repeat(n), color: segment.color })
    } else if (segment.kind === 'buffer') {
      runs.push({ text: (isMobile ? '·' : '▒').repeat(n), color: segment.color })
    } else {
      runs.push({ text: (isMobile ? '·' : '░').repeat(n), color: segment.color, dim: true })
    }
  })
  return runs
}

export function runsWidth(runs: readonly Run[]): number {
  return runs.reduce((sum, run) => sum + [...run.text].length, 0)
}

function percentText(percent: number): string {
  return `${Math.max(0, Math.round(percent))}%`
}

export function mobileRow(input: RowInput): Run[] {
  const { snapshot, os, columns } = input
  const palette = paletteFor(os?.isNobara ?? false)
  const heat = palette.heat[heatOf(snapshot.percent)]
  const avail = Math.max(0, columns - 1)
  const pct = percentText(snapshot.percent)
  const tokens = columns >= MOBILE_TOKENS_MIN_COLUMNS ? formatTokens(snapshot.usedTokens) : null
  const fixed = pct.length + 1 + 2 + (tokens === null ? 0 : tokens.length + 1)
  const width = Math.max(MIN_MOBILE_BAR, avail - fixed)

  const runs: Run[] = [
    { text: pct, color: heat, bold: true },
    { text: ' ' },
    { text: '▕', color: palette.deep },
    ...barRuns(snapshot.segments, width, true),
    { text: '▏', color: palette.deep },
  ]
  if (tokens !== null) runs.push({ text: ' ' }, { text: tokens, color: heat })
  return runs
}

type Head = { word: boolean; label: string | null }

export function desktopRow(input: RowInput): Run[] | null {
  const { snapshot, os, columns, isWorking } = input
  const palette = paletteFor(os?.isNobara ?? false)
  const heat = palette.heat[heatOf(snapshot.percent)]
  const avail = Math.max(0, columns - 1)
  const pct = percentText(snapshot.percent)
  const tokens = `${formatTokens(snapshot.usedTokens)}/${formatTokens(snapshot.maxTokens)}`

  const full = os === null ? null : os.flavor === null ? os.label : `${os.label} · ${os.flavor}`
  const heads: Head[] = [
    { word: true, label: full },
    { word: true, label: os?.label ?? null },
    { word: true, label: null },
    { word: false, label: null },
  ]

  for (const withTokens of [true, false]) {
    for (const head of heads) {
      const headWidth = 1 + (head.word ? 8 : 0) + (head.label === null ? 0 : head.label.length + 1) + 1
      const tailWidth = 1 + pct.length + (withTokens ? tokens.length + 1 : 0) + 2
      const width = avail - headWidth - 2 - tailWidth
      if (width < MIN_DESKTOP_BAR) continue

      const runs: Run[] = [{ text: '◢', color: palette.glyph, bold: true }]
      if (head.word) runs.push({ text: ' CONTEXT', color: palette.accent, bold: true })
      if (head.label !== null) runs.push({ text: ` ${head.label}`, dim: true })
      runs.push(
        { text: ' ' },
        { text: '╞', color: palette.deep },
        ...barRuns(snapshot.segments, width, false),
        { text: '╡', color: palette.deep },
        { text: ' ' },
        { text: pct, color: heat, bold: true },
      )
      if (withTokens) runs.push({ text: ' ' }, { text: tokens, color: heat })
      runs.push(
        { text: ' ' },
        isWorking ? { text: '◉', color: palette.accent, bold: true } : { text: '◌', dim: true },
      )
      return runs
    }
  }
  return null
}

export function layoutRow(input: RowInput): Run[] {
  if (!input.isMobile) {
    const desktop = desktopRow(input)
    if (desktop !== null) return desktop
  }
  return mobileRow(input)
}
