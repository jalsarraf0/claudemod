// /context-bar arguments and layout choice.

import type { BarMode } from '../../types'

export const MOBILE_MAX_COLUMNS = 56

export type BarCommand =
  | { kind: 'toggle' }
  | { kind: 'mode'; mode: BarMode }
  | { kind: 'toggle-mobile' }
  | { kind: 'unknown'; arg: string }

export function parseCommand(args: string): BarCommand {
  const arg = args.trim().toLowerCase()
  if (arg === '') return { kind: 'toggle' }
  if (arg === 'mobile') return { kind: 'toggle-mobile' }
  if (arg === 'desktop' || arg === 'auto') return { kind: 'mode', mode: arg }
  return { kind: 'unknown', arg: args.trim() }
}

export function nextMode(current: BarMode, command: BarCommand): BarMode {
  if (command.kind === 'toggle-mobile') return current === 'mobile' ? 'auto' : 'mobile'
  if (command.kind === 'mode') return command.mode
  return current
}

// Steam HTPC/Handheld editions default to the compact row under auto.
export function isMobileLayout(mode: BarMode, columns: number, isCompactOs: boolean): boolean {
  if (mode === 'mobile') return true
  if (mode === 'desktop') return false
  return columns <= MOBILE_MAX_COLUMNS || isCompactOs
}
