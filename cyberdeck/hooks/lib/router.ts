export type Provider = 'codex' | 'grok'
export type TaskKind = 'code' | 'research' | 'general'
export type RouteInput = { provider: Provider | 'auto'; task: string; context: string; kind?: TaskKind }
export type RouteDecision = { provider: Provider | null; kind: TaskKind; reason: string }

export function routeInput(value: unknown): RouteInput | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  const provider = data.provider ?? 'auto', context = data.context ?? ''
  if (!['auto', 'codex', 'grok'].includes(provider as string) || typeof data.task !== 'string' || !data.task.trim()
    || data.task.length > 24000 || typeof context !== 'string' || context.length > 48000
    || (data.kind !== undefined && !['code', 'research', 'general'].includes(data.kind as string))) return null
  return { provider: provider as RouteInput['provider'], task: data.task.trim(), context,
    ...(data.kind ? { kind: data.kind as TaskKind } : {}) }
}
export function routeCommand(args: string): RouteInput | null {
  const match = /^route\s+(auto|codex|grok)\s+([\s\S]+)$/i.exec(args.trim())
  return match ? routeInput({ provider: match[1]!.toLowerCase(), task: match[2] }) : null
}
export function chooseRoute(input: RouteInput, available: Record<Provider, boolean>): RouteDecision {
  const kind = input.kind ?? (/\b(fix|debug|implement|refactor|test|tests|patch|review code|build|compile)\b/i.test(input.task) ? 'code'
    : /\b(research|search|latest|sources|release notes|compare|documentation)\b/i.test(input.task) ? 'research' : 'general')
  if (input.provider !== 'auto') return available[input.provider]
    ? { provider: input.provider, kind, reason: 'explicit provider' }
    : { provider: null, kind, reason: `${input.provider} is unavailable; configure its credentials or install its CLI.` }
  const preferred = kind === 'research' ? 'grok' : 'codex'
  const fallback = preferred === 'codex' ? 'grok' : 'codex'
  return available[preferred] ? { provider: preferred, kind, reason: `${kind} task preference` }
    : available[fallback] ? { provider: fallback, kind, reason: `${preferred} unavailable; selected configured ${fallback}` }
    : { provider: null, kind, reason: 'No router provider is available. Install/authenticate Codex or set XAI_API_KEY.' }
}
