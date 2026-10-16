import { describe, expect, it } from 'vitest'
import { periodRange, sliceUsage, sumUsage } from '../src/client/key-usage-period.ts'
import type { QuotaKeyPoint, QuotaKeyUsage } from '../src/types.ts'
const now = Date.parse('2026-10-15T12:00:00+08:00')
const point = (date: string, model = 'model-a'): QuotaKeyPoint => ({ date, model, inputTokens: 10, outputTokens: 20, reasoningTokens: 5, cacheReadTokens: 60, cacheWriteTokens: 10, totalTokens: 100, calls: 2 })
const usage = (points: QuotaKeyPoint[]): QuotaKeyUsage => ({ days: 62, startDate: '2026-08-15', endDate: '2026-10-15', points, models: [], daily: [], window: sumUsage(points) })
describe('member calendar periods', () => {
  it('uses Shanghai calendar boundaries and Monday weeks', () => {
    expect(periodRange('thisWeek', now)).toEqual({ start: '2026-10-12', end: '2026-10-15' })
    expect(periodRange('lastWeek', now)).toEqual({ start: '2026-10-05', end: '2026-10-11' })
    expect(periodRange('thisMonth', now)).toEqual({ start: '2026-10-01', end: '2026-10-15' })
    expect(periodRange('lastMonth', now)).toEqual({ start: '2026-09-01', end: '2026-09-30' })
    expect(periodRange('last30', now)).toEqual({ start: '2026-09-16', end: '2026-10-15' })
    expect(periodRange('thisMonth', Date.parse('2026-09-30T16:00:00Z'))).toEqual({ start: '2026-10-01', end: '2026-10-01' })
    expect(periodRange('lastMonth', Date.parse('2024-03-01T00:00:00+08:00'))).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(periodRange('lastMonth', Date.parse('2026-01-01T00:00:00+08:00'))).toEqual({ start: '2025-12-01', end: '2025-12-31' })
  })
  it('slices inclusive bounds and preserves each model bucket without double-counting reasoning', () => {
    const data = usage([point('2026-09-30'), point('2026-10-01'), point('2026-10-15'), point('2026-10-15', 'model-b'), point('2026-10-16')])
    const result = sliceUsage(data, periodRange('thisMonth', now))
    expect(result.coverage).toBe('complete')
    expect(result.totals).toMatchObject({ totalTokens: 300, inputTokens: 30, outputTokens: 60, cacheReadTokens: 180, cacheWriteTokens: 30, reasoningTokens: 15, calls: 6 })
    expect(result.models.map(row => [row.model, row.totalTokens])).toEqual([['model-a', 200], ['model-b', 100]])
    expect(result.daily.map(row => [row.date, row.totalTokens])).toEqual([['2026-10-01', 100], ['2026-10-15', 200]])
  })
  it('distinguishes truncated history, no data, and a covered zero period', () => {
    const range = periodRange('lastMonth', now)
    expect(sliceUsage({ ...usage([point('2026-09-20')]), startDate: '2026-09-16' }, range).coverage).toBe('partial')
    expect(sliceUsage(undefined, range).totals).toBeUndefined()
    expect(sliceUsage(usage([point('2026-10-01')]), range).totals?.totalTokens).toBe(0)
    expect(sliceUsage({ ...usage([]), startDate: '2026-10-01' }, range).coverage).toBe('unavailable')
  })
  it('does not invent model splits or call counts for aggregates-only data', () => {
    const data = { ...usage([]), window: { ...sumUsage([point('2026-10-01')]), totalTokens: 100 }, daily: [{ ...point('2026-10-01') }] }
    expect(sliceUsage(data, periodRange('thisMonth', now)).models).toEqual([])
    const { calls: _calls, ...noCalls } = point('2026-10-02')
    expect(sumUsage([point('2026-10-01'), noCalls]).calls).toBeUndefined()
  })
})
