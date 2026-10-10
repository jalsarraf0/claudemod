import type { Theme } from '../types'

// Per-distro palettes; unknown systems fall back to a neutral blue.
const PALETTES: Record<string, Theme> = {
  fedora: { name: 'Fedora', accent: '#51a2da', deep: '#294172', soft: '#8cc4ec' },
  rhel: { name: 'RHEL', accent: '#4d8fd6', deep: '#1f3a66', soft: '#8ab4e8' },
  arch: { name: 'Arch', accent: '#1793d1', deep: '#0b4f75', soft: '#6cc3ee' },
  debian: { name: 'Debian', accent: '#5b8fd0', deep: '#2a4a7a', soft: '#9bbbe6' },
  ubuntu: { name: 'Ubuntu', accent: '#5b8fd0', deep: '#2a4a7a', soft: '#9bbbe6' },
  nixos: { name: 'NixOS', accent: '#5277c3', deep: '#2a3f73', soft: '#8fa8dc' },
}

export const DEFAULT_THEME: Theme = { name: 'Linux', accent: '#4f9ad8', deep: '#26416b', soft: '#8dbbe8' }

export const themeFromOsRelease = (text: string): Theme => {
  const field = (key: string) =>
    text.match(new RegExp(`^${key}=(.*)$`, 'm'))?.[1]?.replace(/^"|"$/g, '') ?? ''
  const ids = [field('ID'), ...field('ID_LIKE').split(/\s+/)].map(s => s.toLowerCase())
  const id = ids.find(one => one in PALETTES)
  const base = id ? PALETTES[id] : DEFAULT_THEME
  const version = field('VERSION_ID')
  const name = field('NAME') || base.name

  return { ...base, name: version ? `${name} ${version}` : name }
}
