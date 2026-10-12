/** Configured enablement only; this is not connection health. */
export type McpSwitch = { name: string; enabled: boolean }

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

/** Select the closest project; do not inherit sibling or parent project maps. */
function projectForCwd(projects: unknown, cwd: string): Record<string, unknown> | null {
  let best = ''
  let selected: Record<string, unknown> | null = null
  for (const [path, project] of Object.entries(record(projects) ?? {})) {
    if (!path || !(cwd === path || cwd.startsWith(path.endsWith('/') ? path : `${path}/`)) || path.length < best.length) continue
    best = path
    selected = record(project)
  }
  return selected
}

export function disabledForCwd(projects: unknown, cwd: string): string[] {
  const list = projectForCwd(projects, cwd)?.disabledMcpServers
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === 'string') : []
}

/** Retain names/enablement only; discard commands, arguments, env and tokens. */
export function mcpSwitchesFromConfig(text: string, cwd: string): McpSwitch[] {
  let data: Record<string, unknown> | null
  try { data = record(JSON.parse(text)) } catch { return [] }
  if (!data) return []
  const project = projectForCwd(data.projects, cwd)
  const disabled = new Set(disabledForCwd(data.projects, cwd))
  const names = new Set([...Object.keys(record(data.mcpServers) ?? {}), ...Object.keys(record(project?.mcpServers) ?? {})])
  return [...names].filter(Boolean).map(name => ({ name, enabled: !disabled.has(name) }))
    .sort((a, b) => Number(a.enabled) - Number(b.enabled) || a.name.localeCompare(b.name))
}
