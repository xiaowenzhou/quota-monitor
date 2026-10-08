import { describe, expect, it } from 'vitest'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { EXPORT_SCHEMA_VERSION, buildExport } from '../src/export.ts'
import { buildUsageReport } from '../src/usage-fold.ts'
import type { SessionFoldState } from '../src/usage-fold.ts'
import type { QuotaProviderEntry, QuotaUsageReport } from '../src/types.ts'

/**
 * Export regressions: the CSV framing a spreadsheet needs, the formula guard,
 * and what the JSON document is allowed to carry.
 */

/** Epoch ms of a local wall-clock instant, so day bucketing is timezone-stable. */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime()
}

/** One session fold, keyed as the store hands it to the report builder. */
function fold(
  id: string,
  days: SessionFoldState['days'],
  lastActiveAt: number,
): readonly [SessionId, SessionFoldState] {
  return [id as SessionId, { throughSeq: 1, eventCount: 2, days, lastActiveAt }]
}

/** Counters for one route on one day. */
function counts(calls: number, inputTokens: number, outputTokens: number) {
  return { calls, inputTokens, outputTokens, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

/** A report with one priced day and one session. */
function report(): QuotaUsageReport {
  const now = at(2026, 3, 15)
  return buildUsageReport([
    fold('sess-1', { '2026-03-15': { 'deepseek\u0000chat': counts(2, 1_000_000, 500_000) } }, now),
  ], {
    now,
    foldedAt: now,
    folding: false,
    prices: { currency: 'USD', rules: [{ inputPerMillion: 1, outputPerMillion: 2 }] },
  })
}

const PROVIDERS: readonly QuotaProviderEntry[] = Object.freeze([
  Object.freeze({
    id: 'deepseek',
    name: 'DeepSeek',
    mode: 'balance',
    adapter: 'deepseek-balance',
    status: 'ok',
    warning: 'normal',
  } as const),
])

describe('buildExport', () => {
  it('names and types each document so a browser saves it correctly', () => {
    const usage = report()
    expect(buildExport('daily-csv', usage, PROVIDERS, at(2026, 3, 15))).toMatchObject({
      filename: 'dsh-quota-daily.csv',
      mediaType: 'text/csv; charset=utf-8',
    })
    expect(buildExport('sessions-csv', usage, PROVIDERS, at(2026, 3, 15))).toMatchObject({
      filename: 'dsh-quota-sessions.csv',
    })
    expect(buildExport('report-json', usage, PROVIDERS, at(2026, 3, 15))).toMatchObject({
      filename: 'dsh-quota-report.json',
      mediaType: 'application/json; charset=utf-8',
    })
  })

  it('writes a UTF-8 CSV with CRLF rows and every cell quoted', () => {
    const { content } = buildExport('daily-csv', report(), PROVIDERS, at(2026, 3, 15))
    const lines = content.split('\r\n')
    expect(content.startsWith('\uFEFF')).toBe(true)
    expect(content.endsWith('\r\n')).toBe(true)
    expect(lines[0]).toBe('\uFEFF"date","provider","model","calls","input_tokens","cache_read_tokens",'
      + '"cache_write_tokens","output_tokens","total_tokens","estimated_cost","currency","unpriced_calls"')
    expect(lines[1]).toBe('"2026-03-15","deepseek","chat","2","1000000","0","0","500000","1500000","2","USD","0"')
  })

  it('leaves the cost columns empty when no price was configured', () => {
    const now = at(2026, 3, 15)
    const unpriced = buildUsageReport([
      fold('sess-1', { '2026-03-15': { 'deepseek\u0000chat': counts(1, 10, 5) } }, now),
    ], { now, foldedAt: now, folding: false })

    const [, row] = buildExport('daily-csv', unpriced, PROVIDERS, now).content.split('\r\n')
    expect(row).toBe('"2026-03-15","deepseek","chat","1","10","0","0","5","15","","",""')
  })

  it('defuses a route id a spreadsheet would evaluate as a formula', () => {
    const now = at(2026, 3, 15)
    const hostile = buildUsageReport([
      fold('sess-1', { '2026-03-15': { '=cmd()\u0000-2+3': counts(1, 10, 5) } }, now),
    ], { now, foldedAt: now, folding: false })

    const [, row] = buildExport('daily-csv', hostile, PROVIDERS, now).content.split('\r\n')
    expect(row).toContain('"\'=cmd()"')
    expect(row).toContain('"\'-2+3"')
  })

  it('escapes an embedded quote by doubling it', () => {
    const now = at(2026, 3, 15)
    const quoted = buildUsageReport([
      fold('sess-1', { '2026-03-15': { 'deepseek\u0000say "hi"': counts(1, 10, 5) } }, now),
    ], { now, foldedAt: now, folding: false })

    const [, row] = buildExport('daily-csv', quoted, PROVIDERS, now).content.split('\r\n')
    expect(row).toContain('"say ""hi"""')
  })

  it('writes one session row with its routes joined and its activity stamped', () => {
    const { content } = buildExport('sessions-csv', report(), PROVIDERS, at(2026, 3, 15))
    const lines = content.split('\r\n')
    expect(lines[0]).toContain('"session_id","routes"')
    expect(lines[1]).toContain('"sess-1","deepseek/chat","2"')
    expect(lines[1]).toContain(`"${new Date(at(2026, 3, 15)).toISOString()}"`)
  })

  it('carries the report and the provider statuses in the JSON document', () => {
    const { content } = buildExport('report-json', report(), PROVIDERS, at(2026, 3, 15))
    const parsed = JSON.parse(content) as {
      schemaVersion: string
      exportedAt: string
      usage: QuotaUsageReport
      providers: Array<Record<string, unknown>>
    }

    expect(parsed.schemaVersion).toBe(EXPORT_SCHEMA_VERSION)
    expect(parsed.exportedAt).toBe(new Date(at(2026, 3, 15)).toISOString())
    expect(parsed.usage.todayCost).toEqual({ amount: 2, currency: 'USD', unpricedCalls: 0 })
    expect(parsed.providers).toEqual([{
      id: 'deepseek',
      name: 'DeepSeek',
      mode: 'balance',
      adapter: 'deepseek-balance',
      status: 'ok',
      warning: 'normal',
    }])
    expect(content.endsWith('\n')).toBe(true)
  })

  it('keeps account amounts and credential references out of the JSON document', () => {
    const { content } = buildExport('report-json', report(), PROVIDERS, at(2026, 3, 15))

    // The provider rows name the route and how its read ended; the figures the
    // account card shows stay in the panel.
    expect(content).not.toContain('remaining')
    expect(content).not.toContain('credential')
    expect(content).not.toContain('planWindows')
  })
})
