import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const CONFIG = JSON.stringify({ mcpServers: { github: {}, playwright: {} }, projects: { '/home/me': { disabledMcpServers: ['playwright'] } } })
const HINT = { component: 'PromptHint', props: { isDraft: false, isWorking: false, hint: '? for shortcuts · original' } } as const
function beneath(on: On, version = '2.1.296', grokKey?: string, routing: { decision?: 'allow' | 'ask' | 'deny'; hold?: Promise<void>; checkHold?: Promise<void>; modelHold?: Promise<void>; onCheck?: (input: unknown) => void; onDispatch?: () => void } = {}) {
  const clock = mock.clock(on)
  let config = CONFIG, model = 'claude-opus-4-6', cwd = '/home/me/app'
  let reads = 0, envReads = 0, gitRuns = 0
  const opened: string[] = []
  on('session.start', async (_$, e) => ({ cwd: e.cwd }))
  on('session.end', async (_$, e) => ({ sessionId: e.sessionId }))
  on('tool.register', async (_$, e) => ({ value: { tool: `mcp__cyberdeck__${e.name}` } }))
  on('tool.check', async (_$, e) => { routing.onCheck?.(e.input); if (routing.checkHold) await routing.checkHold; return { decision: routing.decision ?? 'allow' } })
  on('command.register', async (_$, e) => ({ value: { command: e.name } }))
  on('command.run', async () => ({ text: 'original command' }))
  on('prompt.submit', async (_$, e) => ({ text: e.text }))
  on('turn.complete', async () => ({ text: '' }))
  on('session.measure', async (_$, e) => ({ changed: [...e.changed] }))
  on('config.set', async (_$, e) => ({ value: e.value }))
  on('session.version', async () => ({ value: { version } }))
  on('session.model', async () => ({ value: model }))
  on('session.cwd', async () => ({ value: cwd }))
  on('env.get', async (_$, e) => { envReads++; if (routing.modelHold && ['CYBERDECK_CODEX_MODEL', 'CYBERDECK_GROK_MODEL'].includes(e.name)) await routing.modelHold; return { value: e.name === 'HOME' ? '/home/me' : e.name === 'XAI_API_KEY' ? grokKey : undefined } })
  on('fs.read', async () => { reads++; return config === 'unreadable' ? { deny: 'ENOENT' } : { value: config } })
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200000, tokens: 122000, percent: 61 }, rateLimits: [] } }))
  on('process.run', async (_$, e) => {
    gitRuns++
    if (e.argv[0] === 'codex' && !e.argv.includes('--version')) { routing.onDispatch?.(); if (routing.hold) await routing.hold }
    if (e.argv[0] === 'codex') return { value: { exitCode: 0, stdout: e.argv.includes('--version') ? 'codex 0.1' : JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: 'Codex reviewed the code.' } }) + '\n' + JSON.stringify({ type: 'turn.completed' }), stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
    return { value: { exitCode: 0, stdout: e.argv.includes('status') ? '# branch.oid abc\n# branch.head main\n# branch.ab +0 -0\n' : '/repo\n/repo/.git\n/repo/.git\n', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })
  on('agent.list', async () => ({ value: [{ id: 'a1', description: 'map the hud', type: 'Explore', status: 'running' as const }] }))
  on('ui.open', async (_$, e) => { opened.push(e.id); return { value: { isPlaced: true as const } } })
  on('ui.panes', async () => ({ value: [] }))
  on('ui.render', { component: 'PromptHint' }, async ($, e) => { const { Text } = $.ui.resolve(e); return Text({ children: e.props.hint }) })
  return { clock, opened, reads: () => reads, envReads: () => envReads, gitRuns: () => gitRuns,
    setConfig: (next: string) => { config = next }, setModel: (next: string) => { model = next }, setCwd: (next: string) => { cwd = next } }
}
const start = ($: Engine) => $.session.start({ cwd: '/home/me/app', surface: 'terminal', isInteractive: true })
const command = ($: Engine, args: string, columns = 120) => $.command.run({ command: 'cyberdeck', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns } })

