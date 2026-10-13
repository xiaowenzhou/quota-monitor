/** Accounting regressions against durable request headers, attempts and fork seeds. */
import { Context } from '@deepseek-ai/cordis'
import { SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { MessageId } from '@deepseek-ai/dsh-llm'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { describe, expect, it } from 'vitest'
import { buildUsageReport, foldSessionEvents } from '../src/usage-fold.ts'
import { QuotaUsageStore } from '../src/usage-store.ts'
import { installStubSeams } from './stubs.ts'

const day = (date: number) => new Date(2026, 2, date, 12).getTime()
const header = (seq: number, provider = 'relay', model = 'real-model'): SessionEvent => ({
  seq: SessionSeq(seq), time: day(15), type: 'request/header',
  data: { header: { config: { provider, model } }, reason: 'initial' },
})
const attempt = (seq: number, inputTokens: number, step = 1, time = day(15)): SessionEvent => ({
  seq: SessionSeq(seq), time, type: 'assistant/attempt',
  data: { turn: 1, step, stream: [{ type: 'chunk', time, chunk: {
    type: 'usage', usage: { inputTokens, outputTokens: 5 },
  } }] },
})

function settlement(seq: number, usage: TokenUsage, time = day(15)): SessionEvent {
  return {
    seq: SessionSeq(seq), time, type: 'assistant/message', surfaceOp: 'append',
    data: { turn: 1, step: 1, message: {
      id: MessageId(`quota-${seq}`), role: 'assistant', content: [],
      source: { kind: 'model', provider: 'relay', model: 'real-model' },
    }, stream: [], usage },
  }
}

const reportOf = (events: SessionEvent[]) => buildUsageReport([
  [SessionId('accounted'), foldSessionEvents(events, undefined)],
], { now: day(15), foldedAt: day(15), folding: false })

describe('durable attempt accounting', () => {
  it('uses the request header over context metadata, and supports header-only routing', () => {
    const context: SessionEvent = { seq: SessionSeq(1), time: day(15), type: 'request/context',
      data: { provider: 'metadata-route', model: 'metadata-model' } }
    const report = reportOf([header(0), context, attempt(2, 100)])
    expect(report.models).toHaveLength(1)
    expect(report.models?.[0]).toMatchObject({ provider: 'relay', model: 'real-model', all: { calls: 1, inputTokens: 100 } })
    expect(reportOf([header(0), attempt(1, 100)]).models?.[0]?.provider).toBe('relay')
  })

  it('takes the last embedded usage sample and prefers a final direct usage value', () => {
    const streamed: SessionEvent = { seq: SessionSeq(1), time: day(15), type: 'assistant/attempt',
      data: { turn: 1, step: 1, stream: [
        { type: 'chunk', time: day(15), chunk: { type: 'usage', usage: { inputTokens: 10, outputTokens: 1 } } },
        { type: 'chunk', time: day(15), chunk: { type: 'usage', usage: { inputTokens: 20, outputTokens: 2 } } },
      ] } }
    expect(reportOf([header(0), streamed]).allTimeTotals.inputTokens).toBe(20)
    const final = settlement(2, { inputTokens: 30, outputTokens: 9, reasoningTokens: 7, cacheReadTokens: 5, cacheWriteTokens: 4 })
    const report = reportOf([header(0), streamed, final])
    expect(report.allTimeTotals).toEqual({ inputTokens: 30, outputTokens: 9, cacheReadTokens: 5, cacheWriteTokens: 4, totalTokens: 48 })
    expect(report.models?.[0]?.all.calls).toBe(1)
  })

  it('replaces a settlement across days and routes without leaving a phantom row', () => {
    const report = reportOf([header(0), attempt(1, 10, 1, day(14)), header(2, 'relay2', 'new-model'), settlement(3, { inputTokens: 30, outputTokens: 5 })])
    expect(report.days.map(row => row.date)).toEqual(['2026-03-15'])
    expect(report.models).toHaveLength(1)
    expect(report.models?.[0]).toMatchObject({ provider: 'relay2', model: 'new-model', all: { calls: 1, inputTokens: 30 } })
  })

  it('counts retry attempts separately and leaves usage-less attempts out', () => {
    // The retry event is supplied by the retry plugin rather than quota-monitor.
    const retry = { seq: SessionSeq(2), time: day(15), type: 'llm/retry-started', data: { turn: 1, step: 1, retry: 1 } } as SessionEvent
    const silent: SessionEvent = { seq: SessionSeq(4), time: day(15), type: 'assistant/attempt', data: { turn: 1, step: 2, stream: [] } }
    const report = reportOf([header(0), attempt(1, 10), retry, settlement(3, { inputTokens: 30, outputTokens: 5 }), silent])
    expect(report.models?.[0]?.all).toMatchObject({ calls: 2, inputTokens: 40, outputTokens: 10 })
  })

  it('does not split a settlement for a retry belonging to another step', () => {
    const retry = { seq: SessionSeq(2), time: day(15), type: 'llm/retry-started', data: { turn: 1, step: 9, retry: 1 } } as SessionEvent
    const report = reportOf([header(0), attempt(1, 10), retry, settlement(3, { inputTokens: 30, outputTokens: 5 })])
    expect(report.models?.[0]?.all).toMatchObject({ calls: 1, inputTokens: 30, outputTokens: 5 })
  })

  it('counts only work after the latest inherited marker, retaining the route', () => {
    const inherited: SessionEvent = { seq: SessionSeq(2), time: day(15), type: 'session/end-seed', data: { inherited: true } }
    const restored: SessionEvent = { seq: SessionSeq(4), time: day(15), type: 'session/end-seed', data: {} }
    const events = [header(0), attempt(1, 100), inherited, attempt(3, 10, 2), restored, attempt(5, 20, 3)]
    const report = reportOf(events)
    expect(report.allTimeTotals.inputTokens).toBe(30)
    expect(report.models?.[0]).toMatchObject({ provider: 'relay', model: 'real-model', all: { calls: 2 } })
    const nested: SessionEvent = { seq: SessionSeq(6), time: day(15), type: 'session/end-seed', data: { inherited: true } }
    expect(reportOf([...events, nested, attempt(7, 7, 4)]).allTimeTotals.inputTokens).toBe(7)
  })

  it('corrects an equal-length rewritten prefix on repeat folding', () => {
    const previous = foldSessionEvents([header(0), attempt(1, 100)], undefined)
    const next = foldSessionEvents([header(0, 'corrected', 'replacement'), attempt(1, 30)], previous)
    expect(next.days['2026-03-15']).toEqual({ 'corrected\u0000replacement': { calls: 1, inputTokens: 30, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 } })
  })
})

describe('model scopes and rates', () => {
  it('separates providers, uses dated costs and exposes the current effective rates', () => {
    const report = buildUsageReport([
      [SessionId('accounted'), foldSessionEvents([
        header(0), attempt(1, 1_000_000, 1, day(1)), attempt(2, 1_000_000, 2),
        header(3, 'other', 'real-model'), attempt(4, 100, 3),
      ], undefined)],
    ], { now: day(15), foldedAt: day(15), folding: false, prices: { currency: 'USD', fuzzyMatch: false, rules: [
      { provider: 'relay', model: 'real-model', inputPerMillion: 1, outputPerMillion: 0 },
      { provider: 'relay', model: 'real-model', from: '2026-03-10', inputPerMillion: 10, outputPerMillion: 0, cacheReadPerMillion: 0.1, cacheWritePerMillion: 0 },
    ] } })
    expect(report.models).toHaveLength(2)
    expect(report.models?.[0]).toMatchObject({ provider: 'relay', model: 'real-model',
      all: { calls: 2, cost: { amount: 11, unpricedCalls: 0 } },
      today: { calls: 1, cost: { amount: 10 } }, month: { calls: 2, cost: { amount: 11 } },
      rate: { inputPerMillion: 10, outputPerMillion: 0, cacheReadPerMillion: 0.1, cacheWritePerMillion: 0, currency: 'USD', from: '2026-03-10' },
    })
    expect(report.models?.[1]?.all.cost).toMatchObject({ amount: 0, unpricedCalls: 1 })
    expect(report.models?.[1]?.rate).toBeUndefined()
  })
})

describe('usage store refresh accuracy', () => {
  it('discards old derived caches and notices rewrites with unchanged event counts', async () => {
    const ctx = new Context()
    const seams = installStubSeams(ctx)
    const old = foldSessionEvents([header(0), attempt(1, 999)], undefined)
    const { accountingVersion: _oldVersion, ...legacy } = old
    seams.storageDomain.state.records.set('accounted', legacy)
    seams.sessionQuery.sessions = [{ id: 'accounted', events: [header(0), attempt(1, 10)] }]
    const store = new QuotaUsageStore(ctx, () => day(15))
    const close = await store.open()
    try {
      expect(store.current().allTimeTotals.totalTokens).toBe(0)
      expect((await store.refresh()).allTimeTotals.inputTokens).toBe(10)
      seams.sessionQuery.sessions[0]!.events = [header(0), attempt(1, 30)]
      expect((await store.refresh()).allTimeTotals.inputTokens).toBe(30)
      expect(seams.storageDomain.state.records.get('accounted')).toMatchObject({ accountingVersion: 3 })
    } finally { close(); await ctx.fiber.dispose() }
  })

  it('rolls calendar scopes over at midnight even without a new refresh', async () => {
    const ctx = new Context()
    const seams = installStubSeams(ctx)
    seams.sessionQuery.sessions = [{ id: 'accounted', events: [header(0), attempt(1, 10)] }]
    let now = day(15)
    const store = new QuotaUsageStore(ctx, () => now)
    const close = await store.open()
    try {
      await store.refresh()
      now = day(16)
      expect(store.current().today).toBe('2026-03-16')
      expect(store.current().models?.[0]?.today.calls).toBe(0)
      expect(store.current().allTimeTotals.inputTokens).toBe(10)
    } finally { close(); await ctx.fiber.dispose() }
  })
})
