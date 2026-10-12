import { expect, test } from 'claude-code/testing'
import { chooseRoute, routeInput, routeCommand } from '../hooks/lib/router'

test('automatic routing sends code tasks to Codex and research to Grok', () => {
  expect(chooseRoute({ provider: 'auto', task: 'fix the failing unit tests', context: '' }, { codex: true, grok: true }).provider).toBe('codex')
  expect(chooseRoute({ provider: 'auto', task: 'research latest Linux release notes', context: '' }, { codex: true, grok: true }).provider).toBe('grok')
})
test('explicit provider and task kind override heuristics', () => {
  expect(chooseRoute({ provider: 'grok', task: 'fix tests', context: '' }, { codex: true, grok: true }).provider).toBe('grok')
  expect(chooseRoute({ provider: 'auto', kind: 'research', task: 'Python function', context: '' }, { codex: true, grok: true }).provider).toBe('grok')
})
test('automatic mode selects an available provider before dispatch', () => {
  expect(chooseRoute({ provider: 'auto', task: 'research linux', context: '' }, { codex: true, grok: false }).provider).toBe('codex')
  expect(chooseRoute({ provider: 'codex', task: 'fix tests', context: '' }, { codex: false, grok: true }).provider).toBe(null)
  expect(chooseRoute({ provider: 'auto', task: 'fix tests', context: '' }, { codex: false, grok: false }).provider).toBe(null)
})
test('routing rejects malformed and oversized tasks', () => {
  for (const value of [null, {}, { task: '' }, { task: 'x', provider: 'shell' }, { task: 'x'.repeat(24001) }]) expect(routeInput(value)).toBe(null)
  expect(routeInput({ task: 'fix tests', context: 'given file', provider: 'codex' })).toEqual({ task: 'fix tests', context: 'given file', provider: 'codex' })
})
test('slash routing preserves task punctuation without interpreting a shell', () => {
  expect(routeCommand('route codex inspect $(touch /tmp/x)')).toEqual({ provider: 'codex', task: 'inspect $(touch /tmp/x)', context: '' })
  expect(routeCommand('route auto')).toBe(null)
})
