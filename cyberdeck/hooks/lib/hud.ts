import { modelLabel, type Where } from './model'
import { cellWidth, clip, plain } from './display'
import type { GitState } from './git'
import type { McpSwitch } from './mcp'

export type DeckAgent = { id: string; status: string; type: string; description: string; name: string | null }
export type ContextState = { usedTokens: number; maxTokens: number; percent: number }
export type Run = { text: string; color?: string; dim?: boolean; bold?: boolean }
export type Line = Run[]
export type Layout = 'auto' | 'full' | 'compact' | 'mobile'
export type DeckInput = {
  modelId: string; where: Where; agents: readonly DeckAgent[]; mcp: readonly McpSwitch[]
  router?: { codex: boolean; grok: boolean }; columns: number; context?: ContextState | null; git?: GitState | null; mcpKnown?: boolean
}
const CYAN = '#0abdc6', MAGENTA = '#ea00d9', AMBER = '#FCEE0A', HOT = '#FF003C'

export function layoutFor(columns: number, mode: Layout = 'auto'): Exclude<Layout, 'auto'> {
  return mode === 'auto' ? columns >= 120 ? 'full' : columns >= 70 ? 'compact' : 'mobile' : mode
}
const tokens = (n: number) => n >= 1000000 ? `${+(n / 1000000).toFixed(1)}m` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : `${n}`
const pct = (context?: ContextState | null) => context ? `${Math.round(context.percent)}%` : '?'

/** Reserve operational counts before allocating cells to variable-length labels. */
export function statusLine(modelId: string, where: Where, enabled: number, total: number, running: number,
  options: { columns?: number; context?: ContextState | null; git?: GitState | null; mode?: Layout; mcpKnown?: boolean } = {}): string {
  const columns = Math.max(0, Math.floor(options.columns ?? 120))
  const layout = layoutFor(columns, options.mode)
  const place = where.kind === 'local' ? 'LOCAL' : 'CLOUD'
  const mcp = options.mcpKnown === false ? '?' : `${enabled}/${total}`
  const counts = layout === 'mobile' ? ` ${pct(options.context)} M${mcp} A${running}` : ` · CTX ${pct(options.context)} · MCP ${mcp} enabled · AG ${running}`
  const git = options.git && layout !== 'mobile' ? ` · ${plain(options.git.branch)} ${options.git.dirty ? 'dirty' : 'clean'}` : ''
  const suffix = counts + git
  const label = layout === 'full' ? `◈ ${modelLabel(modelId) || '?'} ${place} · ${where.provider}` : `${modelLabel(modelId) || '?'} ${place}`
  // On unusually narrow displays the counts themselves are clipped.
  if (cellWidth(suffix) >= columns) return clip(counts.trim(), columns)
  return `${clip(label, columns - cellWidth(suffix))}${clip(suffix, columns)}`
}

/** All rows are bounded by the pane's body width, independently of layout. */
export function deckLines(input: DeckInput): Line[] {
  const cols = Math.max(0, Math.floor(input.columns))
  const lines: Line[] = []
  const row = (text: string, style: Omit<Run, 'text'> = {}) => lines.push([{ text: clip(text, cols), ...style }])
  row('CYBERDECK', { color: CYAN, bold: true })
  row(`${modelLabel(input.modelId) || '?'} ${input.where.kind.toUpperCase()}`, { color: input.where.kind === 'local' ? CYAN : MAGENTA })
  row(input.where.provider, { dim: true })
  if (input.where.host) row(input.where.host, { dim: true })
  if (input.where.region) row(input.where.region, { dim: true })
  if (input.router) row(`ROUTER Codex ${input.router.codex ? 'installed' : 'missing'} · Grok ${input.router.grok ? 'key set' : 'no key'}`, { dim: true })
  row('CONTEXT', { color: MAGENTA, bold: true })
  if (input.context) {
    const context = input.context
    const percent = Math.max(0, Math.min(100, context.percent))
    const cells = Math.max(0, Math.min(20, cols - 7))
    const used = Math.round(cells * percent / 100)
    row(`${'█'.repeat(used)}${'·'.repeat(cells - used)} ${Math.round(percent)}%`, { color: percent >= 85 ? HOT : percent >= 70 ? AMBER : CYAN })
    row(`${tokens(context.usedTokens)} / ${tokens(context.maxTokens)}`, { dim: true })
  } else row('unavailable', { dim: true })
  row('AGENTS', { color: MAGENTA, bold: true })
  if (!input.agents.length) row('none', { dim: true })
  const agents = [...input.agents].sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id))
  for (const agent of agents) {
    const hot = agent.status === 'failed' || agent.status === 'killed'
    const active = priority(agent) === 0
    const mark = hot ? '✕' : active ? '▶' : agent.status === 'completed' ? '✓' : '·'
    const state = agent.status === 'completed' || agent.status === 'running' ? '' : ` (${agent.status})`
    row(`${mark} ${clip(agent.name || agent.type, Math.max(1, Math.floor(cols / 3)))}${state} ${agent.description}`, { color: hot ? HOT : active ? AMBER : undefined, dim: !hot && !active })
  }
  const enabled = input.mcp.filter(server => server.enabled).length
  row(input.mcpKnown === false ? 'MCP unavailable' : `MCP ${enabled}/${input.mcp.length} enabled`, { color: MAGENTA, bold: true })
  for (const server of [...input.mcp].sort((a, b) => Number(a.enabled) - Number(b.enabled) || a.name.localeCompare(b.name))) {
    row(`${server.enabled ? '●' : '○'} ${server.name} ${server.enabled ? 'enabled' : 'disabled'}`, { color: server.enabled ? CYAN : undefined, dim: !server.enabled })
  }
  row('GIT', { color: MAGENTA, bold: true })
  if (input.git) {
    row(`${input.git.branch} ${input.git.dirty ? 'dirty' : 'clean'}`)
    row(input.git.ahead === null ? 'no upstream' : `↑${input.git.ahead} ↓${input.git.behind}`, { dim: true })
    if (input.git.worktree) row(`worktree ${input.git.root.split('/').filter(Boolean).at(-1)}`, { dim: true })
  } else row('unavailable', { dim: true })
  return lines
}
function priority(agent: DeckAgent): number {
  return ['pending', 'running', 'waiting', 'idle'].includes(agent.status) ? 0 : agent.status === 'failed' || agent.status === 'killed' ? 1 : 2
}
