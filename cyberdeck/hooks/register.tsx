import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import { deckLines, statusLine, type DeckAgent } from './lib/hud'
import { mcpSwitchesFromConfig } from './lib/mcp'
import { modelLabel, whereModelRuns, type Where } from './lib/model'

const PANE = 'cyberdeck'

const modelId = atom({ plugin: 'cyberdeck', key: 'modelId' } as const, '')
const where = atom(
  { plugin: 'cyberdeck', key: 'where' } as const,
  { kind: 'cloud', provider: 'Anthropic', host: null } as Where,
)
const agents = atom({ plugin: 'cyberdeck', key: 'agents' } as const, [] as DeckAgent[])
const mcp = atom({ plugin: 'cyberdeck', key: 'mcp' } as const, [] as { name: string; on: boolean }[])

function agentRow(info: AgentInfo): DeckAgent {
  return {
    id: info.id,
    status: info.status,
    type: info.type,
    description: info.description,
    name: info.name ?? null,
  }
}

async function refresh($: EngineInterface): Promise<void> {
  try {
    const id = await $.session.model()
    const nextWhere = whereModelRuns({
      baseUrl: (await $.env.get('ANTHROPIC_BASE_URL')) || undefined,
      bedrock: (await $.env.get('CLAUDE_CODE_USE_BEDROCK')) || undefined,
      vertex: (await $.env.get('CLAUDE_CODE_USE_VERTEX')) || undefined,
      foundry: (await $.env.get('CLAUDE_CODE_USE_FOUNDRY')) || undefined,
    })
    await update($, modelId, () => id)
    await update($, where, () => nextWhere)

    const home = (await $.env.get('HOME')) || ''
    if (home) {
      try {
        const text = await $.fs.read(`${home}/.claude.json`)
        const switches = mcpSwitchesFromConfig(typeof text === 'string' ? text : '', await $.session.cwd())
        await update($, mcp, () => switches)
      } catch {
        // Config unreadable: keep the last list. Never surface the file.
      }
    }

    try {
      const listed = await $.agent.list()
      await update($, agents, () => listed.map(agentRow))
    } catch {
      // Keep the last roster.
    }

    const mcpNow = await read($, mcp)
    const agentsNow = await read($, agents)
    const running = agentsNow.filter(agent => agent.status === 'running' || agent.status === 'pending').length
    $.ui.status(statusLine(id, nextWhere, mcpNow.filter(server => server.on).length, mcpNow.length, running))
  } catch {
    // A failed refresh leaves the last HUD in place.
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cyberdeck',
      description: 'Open or close the cyberdeck HUD pane',
    })
    const started = await next(e)
    await refresh($)
    await $.ui.open({ id: PANE, title: 'CYBERDECK' })
    $.clock.every(2000, () => {
      void refresh($)
    })
    return started
  })

  on('command.run', { command: 'cyberdeck' }, async $ => {
    const panes = await $.ui.panes()
    if (panes.some(pane => pane.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Cyberdeck pane closed. The status line stays.' }
    }
    const opened = await $.ui.open({ id: PANE, title: 'CYBERDECK' })
    if (opened.isPlaced) return { text: 'Cyberdeck pane open.' }
    return { text: `Cyberdeck pane is waiting (${opened.reason}). The status line stays.` }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const lines = deckLines({
      modelId: await read($, modelId),
      where: await read($, where),
      agents: await read($, agents),
      mcp: await read($, mcp),
      columns: e.props.bodyColumns,
    })

    return (
      <Box flexDirection="column">
        {lines.map(line => (
          <Box flexDirection="row">
            {line.map(run => (
              <Text color={run.color} dimColor={run.dim === true ? true : undefined} bold={run.bold === true ? true : undefined}>
                {run.text}
              </Text>
            ))}
          </Box>
        ))}
      </Box>
    )
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const id = await read($, modelId)
    if (!id) return next(e)
    const place = await read($, where)
    const tag = `${place.kind === 'local' ? 'LOCAL' : 'CLOUD'} ${modelLabel(id)}`
    return next({ ...e, props: { ...e.props, tail: ` · ${tag}` } })
  })
}