async function hud($: Engine, columns = 120): Promise<string> {
  const ui = await $.ui.mount({ plugin: 'cyberdeck', surface: 'terminal', component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 3, bodyColumns: columns, scroll: { offset: 0, bodyRows: 3 }, view: {} },
    viewport: { columns, rows: 30 } })
  const text = (await ui.find({ type: 'Text' }))?.text || ''
  await ui.unmount()
  return text
}
test('session start publishes context, configured MCP and Git', async ($, on) => {
  const state = beneath(on)
  await start($)
  expect(state.opened).toEqual(['cyberdeck'])
  expect((await hud($))).toContain('CTX 61%')
  expect((await hud($))).toContain('MCP 1/2 enabled')
  expect((await hud($))).toContain('main clean')
})
test('agent polling avoids configuration and Git I/O', async ($, on) => {
  const state = beneath(on)
  await start($)
  const reads = state.reads(), env = state.envReads(), git = state.gitRuns()
  await state.clock.advance(6000)
  expect(state.reads()).toBe(reads)
  expect(state.envReads()).toBe(env)
  expect(state.gitRuns()).toBe(git)
})
test('manual refresh picks up model and configuration changes', async ($, on) => {
  const state = beneath(on)
  await start($)
  state.setModel('claude-haiku-4-5')
  state.setConfig(JSON.stringify({ mcpServers: { other: {} } }))
  expect((await command($, 'refresh')).text).toContain('refreshed')
  expect((await hud($))).toContain('Haiku 4.5')
  expect((await hud($))).toContain('MCP 1/1 enabled')
})
test('unreadable MCP config reports unknown rather than stale enablement', async ($, on) => {
  const state = beneath(on)
  await start($)
  state.setConfig('unreadable')
  await command($, 'refresh')
  expect((await hud($))).toContain('MCP ?')
})
test('mobile command fits the status and unknown options explain usage', async ($, on) => {
  const state = beneath(on)
  await start($)
  expect((await command($, 'mobile', 45)).text).toContain('mobile')
  expect((await hud($, 45)).length).toBeLessThanOrEqual(45)
  expect((await hud($, 45))).toContain('M1/2 A1')
  expect((await command($, 'garbage')).text).toContain('refresh')
})
test('PromptHint preserves an existing tail and adapts to the viewport', async ($, on) => {
  const state = beneath(on)
  await start($)
  const ui = await $.ui.mount({ plugin: 'cyberdeck', surface: 'terminal', ...HINT, viewport: { columns: 45, rows: 30 } })
  expect(await ui.find({ type: 'Text', text: 'original' })).toBeDefined()
  expect((await hud($, 45)).length).toBeLessThanOrEqual(45)
  await ui.unmount()
})

test('unsupported engines show a readable version requirement', async ($, on) => {
  beneath(on, '2.1.280')
  await start($)
  expect(await hud($)).toContain('requires Claude Code >= 2.1.290')
  expect((await command($, 'refresh')).text).toContain('2.1.280')
})


test('Codex slash handoff returns the completed result and provider-owned HUD task', async ($, on) => {
  beneath(on)
  await start($)
  const result = await command($, 'route codex review the authentication code')
  expect(result.text).toContain('Codex reviewed the code.')
  const ui = await $.ui.mount({ plugin: 'cyberdeck', surface: 'terminal', component: 'Pane', requestId: 'cyberdeck',
    props: { title: 'CYBERDECK', isFocused: false, placement: 'dock', bodyColumns: 70, scroll: { offset: 0, bodyRows: 30 }, view: {} }, viewport: { columns: 120, rows: 40 } })
  expect(await ui.find({ type: 'Text', text: '✓ Codex' })).toBeDefined()
  await ui.unmount()
})
test('automatic Grok handoff sends only the explicit task/context and returns its result', async ($, on) => {
  beneath(on, '2.1.296', 'test-only-key')
  on('http.fetch', async (_$, e) => {
    expect(e.url).toBe('https://api.x.ai/v1/responses')
    const body = JSON.parse(e.init!.body!)
    expect(body.store).toBe(false)
    expect(body.tools).toEqual([{ type: 'web_search' }])
    return { value: { ok: true, status: 200, headers: {}, text: JSON.stringify({ status: 'completed', output: [{ type: 'message', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: 'Grok research result.' }] }] }) } }
  })
  await start($)
  const result = await command($, 'route auto research latest Linux releases')
  expect(result.text).toContain('Grok research result.')
  expect(result.text).toContain('grok')
})
test('Grok errors do not expose response bodies or credentials', async ($, on) => {
  beneath(on, '2.1.296', 'test-only-key')
  on('http.fetch', async () => ({ value: { ok: false, status: 401, headers: {}, text: 'test-only-key and sensitive provider diagnostics' } }))
  await start($)
  const result = await command($, 'route grok research linux')
  expect(result.text).toContain('HTTP 401')
  expect(result.text).not.toContain('test-only-key')
  expect(result.text).not.toContain('sensitive')
})


