import { expect, test } from 'claude-code/testing'
import { cellWidth, clip, plain } from '../hooks/lib/display'

test('emoji presentation and keycaps reserve two terminal cells', () => {
  for (const emoji of ['❤️', '☺️', '☀️', '1️⃣', '#️⃣']) {
    expect(cellWidth(emoji)).toBe(2)
    expect(clip(emoji.repeat(40), 40)).toBe(emoji.repeat(19) + '…')
  }
  expect(cellWidth('123')).toBe(3)
})

test('OSC titles and hyperlinks leave only the visible label', () => {
  expect(plain('\x1b]0;hidden-title\x07shown')).toBe('shown')
  expect(plain('\x1b]8;;https://example.com\x1b\\label\x1b]8;;\x1b\\')).toBe('label')
})
