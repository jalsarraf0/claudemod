/** Where the session's model runs, read from configuration only (never probed). */
export type Where = { kind: 'cloud' | 'local'; provider: string; host: string | null }

/** The environment variables that decide it, as the mod reads them. */
export type ModelEnv = {
  baseUrl?: string
  bedrock?: string
  vertex?: string
  foundry?: string
}

const isOn = (value: string | undefined): boolean => value !== undefined && value !== '' && value !== '0'

/** Loopback, private LAN, link-local, the tailnet's 100.64/10, or a .local/.lan/.internal name. */
export function isLocalHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h === '::1' || h.endsWith('.local') || h.endsWith('.lan') || h.endsWith('.internal')) return true
  if (!h.includes('.') && !h.includes(':')) return true // a bare host name on this network
  const ip = h.split('.').map(Number)
  if (ip.length !== 4 || ip.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false
  const [a, b] = ip
  return a === 127 || a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
    || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127)
}

export function whereModelRuns(env: ModelEnv): Where {
  if (isOn(env.bedrock)) return { kind: 'cloud', provider: 'Bedrock', host: null }
  if (isOn(env.vertex)) return { kind: 'cloud', provider: 'Vertex', host: null }
  if (isOn(env.foundry)) return { kind: 'cloud', provider: 'Foundry', host: null }
  if (env.baseUrl) {
    let host: string
    try {
      host = new URL(env.baseUrl).hostname
    } catch {
      return { kind: 'cloud', provider: 'custom', host: null }
    }
    if (isLocalHost(host)) return { kind: 'local', provider: 'local', host }
    if (host === 'api.anthropic.com') return { kind: 'cloud', provider: 'Anthropic', host }
    return { kind: 'cloud', provider: 'gateway', host }
  }
  return { kind: 'cloud', provider: 'Anthropic', host: null }
}

/** "claude-opus-5-5" -> "Opus 5.5"; "claude-haiku-5-5[1m]" -> "Haiku 5.5"; others as given. */
export function modelLabel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(id)
  if (!m) return id
  const family = m[1][0].toUpperCase() + m[1].slice(1)
  return m[3] ? `${family} ${m[2]}.${m[3]}` : `${family} ${m[2]}`
}