test('router tool checks its actual arguments before an allowed dispatch', async ($, on) => {
  let checked: unknown
  beneath(on, '2.1.296', undefined, { onCheck: input => { checked = input } })
  await start($)
  const result = await $.tool.call({ tool: 'mcp__cyberdeck__route', task: 'review code', provider: 'codex', context: 'explicit context' })
  expect(checked).toEqual({ task: 'review code', provider: 'codex', context: 'explicit context' })
  expect(result.result).toContain('Codex reviewed the code.')
})
for (const decision of ['ask', 'deny'] as const) test(`router tool ${decision} prevents dispatch`, async ($, on) => {
  let dispatched = 0
  beneath(on, '2.1.296', undefined, { decision, onDispatch: () => { dispatched++ } })
  await start($)
  const result = await $.tool.call({ tool: 'mcp__cyberdeck__route', task: 'review code', provider: 'codex' })
  expect(result.deny).toContain('requires permission')
  expect(dispatched).toBe(0)
})
test('three simultaneous routed tool calls dispatch at most two tasks', async ($, on) => {
  let release!: () => void, dispatched = 0
  const hold = new Promise<void>(resolve => { release = resolve })
  const state = beneath(on, '2.1.296', undefined, { hold, onDispatch: () => { dispatched++ } })
  await start($)
  const jobs = [1, 2, 3].map(n => $.tool.call({ tool: 'mcp__cyberdeck__route', task: `review code ${n}`, provider: 'codex' }))
  await state.clock.settle()
  const inFlight = dispatched
  release()
  const results = await Promise.all(jobs)
  expect(inFlight).toBe(2)
  expect(results.filter(result => result.deny?.includes('Two routed tasks'))).toHaveLength(1)
})
test('clear removes old routed task descriptions and rejects late results', async ($, on) => {
  let release!: () => void
  const hold = new Promise<void>(resolve => { release = resolve })
  const state = beneath(on, '2.1.296', undefined, { hold })
  await start($)
  const job = $.tool.call({ tool: 'mcp__cyberdeck__route', task: 'review old private task', provider: 'codex' })
  await state.clock.settle()
  await $.session.end({ reason: 'clear', sessionId: 'old-session', resume: { id: 'old-session' } })
  release()
  const result = await job
  expect(result.deny).toContain('previous session')
  const ui = await $.ui.mount({ plugin: 'cyberdeck', surface: 'terminal', component: 'Pane', requestId: 'cyberdeck',
    props: { title: 'CYBERDECK', isFocused: false, placement: 'dock', bodyColumns: 70, scroll: { offset: 0, bodyRows: 30 }, view: {} }, viewport: { columns: 120, rows: 40 } })
  expect(await ui.find({ type: 'Text', text: 'old private task' })).toBeUndefined()
  await ui.unmount()
})

for (const reason of ['clear', 'resume', 'prompt_input_exit'] as const) test(`${reason} during permission checking prevents obsolete dispatch`, async ($, on) => {
  let release!: () => void, dispatched = 0
  const checkHold = new Promise<void>(resolve => { release = resolve })
  const state = beneath(on, '2.1.296', undefined, { checkHold, onDispatch: () => { dispatched++ } })
  await start($)
  const job = $.tool.call({ tool: 'mcp__cyberdeck__route', task: 'review old private task', provider: 'codex' })
  await state.clock.settle()
  await $.session.end({ reason, sessionId: 'old-session', resume: { id: 'old-session' } })
  release()
  const result = await job
  expect(result.deny).toContain('previous session')
  expect(dispatched).toBe(0)
})

for (const provider of ['codex', 'grok'] as const) test(`clear during ${provider} request preparation prevents obsolete dispatch`, async ($, on) => {
  let release!: () => void, dispatched = 0
  const modelHold = new Promise<void>(resolve => { release = resolve })
  const state = beneath(on, '2.1.296', 'test-only-key', { modelHold, onDispatch: () => { dispatched++ } })
  on('http.fetch', async () => { dispatched++; return { value: { ok: false, status: 401, headers: {}, text: '' } } })
  await start($)
  const job = $.tool.call({ tool: 'mcp__cyberdeck__route', task: 'old private task', provider })
  await state.clock.settle()
  await $.session.end({ reason: 'clear', sessionId: 'old-session', resume: { id: 'old-session' } })
  release()
  const result = await job
  expect(result.deny).toContain('previous session')
  expect(dispatched).toBe(0)
})

test('Grok deadlines retain concurrency slots until the underlying requests settle', async ($, on) => {
  let release!: () => void, dispatched = 0
  const hold = new Promise<void>(resolve => { release = resolve })
  const state = beneath(on, '2.1.296', 'test-only-key')
  on('http.fetch', async () => {
    dispatched++
    await hold
    return { value: { ok: true, status: 200, headers: {}, text: JSON.stringify({ status: 'completed', output: [{ type: 'message', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: 'late Grok answer' }] }] }) } }
  })
  await start($)
  const jobs = [1, 2].map(n => command($, `route grok task ${n}`))
  await state.clock.settle()
  await state.clock.advance(120000)
  const results = await Promise.all(jobs)
  expect(results.every(result => result.text?.includes('timed out'))).toBe(true)
  await $.session.end({ reason: 'clear', sessionId: 'old-session', resume: { id: 'old-session' } })
  const third = command($, 'route grok task 3')
  await state.clock.settle()
  const inFlight = dispatched
  release()
  const thirdResult = await third
  await state.clock.settle()
  expect(inFlight).toBe(2)
  expect(thirdResult.text).toContain('Two routed tasks')
  expect((await command($, 'route grok task 4')).text).toContain('late Grok answer')
})

test('clear during completion publication discards the old answer', async ($, on) => {
  let release!: () => void
  const hold = new Promise<void>(resolve => { release = resolve })
  const state = beneath(on)
  on('state.set', async (_$, e, next) => {
    const result = await next(e)
    if (e.key === 'routedAgents' && Array.isArray(e.value) && e.value.some(row => row.status === 'completed')) await hold
    return result
  })
  await start($)
  const job = command($, 'route codex old private task')
  await state.clock.settle()
  await $.session.end({ reason: 'clear', sessionId: 'old-session', resume: { id: 'old-session' } })
  release()
  expect((await job).text).toContain('previous session')
})
