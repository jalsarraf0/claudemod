import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Segment, Snapshot } from '../types'
import { cellsFor, compact, isMobile, nextMode, shortName } from './layout'
import { DEFAULT_THEME, themeFromOsRelease } from './theme'

const ref = { plugin: 'context-bar' } as const
const snapshot = atom({ ...ref, key: 'snapshot' } as const, null)
const isOn = atom({ ...ref, key: 'isOn' } as const, true)
const mode = atom({ ...ref, key: 'mode' } as const, 'auto')
const theme = atom({ ...ref, key: 'theme' } as const, DEFAULT_THEME)

const GLYPH = { used: '█', buffer: '▒', free: '░', deferred: ' ' } as const

async function refresh($: any) {
  try {
    const { context } = await $.session.usage({ breakdown: 'summary', columns: 80 })
    const b = context.breakdown
    if (!b) return
    const segments: Segment[] = b.categories
      .filter(c => c.kind !== 'deferred' && (c.tokens > 0 || c.kind === 'free'))
      .map(c => ({ name: c.name, tokens: c.tokens, color: c.color, kind: c.kind }))
    const snap: Snapshot = {
      segments,
      max: b.rawMaxTokens,
      total: b.totalTokens,
      percent: b.percentage,
      model: b.model,
    }
    await update($, snapshot, () => snap)
  } catch {
    // no session bound yet; the band stays quiet
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'context-bar',
      description: 'Toggle the stacked context-window bar above the prompt ; args: mobile | desktop | auto',
    })
    try {
      await update($, theme, () => themeFromOsRelease(''))
      const text = await $.fs.read('/etc/os-release')
      await update($, theme, () => themeFromOsRelease(text))
    } catch {
      // keep the default blue
    }
    await refresh($)

    return next(e)
  })

  on('command.run', { command: 'context-bar' }, async ($, e) => {
    const next = nextMode(e.args, await read($, mode))
    if (next) {
      await update($, mode, () => next)
      await update($, isOn, () => true)
      await refresh($)

      return { text: `Context bar: ${next === 'mobile' ? 'mobile mode on' : next === 'auto' ? 'auto layout (mobile below 57 columns)' : 'desktop layout'}.` }
    }
    const now = await read($, isOn)
    await update($, isOn, () => !now)
    await refresh($)

    return { text: now ? 'Context bar hidden.' : 'Context bar shown.' }
  })

  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  // The hint line under the prompt is the bottom-most row, so the bar lives there in both modes.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const snap = await read($, snapshot)
    if (!(await read($, isOn)) || !snap) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const t = await read($, theme)
    const columns = e.viewport?.columns ?? 80
    const mobile = isMobile(await read($, mode), columns)
    const hot = snap.percent >= 85
    const pct = `${Math.round(snap.percent)}%`
    const tokens = `${compact(snap.total)}/${compact(snap.max)}`
    const head = mobile ? '◢ ' : `◢ CONTEXT ${t.name} `
    const tail = mobile ? ` ${pct}` : ` ${pct} ${tokens} ${e.props.isWorking ? '◉' : '◌'}`
    const width = Math.max(8, columns - head.length - tail.length - 4)
    const cells = cellsFor(snap.segments, snap.max, width)

    return (
      <Box>
        <Text color={t.accent} bold>{head}</Text>
        <Text color={t.deep}>╞</Text>
        {snap.segments.map((s, i) =>
          cells[i] > 0 ? (
            <Text key={s.name} color={s.color} dimColor={s.kind === 'free'}>
              {GLYPH[s.kind].repeat(cells[i])}
            </Text>
          ) : null,
        )}
        <Text color={t.deep}>╡</Text>
        <Text color={hot ? 'error' : t.accent} bold>{tail}</Text>
      </Box>
    )
  })
}
