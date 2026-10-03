import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On, SessionContextBreakdown } from 'claude-code'

import { breakdown, NOBARA_44_KDE } from './fixtures'

const HINT = {
  component: 'PromptHint',
  props: { isDraft: false, isWorking: false, hint: '? for shortcuts' },
} as const

function engineBeneath(on: On, osRelease: string | null, context: SessionContextBreakdown = breakdown()): void {
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('ui.render', { component: 'PromptHint' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return Text({ children: e.props.hint })
  })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('session.usage', async () => ({
    value: {
      startedAt: 0,
      context: { window: 200_000, tokens: 116_000, percent: 58, breakdown: context },
      rateLimits: [],
    },
  }))
  on('fs.read', async (_$, e) => {
    if (e.path === '/etc/os-release' && osRelease !== null) return { value: osRelease }
    return { deny: `ENOENT: ${e.path}` }
  })
}

async function start($: Engine): Promise<void> {
  await $.session.start({ cwd: '/home/me/project', surface: 'terminal', isInteractive: true })
}

async function runBar($: Engine, args: string): Promise<string | undefined> {
  const result = await $.command.run({
    command: 'context-bar',
    args,
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 120 },
  })
  return result.text
}

test('draws the Nobara desktop row on the PromptHint line', async ($, on) => {
  engineBeneath(on, NOBARA_44_KDE)
  await start($)
  const ui = await $.ui.mount({
    plugin: 'nobara-bar',
    surface: 'terminal',
    ...HINT,
    viewport: { columns: 120, rows: 40 },
  })
  expect(await ui.find({ type: 'Text', text: '◢' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'Nobara Linux 44 · KDE' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '116k/200k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '? for shortcuts' })).toBeUndefined()
  await ui.unmount()
})

test('/context-bar toggles off, and the engine hint comes back', async ($, on) => {
  engineBeneath(on, NOBARA_44_KDE)
  await start($)
  expect(await runBar($, '')).toBe('Context bar off.')
  const ui = await $.ui.mount({ plugin: 'nobara-bar', surface: 'terminal', ...HINT, viewport: { columns: 120, rows: 40 } })
  expect(await ui.find({ type: 'Text', text: '? for shortcuts' })).toBeDefined()
  await ui.unmount()
  expect(await runBar($, '')).toBe('Context bar on.')
})

test('mobile, desktop and auto switch the layout', async ($, on) => {
  engineBeneath(on, NOBARA_44_KDE)
  await start($)
  const mount = () => $.ui.mount({ plugin: 'nobara-bar', surface: 'terminal', ...HINT, viewport: { columns: 120, rows: 40 } })

  expect(await runBar($, 'mobile')).toContain('mobile layout')
  let ui = await mount()
  expect(await ui.find({ type: 'Text', text: '▕' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '◢' })).toBeUndefined()
  await ui.unmount()

  expect(await runBar($, 'mobile')).toContain('auto layout')
  expect(await runBar($, 'desktop')).toContain('desktop layout')
  ui = await mount()
  expect(await ui.find({ type: 'Text', text: '◢' })).toBeDefined()
  await ui.unmount()

  expect(await runBar($, 'sideways')).toContain('Unknown option')
})

test('auto goes mobile at 56 columns', async ($, on) => {
  engineBeneath(on, NOBARA_44_KDE)
  await start($)
  const ui = await $.ui.mount({ plugin: 'nobara-bar', surface: 'terminal', ...HINT, viewport: { columns: 56, rows: 40 } })
  expect(await ui.find({ type: 'Text', text: '58%' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '▕' })).toBeDefined()
  await ui.unmount()
})

test('no os-release falls back to the neutral palette without a label', async ($, on) => {
  engineBeneath(on, null)
  await start($)
  const ui = await $.ui.mount({ plugin: 'nobara-bar', surface: 'terminal', ...HINT, viewport: { columns: 120, rows: 40 } })
  expect(await ui.find({ type: 'Text', text: '◢' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Nobara/ })).toBeUndefined()
  await ui.unmount()
})
