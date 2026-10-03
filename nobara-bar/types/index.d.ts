export type BarMode = 'auto' | 'mobile' | 'desktop'

export type SegmentKind = 'used' | 'free' | 'buffer'

export type Segment = {
  name: string
  tokens: number
  color: string
  kind: SegmentKind
}

export type Snapshot = {
  segments: Segment[]
  usedTokens: number
  maxTokens: number
  percent: number
}

export type OsInfo = {
  id: string
  isNobara: boolean
  label: string
  flavor: string | null
  isCompact: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'nobara-bar': {
      isOn: boolean
      mode: BarMode
      snapshot: Snapshot | null
      os: OsInfo | null
    }
  }
}
