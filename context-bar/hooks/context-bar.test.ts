import { expect, test } from 'claude-code/testing'

import { cellsFor, compact, isMobile, nextMode, shortName } from './layout'
import { themeFromOsRelease } from './theme'

test('cellsFor fills exactly the used share', () => {
  const cells = cellsFor(
    [
      { name: 'a', tokens: 25, color: 'x', kind: 'used' },
      { name: 'b', tokens: 75, color: 'y', kind: 'free' },
    ],
    100,
    40,
  )
  expect(cells).toEqual([10, 30])
})

test('compact formats tokens', () => {
  expect(compact(950)).toBe('950')
  expect(compact(12_400)).toBe('12k')
  expect(compact(1_500_000)).toBe('1.5M')
})

test('fedora os-release gets the Fedora blue', () => {
  const t = themeFromOsRelease('NAME="Fedora Linux"\nID=fedora\nVERSION_ID=44\n')
  expect(t.accent).toBe('#51a2da')
  expect(t.name).toBe('Fedora Linux 44')
})

test('mobile mode: forced, auto by width, desktop override', () => {
  expect(isMobile('mobile', 200)).toBe(true)
  expect(isMobile('auto', 44)).toBe(true)
  expect(isMobile('auto', 120)).toBe(false)
  expect(isMobile('desktop', 30)).toBe(false)
})

test('nextMode parses /context-bar args', () => {
  expect(nextMode('mobile', 'auto')).toBe('mobile')
  expect(nextMode('mobile', 'mobile')).toBe('auto')
  expect(nextMode('', 'auto')).toBe(null)
  expect(shortName('MCP tools')).toBe('MCP')
})
