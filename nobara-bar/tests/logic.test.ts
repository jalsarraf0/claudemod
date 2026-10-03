import { describe, expect, test } from 'claude-code/testing'

import { allocateCells } from '../hooks/lib/cells'
import { formatTokens, heatOf } from '../hooks/lib/format'
import { isMobileLayout, nextMode, parseCommand } from '../hooks/lib/mode'
import { detectDistro, osInfoFrom, parseOsRelease } from '../hooks/lib/osrelease'
import { NOBARA_44_KDE, NOBARA_STEAM_HANDHELD, FEDORA_44, ROCKY_9 } from './fixtures'

const sum = (cells: number[]) => cells.reduce((a, b) => a + b, 0)

describe('allocateCells', () => {
  test('cells always sum to the width', () => {
    const items = [
      { weight: 12_345, isRequired: true },
      { weight: 3, isRequired: true },
      { weight: 98_000, isRequired: true },
      { weight: 33_000, isRequired: false },
      { weight: 120_000, isRequired: false },
    ]
    for (const width of [1, 2, 5, 7, 13, 40, 57, 80, 211]) {
      expect(sum(allocateCells(items, width))).toBe(width)
    }
  })

  test('a tiny used category still gets one cell', () => {
    const cells = allocateCells(
      [
        { weight: 50, isRequired: true },
        { weight: 199_000, isRequired: false },
      ],
      20,
    )
    expect(cells).toEqual([1, 19])
  })

  test('largest remainder decides the leftover cells', () => {
    // Quotas 3.4, 3.3, 3.3 for 10 cells: floors 3,3,3, the extra to the first.
    expect(allocateCells(
      [
        { weight: 34, isRequired: false },
        { weight: 33, isRequired: false },
        { weight: 33, isRequired: false },
      ],
      10,
    )).toEqual([4, 3, 3])
  })

  test('minimums are paid for by the most over-allocated segment', () => {
    const cells = allocateCells(
      [
        { weight: 1, isRequired: true },
        { weight: 1, isRequired: true },
        { weight: 1, isRequired: true },
        { weight: 1_000, isRequired: false },
      ],
      10,
    )
    expect(cells).toEqual([1, 1, 1, 7])
  })

  test('narrower than the minimums: heaviest required segments win', () => {
    const cells = allocateCells(
      [
        { weight: 5, isRequired: true },
        { weight: 50, isRequired: true },
        { weight: 500, isRequired: true },
      ],
      2,
    )
    expect(sum(cells)).toBe(2)
    expect(cells).toEqual([0, 1, 1])
  })

  test('zero total puts every cell on the last segment', () => {
    expect(allocateCells([{ weight: 0, isRequired: true }, { weight: 0, isRequired: false }], 6)).toEqual([0, 6])
  })

  test('zero width is all zeros', () => {
    expect(allocateCells([{ weight: 9, isRequired: true }], 0)).toEqual([0])
  })
})

describe('formatTokens', () => {
  test('formats counts compactly', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(950)).toBe('950')
    expect(formatTokens(1_000)).toBe('1k')
    expect(formatTokens(9_540)).toBe('9.5k')
    expect(formatTokens(116_400)).toBe('116k')
    expect(formatTokens(200_000)).toBe('200k')
    expect(formatTokens(999_700)).toBe('1M')
    expect(formatTokens(1_000_000)).toBe('1M')
    expect(formatTokens(1_250_000)).toBe('1.3M')
  })

  test('heat thresholds at 70 and 85', () => {
    expect(heatOf(0)).toBe('cool')
    expect(heatOf(69.9)).toBe('cool')
    expect(heatOf(70)).toBe('warm')
    expect(heatOf(84)).toBe('warm')
    expect(heatOf(85)).toBe('hot')
    expect(heatOf(130)).toBe('hot')
  })
})

describe('mode parsing', () => {
  test('parses the command arguments', () => {
    expect(parseCommand('')).toEqual({ kind: 'toggle' })
    expect(parseCommand('  ')).toEqual({ kind: 'toggle' })
    expect(parseCommand('mobile')).toEqual({ kind: 'toggle-mobile' })
    expect(parseCommand('Desktop')).toEqual({ kind: 'mode', mode: 'desktop' })
    expect(parseCommand('auto')).toEqual({ kind: 'mode', mode: 'auto' })
    expect(parseCommand('tablet')).toEqual({ kind: 'unknown', arg: 'tablet' })
  })

  test('mobile toggles back to auto', () => {
    expect(nextMode('auto', { kind: 'toggle-mobile' })).toBe('mobile')
    expect(nextMode('desktop', { kind: 'toggle-mobile' })).toBe('mobile')
    expect(nextMode('mobile', { kind: 'toggle-mobile' })).toBe('auto')
    expect(nextMode('mobile', { kind: 'mode', mode: 'desktop' })).toBe('desktop')
  })

  test('auto switches at 56 columns; compact OS defaults to mobile', () => {
    expect(isMobileLayout('auto', 56, false)).toBe(true)
    expect(isMobileLayout('auto', 57, false)).toBe(false)
    expect(isMobileLayout('auto', 200, true)).toBe(true)
    expect(isMobileLayout('desktop', 30, true)).toBe(false)
    expect(isMobileLayout('mobile', 200, false)).toBe(true)
  })
})

describe('os-release', () => {
  test('parses quoted and bare values', () => {
    const fields = parseOsRelease(NOBARA_44_KDE)
    expect(fields.NAME).toBe('Nobara Linux')
    expect(fields.ID_LIKE).toBe('rhel centos fedora')
    expect(fields.VERSION_ID).toBe('44')
    expect(fields.VERSION_CODENAME).toBe('')
  })

  test('ID=nobara beats ID_LIKE matching (rhel is listed first)', () => {
    const fields = parseOsRelease(NOBARA_44_KDE)
    expect((fields.ID_LIKE ?? '').split(' ')[0]).toBe('rhel')
    expect(detectDistro(fields)).toBe('nobara')
    const info = osInfoFrom(NOBARA_44_KDE)
    expect(info).toEqual({
      id: 'nobara',
      isNobara: true,
      label: 'Nobara Linux 44',
      flavor: 'KDE',
      isCompact: false,
    })
  })

  test('Steam Handheld edition is compact', () => {
    const info = osInfoFrom(NOBARA_STEAM_HANDHELD)
    expect(info.isNobara).toBe(true)
    expect(info.flavor).toBe('Handheld')
    expect(info.isCompact).toBe(true)
  })

  test('other distros use ID, then the first known ID_LIKE', () => {
    expect(osInfoFrom(FEDORA_44).id).toBe('fedora')
    expect(osInfoFrom(FEDORA_44).isNobara).toBe(false)
    expect(detectDistro(parseOsRelease(ROCKY_9))).toBe('rhel')
  })
})
