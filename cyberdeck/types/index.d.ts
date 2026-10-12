declare module 'claude-code' {
  interface PluginState {
    cyberdeck: {
      routerReady: { codex: boolean; grok: boolean }
      routedAgents: { id: string; status: string; type: string; description: string; name: string | null }[]
      compatibility: string | null
      modelId: string
      where: { kind: 'cloud' | 'local'; provider: string; host: string | null; region?: string }
      agents: { id: string; status: string; type: string; description: string; name: string | null }[]
      mcp: { name: string; enabled: boolean }[]
      mcpKnown: boolean
      context: { usedTokens: number; maxTokens: number; percent: number } | null
      git: { branch: string; dirty: boolean; ahead: number | null; behind: number | null; worktree: boolean; root: string } | null
      mode: 'auto' | 'full' | 'compact' | 'mobile'
    }
  }
}
