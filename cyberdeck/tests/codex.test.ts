import { describe, expect, test } from 'claude-code/testing'
import { codexRequest, parseCodexOutput } from '../hooks/lib/codex'

const line = (value: unknown) => JSON.stringify(value)
const message = (text: unknown) => ({ type: 'item.completed', item: { type: 'agent_message', text } })
const completed = { type: 'turn.completed', usage: { input_tokens: 1, output_tokens: 1 } }

describe('Codex request', () => {
  test('uses JSON exec in a read-only sandbox and keeps task text on stdin', () => {
    const task = 'Review this code\n$(touch should-not-run) --full-auto'
    expect(codexRequest(task)).toEqual({
      argv: ['codex', 'exec', '--json', '--sandbox', 'read-only', '-'],
      stdin: task,
      timeoutMs: 120000,
    })
  })

  test('selects an optional model as a separate argument', () => {
    expect(codexRequest('Review', 'configured-codex-model').argv).toEqual([
      'codex', 'exec', '--json', '--sandbox', 'read-only', '--model', 'configured-codex-model', '-',
    ])
  })
})

describe('Codex JSONL output', () => {
  test('collects only completed agent messages from a completed turn', () => {
    const stdout = [
      line({ type: 'thread.started', thread_id: 'thread' }),
      line({ type: 'item.started', item: { type: 'agent_message', text: 'unfinished' } }),
      line({ type: 'item.completed', item: { type: 'reasoning', text: 'private reasoning' } }),
      line({ type: 'item.completed', item: { type: 'command_execution', aggregated_output: 'secret command output' } }),
      line(message('First finding.')),
      line(message('Second finding.')),
      line(completed),
      '',
    ].join('\r\n')
    expect(parseCodexOutput(stdout)).toEqual({ ok: true, text: 'First finding.\n\nSecond finding.' })
  })

  test('requires both a completed turn and nonempty agent message text', () => {
    for (const stdout of [
      '', line(message('partial answer')), line(completed),
      [line(message('  ')), line(completed)].join('\n'),
      [line(message(123)), line(completed)].join('\n'),
    ]) {
      expect(parseCodexOutput(stdout)).toEqual({ ok: false, text: 'Codex did not return a completed response.' })
    }
  })

  test('failed turns and error records discard partial answers and raw errors', () => {
    for (const failure of [
      { type: 'turn.failed', error: { message: 'private token sk-secret' } },
      { type: 'error', message: 'private token sk-secret' },
    ]) {
      const result = parseCodexOutput([line(message('partial answer')), line(completed), line(failure)].join('\n'))
      expect(result).toEqual({ ok: false, text: 'Codex did not return a completed response.' })
    }
  })

  test('malformed JSONL fails safely without echoing diagnostics', () => {
    expect(parseCodexOutput([line(message('answer')), 'raw private diagnostic', line(completed)].join('\n'))).toEqual({
      ok: false, text: 'Codex did not return a completed response.',
    })
  })

  test('ignores unrelated JSON values and records with absent items', () => {
    expect(parseCodexOutput([
      'null', '[]', '42', line({ type: 'item.completed' }),
      line(message('Useful answer')), line(completed),
    ].join('\n'))).toEqual({ ok: true, text: 'Useful answer' })
  })

  test('bounds combined output with an explicit truncation marker', () => {
    const result = parseCodexOutput([
      line(message('a'.repeat(15000))), line(message('b'.repeat(15000))), line(completed),
    ].join('\n'))
    expect(result.ok).toBe(true)
    expect(result.text.length).toBeLessThanOrEqual(24000)
    expect(result.text).toContain('[Codex output truncated]')
  })

  test('still detects failure records after reaching the output limit', () => {
    expect(parseCodexOutput([
      line(message('a'.repeat(30000))), line(completed), line({ type: 'turn.failed' }),
    ].join('\n'))).toEqual({ ok: false, text: 'Codex did not return a completed response.' })
  })
})
