declare module 'claude-code' {
  interface PluginState {
    cyberdeck: {
      modelId: string
      where: { kind: 'cloud' | 'local'; provider: string; host: string | null }
      agents: { id: string; status: string; type: string; description: string; name: string | null }[]
      mcp: { name: string; on: boolean }[]
    }
  }
}
