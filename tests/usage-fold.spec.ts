import { describe, expect, it } from 'vitest'
import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import {
  buildUsageReport,
  cacheHitPercent,
  emptyUsageReport,
  foldSessionEvents,
  localDay,
} from '../src/usage-fold.ts'
import type { SessionFoldState } from '../src/usage-fold.ts'
import type { QuotaPriceTable } from '../src/pricing.ts'

/**
 * Folding regressions: incremental resume, rewritten logs, route
 * inheritance, day bucketing, the cache-hit denominator, and the derived
 * spend, session rows, and budget windows the report carries.
 */

/** Epoch ms of a local wall-clock instant, so day bucketing is timezone-stable. */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime()
}

/** A `request/context` event naming the route later steps inherit. */
function route(seq: number, time: number, provider: string, model: string): SessionEvent {
  return { seq, time, type: 'request/context', data: { provider, model } } as unknown as SessionEvent
}

/** An `assistant/message` event carrying provider-reported usage. */
function message(seq: number, time: number, usage: Record<string, number> | undefined): SessionEvent {
  return {
    seq,
    time,
    type: 'assistant/message',
    data: usage === undefined ? {} : { usage },
  } as unknown as SessionEvent
}

describe('localDay', () => {
  it('buckets an instant into its local calendar day', () => {
    expect(localDay(at(2026, 3, 7, 23))).toBe('2026-03-07')
    expect(localDay(at(2026, 3, 8, 0))).toBe('2026-03-08')
  })

  it('zero-pads single-digit months and days', () => {
    expect(localDay(at(2026, 1, 5))).toBe('2026-01-05')
  })
})

describe('foldSessionEvents', () => {
  it('attributes a step to the route most recently declared', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), { inputTokens: 100, outputTokens: 40, cacheReadTokens: 10 }),
    ], undefined)

    expect(state.throughSeq).toBe(1)
    expect(state.eventCount).toBe(2)
    expect(state.days['2026-03-07']?.['deepseek\u0000deepseek-chat']).toEqual({
      calls: 1,
      inputTokens: 100,
      outputTokens: 40,
      cacheReadTokens: 10,
      cacheWriteTokens: 0,
    })
  })

  it('skips a step whose adapter reported no usage', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), undefined),
    ], undefined)

    expect(state.days).toEqual({})
    expect(state.throughSeq).toBe(-1)
  })

  it('files a step with no declared route under the unknown route', () => {
    const state = foldSessionEvents([message(0, at(2026, 3, 7), { inputTokens: 7, outputTokens: 3 })], undefined)
    expect(state.days['2026-03-07']?.['unknown\u0000unknown']).toMatchObject({ calls: 1, inputTokens: 7 })
  })

  it('counts only the events appended since the previous fold', () => {
    const events = [
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), { inputTokens: 100, outputTokens: 40 }),
    ]
    const first = foldSessionEvents(events, undefined)

    const grown = [...events, message(2, at(2026, 3, 7), { inputTokens: 50, outputTokens: 20 })]
    const second = foldSessionEvents(grown, first)

    expect(second.throughSeq).toBe(2)
    expect(second.days['2026-03-07']?.['deepseek\u0000deepseek-chat']).toMatchObject({
      calls: 2,
      inputTokens: 150,
      outputTokens: 60,
    })
  })

  it('leaves the counters of an unchanged fold alone when re-folded', () => {
    const events = [
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), { inputTokens: 100, outputTokens: 40 }),
    ]
    const first = foldSessionEvents(events, undefined)
    const again = foldSessionEvents(events, first)

    expect(again.days['2026-03-07']?.['deepseek\u0000deepseek-chat']).toMatchObject({
      calls: 1,
      inputTokens: 100,
    })
  })

  it('refolds from the start when the log shrank', () => {
    const long: SessionEvent[] = [
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), { inputTokens: 100, outputTokens: 40 }),
      message(2, at(2026, 3, 7), { inputTokens: 100, outputTokens: 40 }),
    ]
    const wide = foldSessionEvents(long, undefined)

    const truncated = long.slice(0, 2)
    const refolded = foldSessionEvents(truncated, wide)

    expect(refolded.eventCount).toBe(2)
    expect(refolded.days['2026-03-07']?.['deepseek\u0000deepseek-chat']).toMatchObject({
      calls: 1,
      inputTokens: 100,
    })
  })

  it('keeps a route change in separate rows', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), { inputTokens: 10, outputTokens: 5 }),
      route(2, at(2026, 3, 7), 'zai', 'glm-4.6'),
      message(3, at(2026, 3, 7), { inputTokens: 20, outputTokens: 8 }),
    ], undefined)

    const day = state.days['2026-03-07'] ?? {}
    expect(Object.keys(day)).toHaveLength(2)
    expect(day['zai\u0000glm-4.6']).toMatchObject({ inputTokens: 20 })
  })

  it('splits a session spanning midnight into two days', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7, 23), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7, 23), { inputTokens: 10, outputTokens: 5 }),
      message(2, at(2026, 3, 8, 1), { inputTokens: 20, outputTokens: 8 }),
    ], undefined)

    expect(Object.keys(state.days).sort()).toEqual(['2026-03-07', '2026-03-08'])
  })

  it('ignores a negative or non-numeric counter', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), { inputTokens: -5, outputTokens: 3 }),
    ], undefined)

    expect(state.days['2026-03-07']?.['deepseek\u0000deepseek-chat']).toMatchObject({
      inputTokens: 0,
      outputTokens: 3,
    })
  })

  it('remembers the latest instant a usage-bearing step was recorded', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7, 9), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7, 10), { inputTokens: 10, outputTokens: 5 }),
      message(2, at(2026, 3, 7, 14), { inputTokens: 20, outputTokens: 8 }),
    ], undefined)

    expect(state.lastActiveAt).toBe(at(2026, 3, 7, 14))
  })

  it('records no activity instant for a session that spent nothing', () => {
    const state = foldSessionEvents([
      route(0, at(2026, 3, 7), 'deepseek', 'deepseek-chat'),
      message(1, at(2026, 3, 7), undefined),
    ], undefined)

    expect(state.lastActiveAt).toBeUndefined()
  })
})

