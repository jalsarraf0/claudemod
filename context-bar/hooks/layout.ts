import type { Mode, Segment } from '../types'

export const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : `${n}`

// Largest-remainder split of `width` cells across segments by token share.
export const cellsFor = (segments: Segment[], max: number, width: number): number[] => {
  const raw = segments.map(s => (max > 0 ? (Math.max(0, s.tokens) / max) * width : 0))
  const cells = raw.map(Math.floor)
  let spare = Math.min(width, Math.round(raw.reduce((a, b) => a + b, 0))) - cells.reduce((a, b) => a + b, 0)
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0])

  for (const [, i] of order) {
    if (spare <= 0) break
    cells[i] = (cells[i] ?? 0) + 1
    spare -= 1
  }
  // keep any non-empty used category visible
  segments.forEach((s, i) => {
    if (s.kind === 'used' && s.tokens > 0 && cells[i] === 0) cells[i] = 1
  })

  return cells
}

// Termius on a phone is typically 36-50 columns portrait; auto switches below this.
export const MOBILE_MAX_COLUMNS = 56

export const isMobile = (mode: Mode, columns: number) =>
  mode === 'mobile' || (mode === 'auto' && columns <= MOBILE_MAX_COLUMNS)

// One-letter-ish tags so the legend fits a phone-width row.
export const shortName = (name: string) => {
  const known: Record<string, string> = {
    'System prompt': 'Sys',
    'System tools': 'Tools',
    'MCP tools': 'MCP',
    'Custom agents': 'Agents',
    'Memory files': 'Mem',
    Skills: 'Skills',
    Messages: 'Msgs',
  }

  return known[name] ?? name.slice(0, 5)
}

export const nextMode = (arg: string, current: Mode): Mode | null => {
  const word = arg.trim().toLowerCase()
  if (word === 'mobile') return current === 'mobile' ? 'auto' : 'mobile'
  if (word === 'desktop') return 'desktop'
  if (word === 'auto') return 'auto'

  return null
}
