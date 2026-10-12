import { describe, expect, test } from 'claude-code/testing'
import { grokRequest, parseGrokOutput } from '../hooks/lib/grok'

const message = (text: string, status = 'completed') => ({
  type: 'message', role: 'assistant', status,
  content: [{ type: 'output_text', text }],
})
const response = (output: unknown[], status = 'completed') => JSON.stringify({ status, output })

describe('Grok Responses request', () => {
  test('uses the fixed endpoint, disables storage, and sends only explicit input', () => {
    const request = grokRequest('Review "this"\nchange', 'Supplied context', 'grok-4.7')
    const body = JSON.parse(request.body)
    expect(request.url).toBe('https://api.x.ai/v1/responses')
    expect(body.model).toBe('grok-4.7')
    expect(body.store).toBe(false)
    expect(body.input.length).toBe(2)
    expect(body.input[0].role).toBe('system')
    expect(body.input[1]).toEqual({ role: 'user', content: 'Task:\nReview "this"\nchange\n\nExplicit context:\nSupplied context' })
    expect(Object.keys(body).sort()).toEqual(['input', 'model', 'store'])
  })
  test('research opts into only the documented server-side web search tool', () => {
    const body = JSON.parse(grokRequest('Research this', '', 'grok-4.7', true).body)
    expect(body.tools).toEqual([{ type: 'web_search' }])
    expect(JSON.parse(grokRequest('Answer this', '', 'custom-model', false).body).tools).toBe(undefined)
  })
})

describe('Grok Responses output', () => {
  test('extracts completed assistant text and ignores reasoning, encrypted traces, and tool output', () => {
    const result = parseGrokOutput(response([
      { type: 'reasoning', encrypted_content: 'secret', content: [{ type: 'output_text', text: 'private reasoning' }] },
      { type: 'web_search_call', status: 'completed', content: [{ type: 'output_text', text: 'tool internals' }] },
      { ...message(' First answer '), content: [{ type: 'output_text', text: ' First answer ' }, { type: 'refusal', refusal: 'ignored' }] },
      message('Second answer'),
    ]))
    expect(result).toEqual({ ok: true, text: 'First answer\n\nSecond answer' })
  })
  test('returns a generic error for failed, incomplete, pending, or missing completion status', () => {
    for (const status of ['failed', 'incomplete', 'in_progress', 'queued', '']) {
      expect(parseGrokOutput(response([message('partial secret')], status))).toEqual({ ok: false, text: 'Grok did not return a completed text response.' })
    }
    expect(parseGrokOutput(JSON.stringify({ output: [message('partial secret')] })).ok).toBe(false)
    expect(parseGrokOutput(response([message('partial secret', 'incomplete')])).ok).toBe(false)
  })
  test('rejects malformed or empty text responses without echoing raw error details', () => {
    for (const raw of ['{secret', 'null', '[]', '42', '{}', response([]), response([message('  ')]),
      response([{ ...message('secret'), role: 'user' }]), response([{ ...message('secret'), content: [{ type: 'output_text', text: 42 }] }]),
      JSON.stringify({ error: { message: 'private api key' } })]) {
      const result = parseGrokOutput(raw)
      expect(result.ok).toBe(false)
      expect(result.text).toBe('Grok did not return a completed text response.')
    }
  })
  test('bounds returned text to 24000 characters with an explicit truncation marker', () => {
    const result = parseGrokOutput(response([message('a'.repeat(25000))]))
    expect(result.ok).toBe(true)
    expect(result.text.length).toBe(24000)
    expect(result.text.endsWith('\n\n[Grok output truncated]')).toBe(true)
    expect(parseGrokOutput(response([message('a'.repeat(24000))])).text).toBe('a'.repeat(24000))
  })
})
