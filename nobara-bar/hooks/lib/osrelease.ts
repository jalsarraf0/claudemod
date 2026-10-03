// /etc/os-release parsing and distro detection.

import type { OsInfo } from '../../types'

export function parseOsRelease(text: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
      value = value.slice(1, -1)
      if (quote === '"') value = value.replace(/\\(["\\$`])/g, '$1')
    }
    fields[key] = value
  }
  return fields
}

// Distros the bar knows by name, used only when ID is not nobara.
const KNOWN: Record<string, string> = {
  fedora: 'Fedora',
  rhel: 'RHEL',
  centos: 'CentOS',
  debian: 'Debian',
  ubuntu: 'Ubuntu',
  arch: 'Arch',
  opensuse: 'openSUSE',
}

// Nobara reports ID_LIKE="rhel centos fedora", so a first-ID_LIKE-match
// lookup would pick rhel. ID wins, and ID=nobara is checked before anything.
export function detectDistro(fields: Record<string, string>): string {
  const id = (fields.ID ?? '').toLowerCase()
  if (id === 'nobara') return 'nobara'
  if (id !== '' && id in KNOWN) return id
  for (const like of (fields.ID_LIKE ?? '').toLowerCase().split(/\s+/)) {
    if (like in KNOWN) return like
  }
  return id === '' ? 'linux' : id
}

export function flavorOf(fields: Record<string, string>): string | null {
  const variant = `${fields.VARIANT_ID ?? ''} ${fields.VARIANT ?? ''}`.toLowerCase()
  if (/htpc/.test(variant)) return 'HTPC'
  if (/handheld|deck/.test(variant)) return 'Handheld'
  if (/steam/.test(variant)) return 'Steam'
  if (/gnome/.test(variant)) return 'GNOME'
  if (/kde|plasma/.test(variant)) return 'KDE'
  if (/official/.test(variant)) return 'Official'
  const id = (fields.VARIANT_ID ?? '').trim()
  return id === '' ? null : id.toUpperCase()
}

export function osInfoFrom(text: string): OsInfo {
  const fields = parseOsRelease(text)
  const id = detectDistro(fields)
  const isNobara = id === 'nobara'
  const name = fields.NAME ?? KNOWN[id] ?? 'Linux'
  const version = fields.VERSION_ID ?? ''
  const flavor = flavorOf(fields)
  return {
    id,
    isNobara,
    label: version === '' ? name : `${name} ${version}`,
    flavor,
    isCompact: isNobara && (flavor === 'HTPC' || flavor === 'Handheld' || flavor === 'Steam'),
  }
}
