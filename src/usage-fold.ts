/**
 * Folding session logs into per-day, per-`provider · model` token totals.
 *
 * Pure functions over event arrays: no IO, no clock reads beyond the injected
 * `now`. The Host service owns reading sessions and persisting the result.
 *
 * Only provider-reported `usage` is folded. A step whose adapter reported no
 * usage contributes nothing rather than an estimate, so every figure the
 * panel shows traces back to a provider's own accounting.
 * @module @deepseek-ai/dsh-extension-quota-monitor/usage-fold
 */

import type { SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import type { QuotaBudgetConfig } from './config.ts'
import { QuotaCostAccumulator } from './pricing.ts'
import type { QuotaPriceTable } from './pricing.ts'
import type {
  QuotaBudgetStatus,
  QuotaBudgetView,
  QuotaBudgetWindow,
  QuotaCostView,
  QuotaDayUsage,
  QuotaModelUsage,
  QuotaProviderUsage,
  QuotaSessionUsage,
  QuotaTokenTotals,
  QuotaUsageReport,
} from './types.ts'

/** The route a step ran on, carried between `request/context` and `assistant/message`. */
interface RouteKey {
  provider: string
  model: string
}

/** Mutable accumulator for one `provider · model` pair within a day. */
interface ModelAccumulator extends RouteKey {
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Mutable accumulator for one local calendar day. */
interface DayAccumulator {
  date: string
  calls: number
  models: Map<string, ModelAccumulator>
}

/** One scope's counters for a provider route: today, this month, or all time. */
interface ProviderScope {
  calls: number
  totals: QuotaTokenTotals
  cost: QuotaCostAccumulator
}

/** Mutable accumulator for one provider route across every folded day. */
interface ProviderAccumulator {
  provider: string
  all: ProviderScope
  today: ProviderScope
  month: ProviderScope
  models: Set<string>
  lastDay: string
}

/**
 * A zeroed provider accumulator.
 * @param provider - the route key.
 * @param prices - the price table, or undefined to derive nothing.
 * @returns the accumulator, dated before every real day.
 */
function emptyProvider(provider: string, prices: QuotaPriceTable | undefined): ProviderAccumulator {
  return {
    provider,
    all: emptyScope(prices),
    today: emptyScope(prices),
    month: emptyScope(prices),
    models: new Set<string>(),
    lastDay: '',
  }
}

/**
 * A zeroed scope.
 * @param prices - the price table, or undefined to derive nothing.
 * @returns the scope.
 */
function emptyScope(prices: QuotaPriceTable | undefined): ProviderScope {
  return { calls: 0, totals: emptyTotals(), cost: new QuotaCostAccumulator(prices) }
}

/**
 * Add one route-day's counters into a scope.
 * @param scope - the scope to add into.
 * @param provider - provider route key.
 * @param model - model id.
 * @param date - the day the counters belong to, deciding the rate that applies.
 * @param counts - the folded counters.
 */
function addToScope(
  scope: ProviderScope,
  provider: string,
  model: string,
  date: string,
  counts: QuotaFoldCounts,
): void {
  scope.calls += counts.calls
  addCounts(scope.totals, counts)
  scope.cost.add(provider, model, date, counts.calls, counts)
}

/**
 * The folded state of one session, cached between rounds.
 *
 * `throughSeq` is the highest raw-log seq already folded; a later round
 * resumes after it. `eventCount` detects a log that was rewritten rather than
 * appended to, which forces a full refold of that session.
 */
export interface SessionFoldState {
  throughSeq: number
  eventCount: number
  /** `YYYY-MM-DD` → `provider\u0000model` → totals, as plain JSON for persistence. */
  days: Record<string, Record<string, QuotaFoldCounts>>
  /**
   * Epoch ms of the latest usage-bearing event folded, or 0 before one. Only
   * usage counts: a session whose log kept growing without a model call has
   * not spent anything since.
   */
  lastActiveAt?: number
}

/** The five counters persisted per `provider · model` per day. */
export interface QuotaFoldCounts {
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Separator for the composite `provider · model` key; never appears in either id. */
const KEY_SEP = '\u0000'

/**
 * The local calendar day of an epoch instant, as `YYYY-MM-DD`.
 *
 * Local rather than UTC: a user reading "today" means their own day, and a
 * UTC fold would move eight hours of usage into the wrong bucket for a CN
 * workday.
 * @param epochMs - the instant.
 * @returns the local calendar day.
 */
export function localDay(epochMs: number): string {
  const date = new Date(epochMs)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** A zeroed counter row. */
function emptyCounts(): QuotaFoldCounts {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }
}

/** Read a non-negative finite integer, or 0. */
function countOf(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Fold one session's events into a per-day, per-route counter map.
 *
 * Resumes from `previous` when the log only grew; a shorter log, or one whose
 * prefix was rewritten, is refolded from the start because its earlier seqs
 * no longer identify the same events.
 * @param events - the session's raw log events, ascending by seq.
 * @param previous - the fold state from an earlier round, when one exists.
 * @returns the updated fold state.
 */
export function foldSessionEvents(
  events: readonly SessionEvent[],
  previous: SessionFoldState | undefined,
): SessionFoldState {
  const resumable = previous !== undefined && events.length >= previous.eventCount
  const days: Record<string, Record<string, QuotaFoldCounts>> = resumable
    ? structuredClone(previous.days)
    : {}
  let throughSeq = resumable ? previous.throughSeq : -1
  let lastActiveAt = resumable ? previous.lastActiveAt ?? 0 : 0

  // The route is logged once per change, so a step inherits the last one seen
  // — including from events before the resume point, which is why the scan
  // always starts at the beginning and only the accumulation is skipped.
  let route: RouteKey | undefined
  for (const event of events) {
    if (event.type === 'request/context') {
      const data = event.data as { provider?: unknown; model?: unknown }
      if (typeof data.provider === 'string' && typeof data.model === 'string') {
        route = { provider: data.provider, model: data.model }
      }
      continue
    }
    if (event.type !== 'assistant/message') continue
    if (resumable && event.seq <= previous.throughSeq) continue

    const { usage } = event.data
    if (usage === undefined) continue

    const date = localDay(event.time)
    const key = `${route?.provider ?? 'unknown'}${KEY_SEP}${route?.model ?? 'unknown'}`
    const byRoute = days[date] ?? (days[date] = {})
    const counts = byRoute[key] ?? (byRoute[key] = emptyCounts())
    counts.calls += 1
    counts.inputTokens += countOf(usage.inputTokens)
    counts.outputTokens += countOf(usage.outputTokens)
    counts.cacheReadTokens += countOf(usage.cacheReadTokens)
    counts.cacheWriteTokens += countOf(usage.cacheWriteTokens)
    throughSeq = Math.max(throughSeq, event.seq)
    lastActiveAt = Math.max(lastActiveAt, event.time)
  }

  return {
    throughSeq,
    eventCount: events.length,
    days,
    ...lastActiveAt > 0 ? { lastActiveAt } : {},
  }
}

/** The wire figures one scope contributes to a provider row. */
function scopeFigures(scope: ProviderScope): {
  calls: number
  tokens: number
  cacheHitPercent?: number
  cost?: QuotaCostView
} {
  const cost = scope.cost.view()
  const hitPercent = cacheHitPercent(scope.totals)
  return {
    calls: scope.calls,
    tokens: scope.totals.totalTokens,
    ...hitPercent === undefined ? {} : { cacheHitPercent: hitPercent },
    ...cost === undefined ? {} : { cost },
  }
}

/** A zeroed totals row. */
function emptyTotals(): QuotaTokenTotals {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0 }
}

/** Add one counter row into a totals row. */
function addCounts(totals: QuotaTokenTotals, counts: QuotaFoldCounts): void {
  totals.inputTokens += counts.inputTokens
  totals.outputTokens += counts.outputTokens
  totals.cacheReadTokens += counts.cacheReadTokens
  totals.cacheWriteTokens += counts.cacheWriteTokens
  totals.totalTokens += counts.inputTokens + counts.outputTokens
    + counts.cacheReadTokens + counts.cacheWriteTokens
}

/**
 * Cache-hit share of billed input, 0–100.
 *
 * Denominated by all three input buckets because those are exactly what a
 * request pays for; output is excluded since it is never served from cache.
 * @param totals - the totals to measure.
 * @returns the percentage, or `undefined` when no input was recorded.
 */
export function cacheHitPercent(totals: QuotaTokenTotals): number | undefined {
  const billed = totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens
  if (billed <= 0) return undefined
  return Math.round((totals.cacheReadTokens / billed) * 1000) / 10
}

/** What the report builder needs beyond the folded counters. */
export interface QuotaReportOptions {
  /** Current epoch milliseconds, deciding today and this month. */
  now: number
  /** Epoch ms the fold completed. */
  foldedAt: number
  /** Whether a fold round is currently running. */
  folding: boolean
  /** Prices to derive spend from; omitted leaves every cost figure absent. */
  prices?: QuotaPriceTable
  /** Spend ceilings to measure the derived cost against. */
  budgets?: QuotaBudgetConfig
  /**
   * Report one provider route alone: its days, its sessions, and its totals.
   * Omitted reports every route together, which is the per-provider comparison.
   */
  provider?: string
}

/**
 * One budget window, measured against derived spend.
 *
 * A window whose spend rests on unpriced calls still reports the amount it
 * could derive, alongside how many calls it could not price, so a percentage is
 * never presented as complete when it is not.
 */
function budgetWindow(
  limit: number | undefined,
  cost: QuotaCostView | undefined,
  budgets: QuotaBudgetConfig,
): QuotaBudgetWindow | undefined {
  if (limit === undefined || limit <= 0) return undefined
  const spent = cost?.amount ?? 0
  const unpricedCalls = cost?.unpricedCalls ?? 0
  const percentUsed = Math.round((spent / limit) * 1000) / 10
  const status: QuotaBudgetStatus = unpricedCalls > 0 && spent === 0
    ? 'unknown'
    : percentUsed >= budgets.criticalPercent
      ? 'critical'
      : percentUsed >= budgets.warningPercent
        ? 'warning'
        : 'normal'
  return { limit, spent, percentUsed, status, unpricedCalls }
}

/**
 * Merge every session's fold state into the report the panel reads.
 *
 * Sessions are keyed by id so the report can list them; the id is the only
 * session-identifying value that crosses into it, because a title is prompt
 * text and this report is not where prompt text belongs.
 * @param states - per-session id and fold state, in any order.
 * @param options - clock, fold status, prices, and ceilings.
 * @returns the assembled report.
 */
export function buildUsageReport(
  states: Iterable<readonly [SessionId, SessionFoldState]>,
  options: QuotaReportOptions,
): QuotaUsageReport {
  const { now, foldedAt, folding, prices, budgets, provider: only } = options
  const byDay = new Map<string, DayAccumulator>()
  const byProvider = new Map<string, ProviderAccumulator>()
  const sessions: QuotaSessionUsage[] = []
  let sessionCount = 0

  for (const [id, state] of states) {
    sessionCount += 1
    const session = emptyTotals()
    const routes = new Set<string>()
    const sessionCost = new QuotaCostAccumulator(prices)
    let calls = 0

    for (const [date, perRoute] of Object.entries(state.days)) {
      for (const [key, counts] of Object.entries(perRoute)) {
        const [provider = 'unknown', model = 'unknown'] = key.split(KEY_SEP)
        // A filtered report drops the other routes here, so every figure below
        // — the day, the session, and the totals — describes one route alone.
        if (only !== undefined && provider !== only) continue
        const day: DayAccumulator = byDay.get(date)
          ?? { date, calls: 0, models: new Map<string, ModelAccumulator>() }
        byDay.set(date, day)
        const row = day.models.get(key) ?? {
          provider,
          model,
          calls: 0,
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        }
        day.models.set(key, row)
        row.calls += counts.calls
        row.inputTokens += counts.inputTokens
        row.outputTokens += counts.outputTokens
        row.cacheReadTokens += counts.cacheReadTokens
        row.cacheWriteTokens += counts.cacheWriteTokens
        day.calls += counts.calls

        addCounts(session, counts)
        routes.add(`${provider}/${model}`)
        sessionCost.add(provider, model, date, counts.calls, counts)
        calls += counts.calls
      }
    }

    if (session.totalTokens <= 0) continue
    const cost = sessionCost.view()
    sessions.push({
      id,
      calls,
      ...session,
      routes: Object.freeze([...routes].sort((left, right) => left.localeCompare(right))),
      lastActiveAt: state.lastActiveAt ?? 0,
      ...cost === undefined ? {} : { cost },
    })
  }

  const today = localDay(now)
  const monthPrefix = today.slice(0, 7)
  const todayTotals = emptyTotals()
  const monthTotals = emptyTotals()
  const allTimeTotals = emptyTotals()
  const todayCost = new QuotaCostAccumulator(prices)
  const monthCost = new QuotaCostAccumulator(prices)
  const allTimeCost = new QuotaCostAccumulator(prices)

  const days: QuotaDayUsage[] = []
  for (const day of [...byDay.values()].sort((left, right) => left.date.localeCompare(right.date))) {
    const dayTotals = emptyTotals()
    const dayCost = new QuotaCostAccumulator(prices)
    const models: QuotaModelUsage[] = []
    for (const row of day.models.values()) {
      const counts: QuotaFoldCounts = row
      addCounts(dayTotals, counts)
      addCounts(allTimeTotals, counts)
      allTimeCost.add(row.provider, row.model, day.date, row.calls, counts)
      dayCost.add(row.provider, row.model, day.date, row.calls, counts)
      if (day.date === today) {
        addCounts(todayTotals, counts)
        todayCost.add(row.provider, row.model, day.date, row.calls, counts)
      }
      if (day.date.startsWith(monthPrefix)) {
        addCounts(monthTotals, counts)
        monthCost.add(row.provider, row.model, day.date, row.calls, counts)
      }
      const rowCost = new QuotaCostAccumulator(prices)
      rowCost.add(row.provider, row.model, day.date, row.calls, counts)
      const cost = rowCost.view()

      // The same counters fan out into the route view the panel breaks its
      // totals down by; one pass, so the two never disagree.
      const provider = byProvider.get(row.provider) ?? emptyProvider(row.provider, prices)
      byProvider.set(row.provider, provider)
      addToScope(provider.all, row.provider, row.model, day.date, counts)
      provider.models.add(row.model)
      if (day.date > provider.lastDay) provider.lastDay = day.date
      if (day.date === today) addToScope(provider.today, row.provider, row.model, day.date, counts)
      if (day.date.startsWith(monthPrefix)) {
        addToScope(provider.month, row.provider, row.model, day.date, counts)
      }

      models.push({
        provider: row.provider,
        model: row.model,
        calls: row.calls,
        inputTokens: row.inputTokens,
        outputTokens: row.outputTokens,
        cacheReadTokens: row.cacheReadTokens,
        cacheWriteTokens: row.cacheWriteTokens,
        totalTokens: row.inputTokens + row.outputTokens + row.cacheReadTokens + row.cacheWriteTokens,
        ...cost === undefined ? {} : { cost },
      })
    }
    models.sort((left, right) => right.totalTokens - left.totalTokens)
    const cost = dayCost.view()
    days.push({
      date: day.date,
      calls: day.calls,
      ...dayTotals,
      ...cost === undefined ? {} : { cost },
      models: Object.freeze(models),
    })
  }

  sessions.sort((left, right) => right.lastActiveAt - left.lastActiveAt || right.totalTokens - left.totalTokens)
  const providers: QuotaProviderUsage[] = []
  for (const entry of byProvider.values()) {
    const all = scopeFigures(entry.all)
    const todayFigures = scopeFigures(entry.today)
    const monthFigures = scopeFigures(entry.month)
    providers.push({
      provider: entry.provider,
      calls: all.calls,
      ...entry.all.totals,
      ...all.cacheHitPercent === undefined ? {} : { cacheHitPercent: all.cacheHitPercent },
      ...all.cost === undefined ? {} : { cost: all.cost },
      todayCalls: todayFigures.calls,
      todayTokens: todayFigures.tokens,
      ...todayFigures.cacheHitPercent === undefined ? {} : { todayCacheHitPercent: todayFigures.cacheHitPercent },
      ...todayFigures.cost === undefined ? {} : { todayCost: todayFigures.cost },
      monthCalls: monthFigures.calls,
      monthTokens: monthFigures.tokens,
      ...monthFigures.cacheHitPercent === undefined ? {} : { monthCacheHitPercent: monthFigures.cacheHitPercent },
      ...monthFigures.cost === undefined ? {} : { monthCost: monthFigures.cost },
      models: entry.models.size,
      lastDay: entry.lastDay,
    })
  }
  providers.sort((left, right) => right.totalTokens - left.totalTokens
    || right.calls - left.calls
    || left.provider.localeCompare(right.provider))
  const hitPercent = cacheHitPercent(todayTotals)
  const today$ = todayCost.view()
  const month$ = monthCost.view()
  const allTime$ = allTimeCost.view()
  return {
    today,
    todayTotals,
    monthTotals,
    allTimeTotals,
    ...hitPercent === undefined ? {} : { todayCacheHitPercent: hitPercent },
    ...today$ === undefined ? {} : { todayCost: today$ },
    ...month$ === undefined ? {} : { monthCost: month$ },
    ...allTime$ === undefined ? {} : { allTimeCost: allTime$ },
    ...budgetsOf(budgets, prices, today$, month$),
    providers: Object.freeze(providers),
    days: Object.freeze(days),
    sessions: Object.freeze(sessions),
    sessionCount,
    foldedAt,
    folding,
  }
}

/**
 * The budget section, present only when a ceiling is configured.
 *
 * Ceilings are denominated in the price table's own currency, so the section
 * carries that currency rather than one of its own.
 */
function budgetsOf(
  budgets: QuotaBudgetConfig | undefined,
  prices: QuotaPriceTable | undefined,
  todayCost: QuotaCostView | undefined,
  monthCost: QuotaCostView | undefined,
): { budgets?: QuotaBudgetView } {
  if (budgets === undefined || prices === undefined) return {}
  const daily = budgetWindow(budgets.daily, todayCost, budgets)
  const monthly = budgetWindow(budgets.monthly, monthCost, budgets)
  if (daily === undefined && monthly === undefined) return {}
  return {
    budgets: {
      currency: prices.currency,
      ...daily === undefined ? {} : { daily },
      ...monthly === undefined ? {} : { monthly },
    },
  }
}

/**
 * An empty report, served before the first fold completes.
 * @param now - current epoch milliseconds.
 * @param folding - whether the first fold round is already running.
 * @returns a report with zeroed totals and no days.
 */
export function emptyUsageReport(now: number, folding: boolean): QuotaUsageReport {
  return buildUsageReport([], { now, foldedAt: 0, folding })
}
