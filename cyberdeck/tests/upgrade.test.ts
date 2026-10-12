import { describe, expect, test } from 'claude-code/testing'
import { deckLines, statusLine } from '../hooks/lib/hud'
import { mcpSwitchesFromConfig } from '../hooks/lib/mcp'
import { whereModelRuns } from '../hooks/lib/model'

const cloud = { kind: 'cloud', provider: 'Anthropic', host: null } as const
const textOf = (lines: ReturnType<typeof deckLines>) => lines.map(line => line.map(run => run.text).join('')).join('\n')

describe('Cyberdeck 0.2', () => {
  test('MCP configuration says enabled, without implying connectivity', () => {
    const text = textOf(deckLines({ modelId: 'claude-opus-4-6', where: cloud, agents: [], mcp: [{ name: 'github', enabled: true }], columns: 40 }))
    expect(text).toContain('MCP 1/1 enabled')
    expect(text).toContain('github enabled')
  })
  test('null and non-object configuration fail safely', () => {
    for (const text of ['null', '42', '[]', '"secret"']) expect(mcpSwitchesFromConfig(text, '/tmp')).toEqual([])
  })
  test('closest project includes project-scoped servers without leaking their definitions', () => {
    const text = JSON.stringify({ mcpServers: { global: { env: { TOKEN: 'secret' } } }, projects: { '/repo': { mcpServers: { project: { command: 'secret' } }, disabledMcpServers: ['global'] } } })
    expect(mcpSwitchesFromConfig(text, '/repo/sub')).toEqual([{ name: 'global', enabled: false }, { name: 'project', enabled: true }])
    expect(mcpSwitchesFromConfig(text, '/repository')).toEqual([{ name: 'global', enabled: true }])
  })
  test('local endpoint displays its port, without guessing the runtime from the port', () => {
    expect(whereModelRuns({ baseUrl: 'http://user:secret@192.168.50.5:1234/v1?token=secret' })).toEqual({ kind: 'local', provider: 'local endpoint', host: '192.168.50.5:1234' })
  })
  test('false provider flags do not override a local endpoint', () => {
    expect(whereModelRuns({ bedrock: 'false', baseUrl: 'http://localhost:1234' }).kind).toBe('local')
  })
  test('context and Git appear in the full pane', () => {
    const text = textOf(deckLines({ modelId: 'claude-opus-4-6', where: cloud, agents: [], mcp: [], columns: 50,
      context: { percent: 61, usedTokens: 122000, maxTokens: 200000 },
      git: { branch: 'main', dirty: false, ahead: 2, behind: 1, worktree: true, root: '/repo/fix' } }))
    expect(text).toContain('CONTEXT')
    expect(text).toContain('61%')
    expect(text).toContain('122k / 200k')
    expect(text).toContain('main clean')
    expect(text).toContain('↑2 ↓1')
    expect(text).toContain('worktree fix')
  })
  test('mobile status preserves context and counts before long model names', () => {
    const text = statusLine('some-very-long-local-model-name', cloud, 3, 4, 2, { columns: 45, context: { percent: 61, usedTokens: 122000, maxTokens: 200000 } })
    expect(text.length).toBeLessThanOrEqual(45)
    expect(text).toContain('61%')
    expect(text).toContain('M3/4')
    expect(text).toContain('A2')
  })
  test('every pane row fits even very narrow terminals', () => {
    for (const columns of [1, 4, 6, 10, 20, 40, 70, 120]) {
      const lines = deckLines({ modelId: 'claude-opus-4-6', where: cloud, agents: [], mcp: [{ name: 'long-server-name', enabled: true }], columns })
      for (const line of lines) expect(line.map(run => run.text).join('').length).toBeLessThanOrEqual(columns)
    }
  })
  test('completed agent descriptions keep room after the type', () => {
    const text = textOf(deckLines({ modelId: 'claude-opus-4-6', where: cloud, agents: [{ id: 'a', type: 'Explore', name: null, status: 'completed', description: 'mapping authentication' }], mcp: [], columns: 35 }))
    expect(text).toContain('✓ Explore mapping authentication')
  })
})

test('private IPv6 endpoints are local', () => {
  for (const baseUrl of ['http://[fd12::123]:1234', 'http://[fe80::123]:1234']) expect(whereModelRuns({ baseUrl }).kind).toBe('local')
})
test('long agent names reserve room for useful descriptions', () => {
  const text = textOf(deckLines({ modelId: 'claude-opus-4-6', where: cloud, mcp: [], columns: 35,
    agents: [{ id: 'a', name: 'this-name-is-far-too-long-to-fit', type: 'Explore', status: 'running', description: 'mapping authentication' }] }))
  expect(text).toContain('mapping')
})
