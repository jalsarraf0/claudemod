// Colours: Nobara's brand palette (from a third-party brand listing, so
// approximate), and a neutral blue for every other distro. Values are raw
// colours or theme keys; the terminal takes either.

import type { Heat } from './format'

export type Palette = {
  accent: string
  deep: string
  glyph: string
  heat: Record<Heat, string>
}

export const NOBARA: Palette = {
  accent: '#7289D9',
  deep: '#2671B2',
  glyph: '#F96855',
  heat: { cool: '#7289D9', warm: 'warning', hot: '#F96855' },
}

export const NEUTRAL: Palette = {
  accent: '#5B8DEF',
  deep: '#3B6FB6',
  glyph: '#5B8DEF',
  heat: { cool: '#5B8DEF', warm: 'warning', hot: 'error' },
}

export function paletteFor(isNobara: boolean): Palette {
  return isNobara ? NOBARA : NEUTRAL
}
