export type Segment = { name: string; tokens: number; color: string; kind: 'used' | 'free' | 'buffer' | 'deferred' }
export type Snapshot = { segments: Segment[]; max: number; total: number; percent: number; model: string }
export type Theme = { name: string; accent: string; deep: string; soft: string }

declare module 'claude-code' {
  interface PluginState {
    'context-bar': { snapshot: Snapshot | null; isOn: boolean; theme: Theme }
  }
}
