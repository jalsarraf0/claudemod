/** Strip terminal escapes, controls and bidi formatting from external labels. */
export function plain(text: string): string {
  return text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\p{Cc}\p{Cf}]/gu, '')
}

/** Conservative terminal cell widths; wide glyphs take two, marks take zero. */
export function cellWidth(text: string): number {
  let width = 0
  for (const char of plain(text)) {
    const cp = char.codePointAt(0)!
    if (/\p{Mark}/u.test(char)) continue
    width += cp >= 0x1100 && (cp <= 0x115f || cp === 0x2329 || cp === 0x232a
      || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3)
      || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe10 && cp <= 0xfe6f)
      || (cp >= 0xff01 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6)
      || (cp >= 0x1f000 && cp <= 0x1faff) || (cp >= 0x20000 && cp <= 0x3ffff)) ? 2 : 1
  }
  return width
}

export function clip(text: string, columns: number): string {
  const safe = plain(text)
  const limit = Math.max(0, Math.floor(columns))
  if (cellWidth(safe) <= limit) return safe
  if (limit < 1) return ''
  let result = ''
  let used = 0
  for (const char of safe) {
    const width = /\p{Mark}/u.test(char) ? 0 : cellWidth(char)
    if (used + width > limit - 1) break
    result += char
    used += width
  }
  return `${result}…`
}
