import { describe, expect, test } from 'claude-code/testing'

import type { OsInfo } from '../types'
import { barRuns, layoutRow, runsWidth } from '../hooks/lib/layout'
import { osInfoFrom } from '../hooks/lib/osrelease'
import { snapshotFrom } from '../hooks/lib/snapshot'
import { NOBARA, NEUTRAL } from '../hooks/lib/theme'
import { breakdown, NOBARA_44_KDE } from './fixtures'

const snap = snapshotFrom(breakdown())
const nobara: OsInfo = osInfoFrom(NOBARA_44_KDE)
const text = (runs: { text: string }[]) => runs.map(r => r.text).join('')

describe('snapshotFrom', () => {
  test('drops deferred and empty used rows, keeps free', () => {
    expect(snap.segments.map(s => s.name)).toEqual([
      'System prompt',
      'System tools',
      'Memory files',
      'Messages',
      'Free space',
      'Autocompact buffer',
    ])
    const empty = snapshotFrom(breakdown({
      categories: [{ name: 'Free space', tokens: 0, color: 'promptBorder', kind: 'free', isDeferred: false }],
    }))
    expect(empty.segments.length).toBe(1)
    expect(snap.percent).toBe(58)
    expect(snap.usedTokens).toBe(116_000)
  })
})

describe('bar', () => {
  test('used, then buffer, then free; colors follow /context', () => {
    const runs = barRuns(snap.segments, 40, false)
    expect(runsWidth(runs)).toBe(40)
    expect(runs[0]?.color).toBe('promptBorder')
    expect(text(runs)).toMatch(/^█+▒+░+$/)
  })

  test('mobile draws buffer and free as dots, never ░', () => {
    const runs = barRuns(snap.segments, 20, true)
    expect(text(runs)).toMatch(/^█+·+$/)
    expect(text(runs)).not.toContain('░')
  })
})

describe('desktop row', () => {
  test('full row at 120 columns fits and carries every part', () => {
    const runs = layoutRow({ snapshot: snap, os: nobara, columns: 120, isMobile: false, isWorking: false })
    const row = text(runs)
    expect(runsWidth(runs)).toBe(119)
    expect(row.startsWith('◢ CONTEXT Nobara Linux 44 · KDE ╞')).toBe(true)
    expect(row.endsWith('╡ 58% 116k/200k ◌')).toBe(true)
    expect(runs[0]?.color).toBe(NOBARA.glyph)
  })

  test('working shows ◉', () => {
    const row = text(layoutRow({ snapshot: snap, os: nobara, columns: 100, isMobile: false, isWorking: true }))
    expect(row.endsWith(' ◉')).toBe(true)
  })

  test('narrower rows drop the label before the bar gets too short', () => {
    for (const columns of [57, 60, 70, 80, 90]) {
      const runs = layoutRow({ snapshot: snap, os: nobara, columns, isMobile: false, isWorking: false })
      expect(runsWidth(runs)).toBe(columns - 1)
    }
    const mid = text(layoutRow({ snapshot: snap, os: nobara, columns: 57, isMobile: false, isWorking: false }))
    expect(mid).toContain('Nobara Linux 44 ╞')
    expect(mid).not.toContain('KDE')
    const tight = text(layoutRow({ snapshot: snap, os: nobara, columns: 50, isMobile: false, isWorking: false }))
    expect(tight.startsWith('◢ CONTEXT ╞')).toBe(true)
  })

  test('other distros use the neutral blue', () => {
    const fedora: OsInfo = { id: 'fedora', isNobara: false, label: 'Fedora Linux 44', flavor: null, isCompact: false }
    const runs = layoutRow({ snapshot: snap, os: fedora, columns: 120, isMobile: false, isWorking: false })
    expect(runs[0]?.color).toBe(NEUTRAL.glyph)
    expect(text(runs)).toContain('Fedora Linux 44 ╞')
  })
})

describe('mobile row', () => {
  test('leads with the bold percent and frames the bar', () => {
    const runs = layoutRow({ snapshot: snap, os: nobara, columns: 44, isMobile: true, isWorking: false })
    expect(runs[0]).toEqual({ text: '58%', color: NOBARA.heat.cool, bold: true })
    expect(text(runs)).toMatch(/^58% ▕█+·+▏ 116k$/)
    expect(runsWidth(runs)).toBe(43)
  })

  test('drops the token count under 40 columns', () => {
    const runs = layoutRow({ snapshot: snap, os: nobara, columns: 39, isMobile: true, isWorking: false })
    expect(text(runs)).toMatch(/▏$/)
    expect(runsWidth(runs)).toBe(38)
  })

  test('heat colors the percent and tokens', () => {
    const warm = { ...snap, percent: 72 }
    const hot = { ...snap, percent: 91 }
    const warmRuns = layoutRow({ snapshot: warm, os: nobara, columns: 50, isMobile: true, isWorking: false })
    const hotRuns = layoutRow({ snapshot: hot, os: nobara, columns: 50, isMobile: true, isWorking: false })
    expect(warmRuns[0]?.color).toBe('warning')
    expect(hotRuns[0]?.color).toBe('#F96855')
    expect(hotRuns[hotRuns.length - 1]?.color).toBe('#F96855')
  })
})
