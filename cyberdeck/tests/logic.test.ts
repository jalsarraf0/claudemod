import { describe, expect, test } from 'claude-code/testing'

import { deckLines, statusLine } from '../hooks/lib/hud'
import { disabledForCwd, mcpSwitchesFromConfig } from '../hooks/lib/mcp'
import { isLocalHost, modelLabel, whereModelRuns } from '../hooks/lib/model'

describe('whereModelRuns', () => {
  test('default is Anthropic cloud', () => {
    expect(whereModelRuns({})).toEqual({ kind: 'cloud', provider: 'Anthropic', host: null })
  })
  test('a loopback base URL is local', () => {
    expect(whereModelRuns({ baseUrl: 'http://127.0.0.1:1234/v1' })).toEqual({
      kind: 'local',
      provider: 'local endpoint',
      host: '127.0.0.1:1234',
    })
  })
  test('Bedrock stays cloud even with a base URL', () => {
    expect(whereModelRuns({ bedrock: '1', baseUrl: 'http://127.0.0.1:9' }).provider).toBe('Bedrock')
  })
})

describe('modelLabel', () => {
  test('family and version', () => {
    expect(modelLabel('claude-opus-4-6')).toBe('Opus 4.6')
    expect(modelLabel('claude-haiku-4-5')).toBe('Haiku 4.5')
  })
})

describe('isLocalHost', () => {
  test('tailnet and lan', () => {
    expect(isLocalHost('100.111.198.19')).toBe(true)
    expect(isLocalHost('api.anthropic.com')).toBe(false)
  })
})

describe('mcp switches', () => {
  const text = JSON.stringify({
    mcpServers: { github: { command: 'secret' }, playwright: { command: 'secret' } },
    projects: {
      '/home/me': { disabledMcpServers: ['playwright'] },
      '/home/me/app': { disabledMcpServers: ['github'] },
    },
  })

  test('closest project path wins, and commands are dropped', () => {
    expect(mcpSwitchesFromConfig(text, '/home/me/app')).toEqual([
      { name: 'github', enabled: false },
      { name: 'playwright', enabled: true },
    ])
  })
  test('a parent project applies under it', () => {
    expect(disabledForCwd(JSON.parse(text).projects, '/home/me/other')).toEqual(['playwright'])
  })
  test('bad JSON is an empty list', () => {
    expect(mcpSwitchesFromConfig('{', '/home/me')).toEqual([])
  })
})

describe('hud', () => {
  test('status line names cloud or local in words', () => {
    expect(statusLine('claude-opus-4-6', { kind: 'cloud', provider: 'Anthropic', host: null }, 1, 2, 1)).toBe(
      '◈ Opus 4.6 CLOUD · Anthropic · CTX ? · MCP 1/2 enabled · AG 1',
    )
  })
  test('pane lists agents and puts off servers first', () => {
    const lines = deckLines({
      modelId: 'claude-haiku-4-5',
      where: { kind: 'local', provider: 'local', host: '127.0.0.1' },
      agents: [{ id: 'a', status: 'running', type: 'Explore', description: 'map the hud', name: null }],
      mcp: [
        { name: 'github', enabled: false },
        { name: 'playwright', enabled: true },
      ],
      columns: 40,
    })
    const text = lines.map(line => line.map(run => run.text).join('')).join('\n')
    expect(text).toContain('LOCAL')
    expect(text).toContain('▶ Explore map the hud')
    expect(text.indexOf('github disabled')).toBeLessThan(text.indexOf('playwright enabled'))
  })
})
