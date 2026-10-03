import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { BarMode, OsInfo, Snapshot } from '../types'
import { layoutRow } from './lib/layout'
import type { Run } from './lib/layout'
import { isMobileLayout, nextMode, parseCommand } from './lib/mode'
import { osInfoFrom } from './lib/osrelease'
import { snapshotFrom } from './lib/snapshot'

const COMMAND = 'context-bar'

const isOn = atom({ plugin: 'nobara-bar', key: 'isOn' } as const, true)
const mode = atom({ plugin: 'nobara-bar', key: 'mode' } as const, 'auto' as BarMode)
const snapshot = atom({ plugin: 'nobara-bar', key: 'snapshot' } as const, null as Snapshot | null)
const os = atom({ plugin: 'nobara-bar', key: 'os' } as const, null as OsInfo | null)

async function refresh($: EngineInterface): Promise<void> {
  try {
    const usage = await $.session.usage({ breakdown: 'summary', columns: 80 })
    const breakdown = usage.context.breakdown
    if (breakdown === undefined) return
    const next = snapshotFrom(breakdown)
    await update($, snapshot, () => next)
  } catch {
    // No session bound yet, or the breakdown failed: keep the last bar.
  }
}

async function detectOs($: EngineInterface): Promise<void> {
  try {
    const info = osInfoFrom(await $.fs.read('/etc/os-release'))
    await update($, os, () => info)
  } catch {
    // Unreadable os-release: the neutral palette and no label.
  }
}

function styleOf(run: Run): { color?: string; bold?: boolean; dimColor?: boolean } {
  const style: { color?: string; bold?: boolean; dimColor?: boolean } = {}
  if (run.color !== undefined) style.color = run.color
  if (run.bold === true) style.bold = true
  if (run.dim === true) style.dimColor = true
  return style
}

function describeMode(value: BarMode): string {
  if (value === 'mobile') return 'mobile layout (compact row)'
  if (value === 'desktop') return 'desktop layout (full row)'
  return 'auto layout (mobile at 56 columns or fewer)'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Context bar: toggle, or `mobile` | `desktop` | `auto` layout',
    })
    await detectOs($)
    await refresh($)

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('command.run', { command: 'context-bar' }, async ($, e) => {
    const command = parseCommand(e.args)

    if (command.kind === 'unknown') {
      return { text: `Unknown option "${command.arg}". Use /context-bar [mobile|desktop|auto].` }
    }

    if (command.kind === 'toggle') {
      const shown = await update($, isOn, value => !value)
      await refresh($)

      return { text: shown ? 'Context bar on.' : 'Context bar off.' }
    }

    const chosen = await update($, mode, value => nextMode(value, command))
    await update($, isOn, () => true)
    await refresh($)

    return { text: `Context bar: ${describeMode(chosen)}.` }
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (!(await read($, isOn))) return next(e)
    const snap = await read($, snapshot)
    if (snap === null) return next(e)

    const info = await read($, os)
    const columns = e.viewport?.columns ?? 80
    const isMobile = isMobileLayout(await read($, mode), columns, info?.isCompact ?? false)
    const runs = layoutRow({
      snapshot: snap,
      os: info,
      columns,
      isMobile,
      isWorking: e.props.isWorking,
    })
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" flexWrap="nowrap">
        {runs.map(run => (
          <Text {...styleOf(run)}>{run.text}</Text>
        ))}
      </Box>
    )
  })
}
