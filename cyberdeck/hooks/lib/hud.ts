import { modelLabel, type Where } from './model'

export type DeckAgent = {
  id: string
  status: string
  type: string
  description: string
  name: string | null
}

export type Run = { text: string; color?: string; dim?: boolean; bold?: boolean }
export type Line = Run[]

const CYAN = '#0abdc6'
const MAGENTA = '#ea00d9'
const AMBER = '#FCEE0A'
const HOT = '#FF003C'

/** One status-line row. Words carry cloud/local; color is not the only signal. */
export function statusLine(
  modelId: string,
  where: Where,
  mcpOn: number,
  mcpTotal: number,
  agentsRunning: number,
): string {
  const place = where.kind === 'local' ? 'LOCAL' : 'CLOUD'
  const host = where.kind === 'local' && where.host ? ` ${where.host}` : ''
  return `◈ ${modelLabel(modelId)} ${place}${host} · MCP ${mcpOn}/${mcpTotal} · agents ${agentsRunning}`
}

/** Pane rows. `columns` is the pane body width. Off servers are listed first. */
export function deckLines(input: {
  modelId: string
  where: Where
  agents: readonly DeckAgent[]
  mcp: readonly { name: string; on: boolean }[]
  columns: number
}): Line[] {
  const cols = Math.max(1, input.columns)
  const place = input.where.kind === 'local' ? 'LOCAL' : 'CLOUD'
  const whereColor = input.where.kind === 'local' ? CYAN : MAGENTA
  const lines: Line[] = [
    [{ text: clip('CYBERDECK', cols), color: CYAN, bold: true }],
    [
      { text: clip(modelLabel(input.modelId), Math.max(1, cols - place.length - 1)) },
      { text: ' ' },
      { text: place, color: whereColor, bold: true },
    ],
  ]
  if (input.where.host && cols >= 20) lines.push([{ text: clip(input.where.host, cols), dim: true }])

  lines.push([{ text: 'AGENTS', color: MAGENTA, bold: true }])
  if (input.agents.length === 0) lines.push([{ text: 'none', dim: true }])
  else for (const agent of input.agents) lines.push(agentLine(agent, cols))

  const on = input.mcp.filter(server => server.on).length
  lines.push([{ text: clip(`MCP ${on}/${input.mcp.length}`, cols), color: MAGENTA, bold: true }])
  for (const server of input.mcp) {
    const mark = server.on ? '●' : '○'
    lines.push([
      { text: `${mark} `, color: server.on ? CYAN : undefined, dim: !server.on },
      { text: clip(`${server.name} ${server.on ? 'on' : 'off'}`, Math.max(1, cols - 2)), color: server.on ? CYAN : undefined, dim: !server.on },
    ])
  }
  return lines
}

function agentLine(agent: DeckAgent, cols: number): Line {
  const hot = agent.status === 'failed' || agent.status === 'killed'
  const running = agent.status === 'running' || agent.status === 'pending'
  const mark = hot ? '✕' : running ? '▶' : '·'
  const who = agent.name ?? agent.type
  const text = `${mark} ${agent.status} ${who} ${agent.description}`.replace(/\s+/g, ' ').trim()
  return [{ text: clip(text, cols), color: hot ? HOT : running ? AMBER : undefined, dim: !hot && !running }]
}

function clip(text: string, columns: number): string {
  if (columns < 1) return ''
  if (text.length <= columns) return text
  if (columns === 1) return '…'
  return `${text.slice(0, columns - 1)}…`
}
