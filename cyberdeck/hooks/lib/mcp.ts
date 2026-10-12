/** One configured MCP server and whether this directory has it switched on. */
export type McpSwitch = { name: string; on: boolean }

/**
 * Names from the user `mcpServers` map, marked off when the closest project
 * entry for `cwd` lists them in `disabledMcpServers`. The rest of the file
 * (commands, env, tokens) is dropped.
 */
export function mcpSwitchesFromConfig(text: string, cwd: string): McpSwitch[] {
  let data: { mcpServers?: unknown; projects?: unknown }
  try {
    data = JSON.parse(text) as { mcpServers?: unknown; projects?: unknown }
  } catch {
    return []
  }
  const disabled = new Set(disabledForCwd(data.projects, cwd))
  return serverNames(data.mcpServers)
    .map(name => ({ name, on: !disabled.has(name) }))
    .sort((a, b) => Number(a.on) - Number(b.on) || a.name.localeCompare(b.name))
}

function serverNames(value: unknown): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.keys(value as Record<string, unknown>).filter(name => name.length > 0)
}

/** Disabled names from the longest project path that contains `cwd`. */
export function disabledForCwd(projects: unknown, cwd: string): string[] {
  if (projects === null || typeof projects !== 'object' || Array.isArray(projects)) return []
  let best = ''
  let names: string[] = []
  for (const [path, proj] of Object.entries(projects as Record<string, unknown>)) {
    if (!pathContains(cwd, path) || path.length < best.length) continue
    best = path
    names = stringList(proj, 'disabledMcpServers')
  }
  return names
}

function pathContains(cwd: string, path: string): boolean {
  if (path === '') return false
  if (cwd === path) return true
  const prefix = path.endsWith('/') ? path : `${path}/`
  return cwd.startsWith(prefix)
}

function stringList(value: unknown, key: string): string[] {
  if (value === null || typeof value !== 'object') return []
  const list = (value as Record<string, unknown>)[key]
  if (!Array.isArray(list)) return []
  return list.filter((item): item is string => typeof item === 'string')
}
