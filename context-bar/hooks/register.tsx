import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Segment, Snapshot } from '../types'
import { cellsFor, compact } from './layout'
import { DEFAULT_THEME, themeFromOsRelease } from './theme'

const ref = { plugin: 'context-bar' } as const
const snapshot = atom({ ...ref, key: 'snapshot' } as const, null)
const isOn = atom({ ...ref, key: 'isOn' } as const, true)
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
      description: 'Toggle the stacked context-window bar above the prompt (on | off)',
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

  on('command.run', { command: 'context-bar' }, async $ => {
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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const snap = await read($, snapshot)
    if (e.props.hasSurvey || !(await read($, isOn)) || !snap) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const t = await read($, theme)
    const width = Math.max(10, e.props.bodyColumns - 4)
    const cells = cellsFor(snap.segments, snap.max, width)
    const hot = snap.percent >= 85
    const used = snap.segments.filter(s => s.kind === 'used')
    const status = e.props.isWorking ? '◉ working' : '◌ idle'

    return (
      <Box flexDirection="column" paddingX={1}>
        <Box>
          <Text color={t.deep}>▐</Text>
          <Text color={t.accent} bold>
            {' '}CONTEXT{' '}
          </Text>
          <Text color={t.deep}>▌</Text>
          <Text color={t.soft}> {t.name}</Text>
          <Text dimColor> · {snap.model} · {status} · </Text>
          <Text color={hot ? 'error' : t.accent} bold>
            {Math.round(snap.percent)}%
          </Text>
          <Text dimColor>
            {' '}
            {compact(snap.total)}/{compact(snap.max)}
          </Text>
        </Box>
        <Box>
          <Text color={t.deep}>╞</Text>
          {snap.segments.map((s, i) =>
            cells[i] > 0 ? (
              <Text key={s.name} color={s.color} dimColor={s.kind === 'free'}>
                {GLYPH[s.kind].repeat(cells[i])}
              </Text>
            ) : null,
          )}
          <Text color={t.deep}>╡</Text>
        </Box>
        <Box>
          {used.map(s => (
            <Text key={s.name} color={s.color}>
              ■ <Text dimColor>{s.name} {compact(s.tokens)}  </Text>
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
