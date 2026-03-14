// Shared utility for battle facility trainer/range logic

export function battleRangeMatches(battleNum: number, range: string): boolean {
  // "Nx" — every N battles (e.g. "10x" matches 10, 20, 30, ...)
  if (range.endsWith('x')) {
    const n = parseInt(range.slice(0, -1), 10)
    return Number.isFinite(n) && n > 0 && battleNum % n === 0
  }
  // "N+" — N and above
  if (range.endsWith('+')) {
    const start = parseInt(range.slice(0, -1), 10)
    return Number.isFinite(start) && battleNum >= start
  }
  // "A-B" — range
  if (range.includes('-')) {
    const [a, b] = range.split('-').map(v => parseInt(v, 10))
    return Number.isFinite(a) && Number.isFinite(b) && battleNum >= a && battleNum <= b
  }
  // exact match
  const exact = parseInt(range, 10)
  return Number.isFinite(exact) && battleNum === exact
}
