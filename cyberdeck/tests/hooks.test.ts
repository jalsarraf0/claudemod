import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const CONFIG = JSON.stringify({
  mcpServers: { github: { command: 'secret' }, playwright: { command: 'secret' } },
  projects: { '/home/me': { disabledMcpServers: ['playwright'] } },
})

test('session start pins the status line and opens the pane', async ($, on: On) => {
  const statuses: (string | undefined)[] = []
  const opened: string[] = []
  on('session.start', async (_$, event) => ({ cwd: event.cwd }))
  on('command.register', async () => ({ value: undefined }))
  on('session.model', async () => ({ value: 'claude-opus-4-6' }))
  on('session.cwd', async () => ({ value: '/home/me/app' }))
  on('env.get', async (_$, event) => {
    if (event.name === 'HOME') return { value: '/home/me' }
    return { value: undefined }
  })
  on('fs.read', async () => ({ value: CONFIG }))
  on('agent.list', async () => ({
    value: [{ id: 'a1', description: 'map the hud', type: 'Explore', status: 'running' as const }],
  }))
  on('ui.status', async (_$, event) => {
    statuses.push(event.text)
    return { value: undefined }
  })
  on('ui.open', async (_$, event) => {
    opened.push(event.id)
    return { value: { isPlaced: true as const } }
  })
  on('clock.every', async () => ({ value: undefined }))

  await $.session.start({ cwd: '/home/me/app', surface: 'terminal', isInteractive: true })

  expect(opened).toEqual(['cyberdeck'])
  expect(statuses.at(-1)).toBe('◈ Opus 4.6 CLOUD · MCP 1/2 · agents 1')
})