describe('cacheHitPercent', () => {
  it('measures cache reads against all billed input', () => {
    expect(cacheHitPercent({
      inputTokens: 100,
      outputTokens: 999,
      cacheReadTokens: 300,
      cacheWriteTokens: 100,
      totalTokens: 1499,
    })).toBe(60)
  })

  it('reports nothing when no input was recorded', () => {
    expect(cacheHitPercent({
      inputTokens: 0,
      outputTokens: 50,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 50,
    })).toBeUndefined()
  })
})

describe('buildUsageReport', () => {
  const state = (days: SessionFoldState['days'], lastActiveAt?: number): SessionFoldState =>
    ({ throughSeq: 1, eventCount: 2, days, ...lastActiveAt === undefined ? {} : { lastActiveAt } })

  /** One `[id, state]` pair, as the store hands its fold map to the builder. */
  const entry = (
    id: string,
    days: SessionFoldState['days'],
    lastActiveAt?: number,
  ): readonly [SessionId, SessionFoldState] => [id as SessionId, state(days, lastActiveAt)]

  /** Counters for one route on one day, with the zeros spelled out. */
  const counts = (
    calls: number,
    inputTokens: number,
    outputTokens: number,
    cacheReadTokens = 0,
    cacheWriteTokens = 0,
  ) => ({ calls, inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens })

  /** A price table charging round numbers, so an expected cost stays readable. */
  const prices: QuotaPriceTable = {
    currency: 'USD',
    rules: [{ model: 'chat', inputPerMillion: 1, outputPerMillion: 2 }],
  }

  it('splits totals into today, this month, and all time', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', {
        '2026-03-15': { 'deepseek\u0000chat': counts(2, 100, 50, 30, 10) },
        '2026-03-02': { 'deepseek\u0000chat': counts(1, 10, 5) },
        '2026-02-20': { 'deepseek\u0000chat': counts(1, 1, 1) },
      }),
    ], { now, foldedAt: now, folding: false })

    expect(report.today).toBe('2026-03-15')
    expect(report.todayTotals.totalTokens).toBe(190)
    expect(report.monthTotals.totalTokens).toBe(205)
    expect(report.allTimeTotals.totalTokens).toBe(207)
    expect(report.sessionCount).toBe(1)
  })

  it('merges two sessions sharing one day and route', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', { '2026-03-15': { 'deepseek\u0000chat': counts(1, 10, 5) } }),
      entry('s2', { '2026-03-15': { 'deepseek\u0000chat': counts(2, 20, 7) } }),
    ], { now, foldedAt: now, folding: false })

    const [day] = report.days
    expect(day?.calls).toBe(3)
    expect(day?.models).toHaveLength(1)
    expect(day?.models[0]).toMatchObject({ provider: 'deepseek', model: 'chat', calls: 3, inputTokens: 30 })
    expect(report.sessionCount).toBe(2)
  })

  it('orders days ascending and models by token total', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', {
        '2026-03-15': {
          'a\u0000small': counts(1, 1, 1),
          'b\u0000large': counts(1, 900, 100),
        },
        '2026-03-01': { 'a\u0000small': counts(1, 2, 1) },
      }),
    ], { now, foldedAt: now, folding: false })

    expect(report.days.map(day => day.date)).toEqual(['2026-03-01', '2026-03-15'])
    expect(report.days[1]?.models.map(model => model.model)).toEqual(['large', 'small'])
  })

  it('carries the folding flag through to the panel', () => {
    const now = at(2026, 3, 15)
    expect(buildUsageReport([], { now, foldedAt: 0, folding: true }).folding).toBe(true)
    expect(emptyUsageReport(now, false)).toMatchObject({ sessionCount: 0, foldedAt: 0, folding: false })
  })

  it('lists each session with its routes, ordered by latest activity', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('older', { '2026-03-14': { 'deepseek\u0000chat': counts(1, 10, 5) } }, at(2026, 3, 14)),
      entry('newer', {
        '2026-03-15': {
          'deepseek\u0000chat': counts(1, 20, 5),
          'zai\u0000glm-4.6': counts(1, 1, 1),
        },
      }, at(2026, 3, 15)),
    ], { now, foldedAt: now, folding: false })

    expect(report.sessions.map(session => session.id)).toEqual(['newer', 'older'])
    expect(report.sessions[0]).toMatchObject({
      calls: 2,
      totalTokens: 27,
      routes: ['deepseek/chat', 'zai/glm-4.6'],
      lastActiveAt: at(2026, 3, 15),
    })
  })

  it('omits a session whose fold recorded no tokens', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('empty', {}),
      entry('real', { '2026-03-15': { 'deepseek\u0000chat': counts(1, 10, 5) } }),
    ], { now, foldedAt: now, folding: false })

    expect(report.sessions.map(session => session.id)).toEqual(['real'])
    // The counter still reports both: one session was read, it just spent nothing.
    expect(report.sessionCount).toBe(2)
  })

  it('leaves every cost figure absent when no prices are configured', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', { '2026-03-15': { 'deepseek\u0000chat': counts(1, 1_000_000, 1_000_000) } }),
    ], { now, foldedAt: now, folding: false })

    expect(report.todayCost).toBeUndefined()
    expect(report.allTimeCost).toBeUndefined()
    expect(report.days[0]?.cost).toBeUndefined()
    expect(report.days[0]?.models[0]?.cost).toBeUndefined()
    expect(report.sessions[0]?.cost).toBeUndefined()
    expect(report.budgets).toBeUndefined()
  })

  it('derives spend per row, per day, per session, and per window', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', { '2026-03-15': { 'deepseek\u0000chat': counts(2, 2_000_000, 500_000) } }),
    ], { now, foldedAt: now, folding: false, prices })

    expect(report.todayCost).toEqual({ amount: 3, currency: 'USD', unpricedCalls: 0 })
    expect(report.monthCost).toEqual({ amount: 3, currency: 'USD', unpricedCalls: 0 })
    expect(report.allTimeCost).toEqual({ amount: 3, currency: 'USD', unpricedCalls: 0 })
    expect(report.days[0]?.cost).toEqual({ amount: 3, currency: 'USD', unpricedCalls: 0 })
    expect(report.days[0]?.models[0]?.cost).toEqual({ amount: 3, currency: 'USD', unpricedCalls: 0 })
    expect(report.sessions[0]?.cost).toEqual({ amount: 3, currency: 'USD', unpricedCalls: 0 })
  })

  it('reports the calls it could not price beside the amount it could', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', {
        '2026-03-15': {
          'deepseek\u0000chat': counts(1, 1_000_000, 0),
          'other\u0000mystery': counts(4, 1_000_000, 0),
        },
      }),
    ], { now, foldedAt: now, folding: false, prices })

    expect(report.todayCost).toEqual({ amount: 1, currency: 'USD', unpricedCalls: 4 })
  })

  it('measures both budget windows against derived spend', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', {
        '2026-03-15': { 'deepseek\u0000chat': counts(1, 4_000_000, 0) },
        '2026-03-10': { 'deepseek\u0000chat': counts(1, 2_000_000, 0) },
      }),
    ], {
      now,
      foldedAt: now,
      folding: false,
      prices,
      budgets: { daily: 5, monthly: 10, warningPercent: 80, criticalPercent: 100 },
    })

    expect(report.budgets?.currency).toBe('USD')
    expect(report.budgets?.daily).toEqual({
      limit: 5,
      spent: 4,
      percentUsed: 80,
      status: 'warning',
      unpricedCalls: 0,
    })
    expect(report.budgets?.monthly).toMatchObject({ limit: 10, spent: 6, percentUsed: 60, status: 'normal' })
  })

  it('marks a window critical once the ceiling is reached', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', { '2026-03-15': { 'deepseek\u0000chat': counts(1, 6_000_000, 0) } }),
    ], {
      now,
      foldedAt: now,
      folding: false,
      prices,
      budgets: { daily: 5, warningPercent: 80, criticalPercent: 100 },
    })

    expect(report.budgets?.daily).toMatchObject({ status: 'critical', percentUsed: 120 })
    expect(report.budgets?.monthly).toBeUndefined()
  })

  it('calls a window unknown while every call behind it is unpriced', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', { '2026-03-15': { 'other\u0000mystery': counts(3, 1_000_000, 0) } }),
    ], {
      now,
      foldedAt: now,
      folding: false,
      prices,
      budgets: { daily: 5, warningPercent: 80, criticalPercent: 100 },
    })

    expect(report.budgets?.daily).toMatchObject({ spent: 0, status: 'unknown', unpricedCalls: 3 })
  })

  it('omits the budget section when prices are missing', () => {
    const now = at(2026, 3, 15)
    const report = buildUsageReport([
      entry('s1', { '2026-03-15': { 'deepseek\u0000chat': counts(1, 10, 5) } }),
    ], {
      now,
      foldedAt: now,
      folding: false,
      budgets: { daily: 5, warningPercent: 80, criticalPercent: 100 },
    })

    expect(report.budgets).toBeUndefined()
  })
})
