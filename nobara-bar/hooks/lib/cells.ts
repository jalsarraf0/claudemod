// Largest-remainder allocation of `width` cells across weighted segments.
// Cells always sum to `width`; a segment marked `isRequired` with weight
// above zero gets at least one cell whenever the width allows it.

export type Weighted = { weight: number; isRequired: boolean }

export function allocateCells(items: readonly Weighted[], width: number): number[] {
  const cells = items.map(() => 0)
  if (width <= 0 || items.length === 0) return cells

  const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0)
  if (total <= 0) {
    cells[cells.length - 1] = width
    return cells
  }

  const quotas = items.map(item => (Math.max(0, item.weight) * width) / total)
  const floors = quotas.map(Math.floor)
  const minimum = items.map(item => (item.isRequired && item.weight > 0 ? 1 : 0))
  floors.forEach((n, i) => (cells[i] = Math.max(n, minimum[i] ?? 0)))

  let diff = width - cells.reduce((sum, n) => sum + n, 0)

  // Hand out the leftover cells by largest fractional remainder.
  if (diff > 0) {
    const order = quotas
      .map((q, i) => ({ i, remainder: q - (floors[i] ?? 0), bumped: (cells[i] ?? 0) > (floors[i] ?? 0) }))
      .filter(entry => !entry.bumped && (items[entry.i]?.weight ?? 0) > 0)
      .sort((a, b) => b.remainder - a.remainder || a.i - b.i)
    for (let k = 0; diff > 0 && order.length > 0; k = (k + 1) % order.length) {
      const entry = order[k]
      if (entry === undefined) break
      cells[entry.i] = (cells[entry.i] ?? 0) + 1
      diff -= 1
    }
  }

  // Minimums can overshoot: take cells back where it costs the least.
  while (diff < 0) {
    let pick = -1
    let best = -Infinity
    cells.forEach((n, i) => {
      if (n <= (minimum[i] ?? 0)) return
      const excess = n - (quotas[i] ?? 0)
      if (excess > best || (excess === best && n > (cells[pick] ?? 0))) {
        best = excess
        pick = i
      }
    })
    if (pick < 0) break
    cells[pick] = (cells[pick] ?? 0) - 1
    diff += 1
  }

  // Too narrow for every minimum: keep the heaviest required segments.
  if (diff < 0) {
    const ranked = items
      .map((item, i) => ({ i, weight: item.weight }))
      .filter(entry => (cells[entry.i] ?? 0) > 0)
      .sort((a, b) => a.weight - b.weight || b.i - a.i)
    for (const entry of ranked) {
      if (diff >= 0) break
      cells[entry.i] = 0
      diff += 1
    }
  }

  return cells
}
