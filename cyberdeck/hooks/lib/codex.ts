const MAX_OUTPUT_CHARS = 24000
const TRUNCATION_MARKER = '\n\n[Codex output truncated]'
const FAILURE_TEXT = 'Codex did not return a completed response.'

/** Build argv directly for engine.exec; task text is never interpreted by a shell. */
export function codexRequest(task: string, model?: string): { argv: string[]; stdin: string; timeoutMs: number } {
  return {
    argv: ['codex', 'exec', '--json', '--sandbox', 'read-only', ...(model ? ['--model', model] : []), '-'],
    stdin: task,
    timeoutMs: 120000,
  }
}

/** Return only completed agent messages, never reasoning, commands, or raw errors. */
export function parseCodexOutput(stdout: string): { ok: boolean; text: string } {
  let completed = false
  let text = ''
  let truncated = false
  const failure = { ok: false, text: FAILURE_TEXT }

  for (const row of stdout.split('\n')) {
    if (!row.trim()) continue
    let event: unknown
    try {
      event = JSON.parse(row)
    } catch {
      return failure
    }
    if (!event || typeof event !== 'object' || Array.isArray(event)) continue
    const record = event as Record<string, unknown>
    if (record.type === 'turn.failed' || record.type === 'error') return failure
    if (record.type === 'turn.completed') completed = true
    if (record.type !== 'item.completed' || !record.item || typeof record.item !== 'object') continue
    const item = record.item as Record<string, unknown>
    if (item.type !== 'agent_message' || typeof item.text !== 'string' || !item.text.trim()) continue

    // Keep scanning terminal events after the cap, without retaining further output.
    const separator = text ? '\n\n' : ''
    const available = MAX_OUTPUT_CHARS - text.length
    if (separator.length + item.text.length > available) truncated = true
    text += separator.slice(0, available)
    text += item.text.slice(0, Math.max(0, MAX_OUTPUT_CHARS - text.length))
  }

  if (!completed || !text.trim()) return failure
  if (truncated) text = text.slice(0, MAX_OUTPUT_CHARS - TRUNCATION_MARKER.length) + TRUNCATION_MARKER
  return { ok: true, text }
}
