// @vitest-environment jsdom

/**
 * The usage panel's browser behavior.
 *
 * Every case drives the panel through its `ctx.remote.quotaMonitor` face, so
 * the assertions are about what a reader sees and which Remote method a gesture
 * reaches — the panel derives no figure of its own, and a rejected Remote
 * result must leave the last good view standing rather than blanking the panel.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate, RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/index.ts'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  QuotaAccount,
  QuotaExportDocument,
  QuotaSnapshot,
  QuotaUsageReport,
} from '../src/types.ts'
import type { QuotaMonitorApi, UsagePanelProps } from '../src/client/UsagePanel.tsx'
import { UsagePanel } from '../src/client/UsagePanel.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const TOTALS = {
  inputTokens: 1_000,
  outputTokens: 500,
  cacheReadTokens: 2_000,
  cacheWriteTokens: 100,
  totalTokens: 3_600,
}

const ACCOUNT: QuotaAccount = {
  id: 'deepseek',
  name: 'DeepSeek',
  mode: 'balance',
  status: 'ok',
  adapter: 'deepseek-balance',
  fetchedAt: Date.parse('2026-03-15T12:00:00Z'),
  remaining: 42.5,
  used: 7.5,
  limit: 50,
  currency: 'CNY',
  warning: 'normal',
  planWindows: [{ kind: 'daily', percentUsed: 25, resetAt: '2026-03-16T00:00:00Z' }],
  budgetPools: [{ name: 'Shared', remaining: 10, limit: 20, percentUsed: 50 }],
}

/** An account with no readable endpoint, which is when the manual fallback is offered. */
const MANUAL_ACCOUNT: QuotaAccount = {
  id: 'deepseek',
  name: 'DeepSeek',
  mode: 'unsupported',
  status: 'unsupported',
  adapter: 'deepseek-balance',
  fetchedAt: Date.parse('2026-03-15T12:00:00Z'),
  reason: 'this provider publishes no account endpoint',
}

const SNAPSHOT: QuotaSnapshot = {
  capturedAt: Date.parse('2026-03-15T12:00:00Z'),
  providers: [{
    id: 'deepseek',
    name: 'DeepSeek',
    mode: 'balance',
    adapter: 'deepseek-balance',
    status: 'ok',
    warning: 'normal',
    credentialRefs: ['DEEPSEEK_API_KEY'],
    accounts: [],
  }],
  rows: [{
    id: 'deepseek',
    name: 'DeepSeek',
    calls: 12,
    inputTokens: 1_000,
    outputTokens: 500,
    cacheReadTokens: 2_000,
    cacheWriteTokens: 100,
    reasoningTokens: 0,
    totalTokens: 3_600,
    errorCount: 0,
    lastCallAt: Date.parse('2026-03-15T11:00:00Z'),
    lastModel: 'deepseek-chat',
    balance: null,
  }],
  balances: {},
  aggregate: { calls: 12, inputTokens: 1_000, outputTokens: 500, totalTokens: 3_600 },
}

/** The snapshot of a route whose only allowance is the one the reader entered. */
const MANUAL_SNAPSHOT: QuotaSnapshot = {
  ...SNAPSHOT,
  providers: [{ ...SNAPSHOT.providers[0]!, mode: 'unsupported', status: 'unsupported' }],
  rows: [{
    ...SNAPSHOT.rows[0]!,
    balance: { total: 10, spent: 1, remaining: 9, pct: 10 },
  }],
}

const USAGE: QuotaUsageReport = {
  today: '2026-03-15',
  todayTotals: TOTALS,
  monthTotals: TOTALS,
  allTimeTotals: TOTALS,
  todayCost: { amount: 1.25, currency: 'CNY', unpricedCalls: 0 },
  monthCost: { amount: 9, currency: 'CNY', unpricedCalls: 2 },
  allTimeCost: { amount: 30, currency: 'CNY', unpricedCalls: 2 },
  budgets: {
    currency: 'CNY',
    daily: { limit: 10, spent: 1.25, percentUsed: 12.5, status: 'normal', unpricedCalls: 0 },
    monthly: { limit: 100, spent: 9, percentUsed: 9, status: 'unknown', unpricedCalls: 2 },
  },
  todayCacheHitPercent: 64.5,
  providers: [{
    provider: 'deepseek',
    calls: 12,
    ...TOTALS,
    todayCalls: 12,
    todayTokens: TOTALS.totalTokens,
    todayCacheHitPercent: 64.5,
    monthCalls: 12,
    monthTokens: TOTALS.totalTokens,
    monthCacheHitPercent: 64.5,
    cacheHitPercent: 64.5,
    models: 1,
    lastDay: '2026-03-15',
    cost: { amount: 30, currency: 'CNY', unpricedCalls: 2 },
    todayCost: { amount: 1.25, currency: 'CNY', unpricedCalls: 0 },
    monthCost: { amount: 9, currency: 'CNY', unpricedCalls: 2 },
  }],
  days: [{
    date: '2026-03-15',
    calls: 12,
    ...TOTALS,
    models: [{ provider: 'deepseek', model: 'deepseek-chat', calls: 12, ...TOTALS }],
    cost: { amount: 1.25, currency: 'CNY', unpricedCalls: 0 },
  }],
  sessions: [{
    id: 'session-a',
    calls: 12,
    ...TOTALS,
    routes: ['deepseek · deepseek-chat'],
    lastActiveAt: Date.parse('2026-03-15T11:00:00Z'),
  }],
  sessionCount: 1,
  foldedAt: Date.parse('2026-03-15T12:00:00Z'),
  folding: false,
}

const EXPORT: QuotaExportDocument = {
  kind: 'daily-csv',
  filename: 'quota-daily-2026-03-15.csv',
  mediaType: 'text/csv',
  content: 'date,tokens\n2026-03-15,3600\n',
}

/** A Remote answer the panel can read. */
function ok<T>(value: T): RemoteResult<T> {
  return { ok: true, value }
}

/** A Remote answer carrying a transport failure rather than a business result. */
function failed<T>(): RemoteResult<T> {
  return { ok: false, error: new RemoteError('gateway/internal', 'unavailable', {}) }
}

/** The Remote face with every method stubbed, so one case overrides only what it asserts. */
function api(overrides: Partial<QuotaMonitorApi> = {}): QuotaMonitorApi {
  return {
    getSnapshot: () => Promise.resolve(ok(SNAPSHOT)),
    // Opening the panel is served by its own round trip, so a case that serves
    // a snapshot of its own states it for that call too.
    readPendingAccounts: () => Promise.resolve(ok(SNAPSHOT)),
    refreshAccounts: () => Promise.resolve(ok(SNAPSHOT)),
    getAccount: () => Promise.resolve(ok(ACCOUNT)),
    getUsage: () => Promise.resolve(ok(USAGE)),
    exportUsage: () => Promise.resolve(ok(EXPORT)),
    setBalances: () => Promise.resolve(ok({ deepseek: 80 })),
    resetStats: () => Promise.resolve(ok(SNAPSHOT)),
    ...overrides,
  }
}

/** Panel props: the locale seat and the injected Remote face are all it reads. */
function props(quota: QuotaMonitorApi): UsagePanelProps {
  return { t: makeTranslate(en, commonEn), quota } as unknown as UsagePanelProps
}

/**
 * The panel's own refresh control.
 *
 * The account card carries a refresh button too, so the header is the one that
 * folds usage again and the card's re-reads only its own route.
 * @param container - the rendered panel.
 * @returns the header refresh button.
 */
function headerRefresh(container: HTMLElement): HTMLElement {
  const header = container.querySelector('header')
  if (header === null) throw new Error('panel rendered no header')
  return within(header).getByRole('button', { name: 'Refresh' })
}

/**
 * Match an element by the text inside it, when sibling values split the line.
 * @param tag - the element name to match.
 * @param text - the text the element must carry.
 * @returns a matcher for the query helpers.
 */
function elementCarrying(tag: string, text: string): (content: string, element: Element | null) => boolean {
  return (_content, element) => element?.tagName === tag && (element.textContent?.includes(text) ?? false)
}

describe('quota monitor usage panel', () => {
  it('follows provider topology updates, reconciles selected keys and keeps history separate', async () => {
    let latest = SNAPSHOT
    let invalidate = () => {}
    const unsubscribe = vi.fn()
    const subscribeProviders = vi.fn((listener: () => void) => {
      invalidate = listener
      return unsubscribe
    })
    const getAccount = vi.fn(async (request: { provider: string; credentialRef?: string }) => ok({
      ...ACCOUNT, id: request.provider, credentialRef: request.credentialRef, remaining: request.provider === 'deepseek' ? 42.5 : 17,
    }))
    const getSnapshot = vi.fn(async () => ok(latest))
    const getUsage = vi.fn(async () => ok(USAGE))
    const { unmount } = render(<UsagePanel {...props(api({ getSnapshot, getAccount, getUsage }))} subscribeProviders={subscribeProviders} />)
    expect(await screen.findByText('42.5 CNY')).toBeTruthy()
    latest = { ...SNAPSHOT, providers: [{ ...SNAPSHOT.providers[0]!, id: 'added', name: 'Added', credentialRefs: ['ADDED_KEY'] }] }
    act(() => invalidate())
    expect(await screen.findByRole('button', { name: 'Added', exact: true })).toBeTruthy()
    await waitFor(() => expect(getAccount).toHaveBeenLastCalledWith({ provider: 'added', credentialRef: 'ADDED_KEY', refresh: false }))
    expect(screen.queryByRole('button', { name: 'DeepSeek', exact: true })).toBeNull()
    expect(await screen.findByText('17 CNY')).toBeTruthy()
    // The removed provider remains only in the historic comparison, visibly labelled.
    expect(await screen.findByText('Historical provider')).toBeTruthy()
    latest = { ...latest, providers: [{ ...latest.providers[0]!, name: 'Renamed', credentialRefs: ['REPLACED_KEY'] }] }
    act(() => invalidate())
    expect(await screen.findByRole('button', { name: 'Renamed', exact: true })).toBeTruthy()
    await waitFor(() => expect(getAccount).toHaveBeenLastCalledWith({ provider: 'added', credentialRef: 'REPLACED_KEY', refresh: false }))
    latest = { ...latest, providers: [] }
    act(() => invalidate())
    expect(await screen.findByText('No provider is configured yet')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('17 CNY')).toBeNull())
    await waitFor(() => expect(getUsage).toHaveBeenCalledWith({ refresh: false }))
    unmount()
    expect(unsubscribe).toHaveBeenCalledOnce()
  })

  it('renders the account figure, the token totals, and the derived budgets', async () => {
    render(<UsagePanel {...props(api())} />)

    // The card's figures come from getAccount, not from the snapshot's own row.
    expect(await screen.findByText('42.5 CNY')).toBeTruthy()
    // Source and update time share one paragraph, so the match is on its text.
    expect(await screen.findByText(elementCarrying('P', 'Source: deepseek-balance'))).toBeTruthy()
    // Two rows carry 1.25 CNY: today's total and the selected account's own spend.
    expect(screen.getAllByText('1.25 CNY').length).toBeGreaterThan(0)
    // The totals line and the budget lines each carry siblings in one element.
    expect(await screen.findByText(elementCarrying('P', "Today's cache hit rate 64.5%"))).toBeTruthy()
    expect(screen.getByText('25% used')).toBeTruthy()
    expect(await screen.findByText(elementCarrying('SPAN', 'On track · 12.5%'))).toBeTruthy()
    expect(screen.getByText(elementCarrying('SPAN', 'Cost incomplete'))).toBeTruthy()
  })

  it('shows model counters by range with partial estimates and configured rates', async () => {
    const usage: QuotaUsageReport = {
      ...USAGE,
      models: [{
        provider: 'deepseek', model: 'deepseek-chat',
        all: { ...TOTALS, calls: 99, cost: { amount: 9, currency: 'USD', unpricedCalls: 2 }, cacheHitPercent: 60 },
        today: { ...TOTALS, inputTokens: 123, calls: 3, cacheHitPercent: 20 },
        month: { ...TOTALS, calls: 12, cost: { amount: 4, currency: 'USD', unpricedCalls: 1 }, cacheHitPercent: 40 },
        rate: { currency: 'USD', inputPerMillion: 1.5, outputPerMillion: 6,
          cacheReadPerMillion: 0.15, cacheWritePerMillion: 0, from: '2026-03-01' },
      }, {
        provider: 'deepseek', model: 'unpriced-model',
        all: { ...TOTALS, calls: 1 }, today: { ...TOTALS, calls: 1 }, month: { ...TOTALS, calls: 1 },
      }],
    }
    render(<UsagePanel {...props(api({ getUsage: () => Promise.resolve(ok(usage)) }))} />)
    const heading = await screen.findByText('Usage by model')
    const section = within(heading.closest('section') as HTMLElement)
    const model = await section.findByRole('rowheader', { name: 'deepseek-chat' })
    const row = within(model.closest('tr') as HTMLElement)
    expect(row.getByText('DeepSeek')).toBeTruthy()
    expect(row.getByText('deepseek')).toBeTruthy()
    expect(row.getByText('12')).toBeTruthy()
    expect(row.getByText('1,000')).toBeTruthy()
    expect(row.getByText('500')).toBeTruthy()
    expect(row.getByText('2,000')).toBeTruthy()
    expect(row.getByText('100')).toBeTruthy()
    expect(row.getByText('40.0%')).toBeTruthy()
    expect(row.getByText('4 USD')).toBeTruthy()
    expect(row.getByText('1 more calls have no configured price')).toBeTruthy()
    expect(row.getByText('Input 1.5 USD')).toBeTruthy()
    expect(row.getByText('Output 6 USD')).toBeTruthy()
    expect(row.getByText('Cache read 0.15 USD')).toBeTruthy()
    expect(row.getByText('Cache write 0 USD')).toBeTruthy()
    expect(row.getByText('Effective 2026-03-01')).toBeTruthy()
    expect(section.getByText('Current configured rates / 1M tokens')).toBeTruthy()
    expect(section.getByText(/Costs are estimates from configured prices/u)).toBeTruthy()
    expect(section.getByText('No configured rates')).toBeTruthy()
    expect(section.getByText('Unpriced')).toBeTruthy()

    fireEvent.click(section.getByRole('button', { name: 'Today' }))
    expect(row.getByText('123')).toBeTruthy()
    expect(row.getByText('3')).toBeTruthy()
    expect(row.getByText('20.0%')).toBeTruthy()
    expect(row.getByText('Unpriced')).toBeTruthy()
    fireEvent.click(section.getByRole('button', { name: 'All time' }))
    expect(row.getByText('99')).toBeTruthy()
    expect(row.getByText('9 USD')).toBeTruthy()
    expect(row.getByText('2 more calls have no configured price')).toBeTruthy()
  })

  it('reads comparison totals only after the refreshed fold completes', async () => {
    let release: ((result: RemoteResult<QuotaUsageReport>) => void) | undefined
    const pending = new Promise<RemoteResult<QuotaUsageReport>>((resolve) => { release = resolve })
    let folded = false
    const fresh: QuotaUsageReport = {
      ...USAGE,
      providers: [{ ...USAGE.providers[0]!, monthTokens: 987 }],
    }
    const getUsage = vi.fn((request: { refresh?: boolean }) => {
      if (request.refresh) return pending.then((result) => { folded = true; return result })
      return Promise.resolve(ok(folded ? fresh : USAGE))
    })
    const { container } = render(<UsagePanel {...props(api({ getUsage }))} />)
    const section = within((await screen.findByText('Usage by provider')).closest('section') as HTMLElement)
    await section.findByText('3.6k')
    getUsage.mockClear()
    fireEvent.click(headerRefresh(container))
    await waitFor(() => { expect(getUsage).toHaveBeenCalledTimes(1) })
    expect(getUsage).toHaveBeenCalledWith({ refresh: true, provider: 'deepseek' })
    release?.(ok(fresh))
    await section.findByText('987')
    expect(getUsage).toHaveBeenNthCalledWith(2, {})
  })

  it('ignores an earlier provider response after a new route has loaded', async () => {
    let releaseUsage: ((result: RemoteResult<QuotaUsageReport>) => void) | undefined
    let releaseAccount: ((result: RemoteResult<QuotaAccount>) => void) | undefined
    const pendingUsage = new Promise<RemoteResult<QuotaUsageReport>>((resolve) => { releaseUsage = resolve })
    const pendingAccount = new Promise<RemoteResult<QuotaAccount>>((resolve) => { releaseAccount = resolve })
    const snapshot: QuotaSnapshot = { ...SNAPSHOT, providers: [
      ...SNAPSHOT.providers, { ...SNAPSHOT.providers[0]!, id: 'pro', name: 'Pro' },
    ] }
    const proUsage: QuotaUsageReport = { ...USAGE, sessions: [{ ...USAGE.sessions[0]!, id: 'pro-session' }] }
    const getUsage = vi.fn((request: { provider?: string }) => request.provider === 'deepseek'
      ? pendingUsage : Promise.resolve(ok(proUsage)))
    render(<UsagePanel {...props(api({
      getSnapshot: () => Promise.resolve(ok(snapshot)),
      readPendingAccounts: () => Promise.resolve(ok(snapshot)),
      refreshAccounts: () => Promise.resolve(ok(snapshot)),
      getUsage,
      getAccount: request => request.provider === 'deepseek' ? pendingAccount
        : Promise.resolve(ok({ ...ACCOUNT, id: 'pro', name: 'Pro', remaining: 88 })),
    }))} />)
    await waitFor(() => { expect(getUsage).toHaveBeenCalledWith({ provider: 'deepseek', refresh: false }) })
    fireEvent.click(await screen.findByRole('button', { name: 'Pro' }))
    await screen.findByText('pro-session')
    expect(screen.getByText('88 CNY')).toBeTruthy()
    await act(async () => {
      releaseUsage?.(ok(USAGE))
      releaseAccount?.(ok(ACCOUNT))
    })
    await waitFor(() => { expect(screen.getByText('pro-session')).toBeTruthy() })
    expect(screen.queryByText('session-a')).toBeNull()
    expect(screen.queryByText('42.5 CNY')).toBeNull()
  })

  it('lists the sessions that spent the tokens, by id and route', async () => {
    render(<UsagePanel {...props(api())} />)

    expect(await screen.findByText('session-a')).toBeTruthy()
    expect(screen.getByText('deepseek · deepseek-chat')).toBeTruthy()
  })

  it('breaks the token totals down by provider route and range', async () => {
    const usage: QuotaUsageReport = {
      ...USAGE,
      todayTotals: { ...TOTALS, totalTokens: 400 },
      monthTotals: { ...TOTALS, totalTokens: 800 },
      providers: [
        {
          provider: 'deepseek',
          calls: 40,
          inputTokens: 300,
          outputTokens: 200,
          cacheReadTokens: 100,
          cacheWriteTokens: 0,
          totalTokens: 600,
          cacheHitPercent: 30,
          cost: { amount: 4.5, currency: 'USD', unpricedCalls: 1 },
          todayCalls: 5,
          todayTokens: 120,
          todayCacheHitPercent: 40,
          todayCost: { amount: 1.25, currency: 'USD', unpricedCalls: 0 },
          monthCalls: 30,
          monthTokens: 500,
          monthCacheHitPercent: 25,
          monthCost: { amount: 4, currency: 'USD', unpricedCalls: 1 },
          models: 3,
          lastDay: '2026-03-15',
        },
        {
          provider: 'pro',
          calls: 10,
          inputTokens: 100,
          outputTokens: 100,
          cacheReadTokens: 200,
          cacheWriteTokens: 0,
          totalTokens: 400,
          cacheHitPercent: 50,
          todayCalls: 20,
          todayTokens: 300,
          todayCacheHitPercent: 55,
          monthCalls: 8,
          monthTokens: 300,
          monthCacheHitPercent: 60,
          models: 2,
          lastDay: '2026-03-14',
        },
      ],
      allTimeTotals: { ...TOTALS, totalTokens: 1_000 },
    }
    render(<UsagePanel {...props(api({ getUsage: () => Promise.resolve(ok(usage)) }))} />)

    const heading = await screen.findByText('Usage by provider')
    const section = heading.closest('section') as HTMLElement
    expect(section).toBeTruthy()
    const rows = within(section)

    // Collapsed, the section describes the route the panel is scoped to, which
    // is the first provider the snapshot listed.
    expect(await rows.findByText('DeepSeek')).toBeTruthy()
    expect(rows.getByText('deepseek')).toBeTruthy()
    expect(rows.queryByText('pro')).toBeNull()

    // This month is the range a deployment watches day to day, so it leads.
    expect(rows.getByText('500')).toBeTruthy()
    expect(rows.getByText('62.5% of this month')).toBeTruthy()
    expect(rows.getByText('30 calls · 3 models · Cache hit 25.0% · Last 2026-03-15')).toBeTruthy()
    expect(rows.getByText('4 USD')).toBeTruthy()

    // The whole list is one click away, and it compares the routes.
    fireEvent.click(rows.getByRole('button', { name: 'All 2' }))
    expect(await rows.findByText('pro')).toBeTruthy()
    expect(rows.getByText('300')).toBeTruthy()
    expect(rows.getByText('37.5% of this month')).toBeTruthy()

    // All time restates the same routes over every folded day.
    fireEvent.click(rows.getByRole('button', { name: 'All time' }))
    expect(await rows.findByText('600')).toBeTruthy()
    expect(rows.getByText('60.0% of all tokens')).toBeTruthy()
    expect(rows.getByText('4.5 USD')).toBeTruthy()

    // Today re-scopes the figures and re-orders them: pro spent more of today.
    fireEvent.click(rows.getByRole('button', { name: 'Today' }))
    expect(await rows.findByText('75.0% of today')).toBeTruthy()
    expect(rows.getByText('30.0% of today')).toBeTruthy()
    expect(rows.getByText('5 calls · 3 models · Cache hit 40.0% · Last 2026-03-15')).toBeTruthy()
    expect(rows.getByText('1.25 USD')).toBeTruthy()
    const text = section.textContent ?? ''
    expect(text.indexOf('pro')).toBeLessThan(text.indexOf('DeepSeek'))
  })

  it('scopes the statistics to the route the reader selects', async () => {
    const twoProviders: QuotaSnapshot = {
      ...SNAPSHOT,
      providers: [
        ...SNAPSHOT.providers,
        {
          id: 'pro',
          name: 'Pro',
          mode: 'balance',
          adapter: 'sub2api',
          status: 'ok',
          warning: 'normal',
          credentialRefs: ['PRO_API_KEY'],
          accounts: [],
        },
      ],
    }
    const scoped: Record<string, QuotaUsageReport> = {
      deepseek: { ...USAGE, allTimeTotals: { ...TOTALS, totalTokens: 600 } },
      pro: { ...USAGE, allTimeTotals: { ...TOTALS, totalTokens: 400 } },
    }
    const getUsage = vi.fn((request: { provider?: string }) =>
      Promise.resolve(ok(scoped[request.provider ?? 'deepseek'] ?? USAGE)))
    render(<UsagePanel {...props(api({
      getSnapshot: () => Promise.resolve(ok(twoProviders)),
      readPendingAccounts: () => Promise.resolve(ok(twoProviders)),
      refreshAccounts: () => Promise.resolve(ok(twoProviders)),
      getUsage,
    }))} />)

    // The selection the account card starts on scopes the statistics.
    expect(await screen.findByText('DeepSeek only')).toBeTruthy()
    expect(getUsage).toHaveBeenCalledWith({ refresh: false, provider: 'deepseek' })

    // The card's own selector re-scopes them, so both halves describe one route.
    fireEvent.click(await screen.findByRole('button', { name: 'Pro' }))
    expect(await screen.findByText('Pro only')).toBeTruthy()
    await waitFor(() => { expect(getUsage).toHaveBeenCalledWith({ refresh: false, provider: 'pro' }) })
  })

  it('leaves a route out of a range it did not spend in', async () => {
    const usage: QuotaUsageReport = {
      ...USAGE,
      providers: [
        { ...USAGE.providers[0]!, monthTokens: 500, monthCalls: 30 },
        {
          provider: 'pro',
          calls: 10,
          inputTokens: 100,
          outputTokens: 100,
          cacheReadTokens: 200,
          cacheWriteTokens: 0,
          totalTokens: 400,
          cacheHitPercent: 50,
          todayCalls: 0,
          todayTokens: 0,
          monthCalls: 0,
          monthTokens: 0,
          models: 2,
          lastDay: '2026-03-14',
        },
      ],
    }
    render(<UsagePanel {...props(api({ getUsage: () => Promise.resolve(ok(usage)) }))} />)

    const heading = await screen.findByText('Usage by provider')
    const rows = within(heading.closest('section') as HTMLElement)

    // This month is the default range, and pro spent nothing in it: the row is
    // replaced by a note rather than shown with old figures beside it.
    expect(await rows.findByText('500')).toBeTruthy()
    expect(rows.queryByText('pro')).toBeNull()
    expect(rows.getByText('1 more routes have no usage in this range')).toBeTruthy()

    // The route is still a route: its all-time figures appear with that range.
    fireEvent.click(rows.getByRole('button', { name: 'All 2' }))
    fireEvent.click(rows.getByRole('button', { name: 'All time' }))
    expect(await rows.findByText('pro')).toBeTruthy()
    expect(rows.getByText('400')).toBeTruthy()
    expect(rows.queryByText('1 more routes have no usage in this range')).toBeNull()
  })

  it('shows the usage the gateway reported for the account credential', async () => {
    const account: QuotaAccount = {
      ...ACCOUNT,
      usage: [
        { kind: 'day', label: '2026-03-15', requests: 12, totalTokens: 1_620_000, cost: 4.61, currency: 'USD' },
        { kind: 'model', label: 'claude-opus-5', requests: 12, inputTokens: 24, outputTokens: 29_894 },
        { kind: 'pool', label: 'team-b', totalTokens: 5_000 },
      ],
    }
    const { container } = render(<UsagePanel {...props(api({
      getAccount: () => Promise.resolve(ok(account)),
    }))} />)

    expect(await screen.findByText('Account usage (reported by the gateway)')).toBeTruthy()
    const text = container.textContent ?? ''
    expect(text).toContain('By day')
    expect(text).toContain('By model')
    expect(text).toContain('By budget pool')
    expect(text).toContain('2026-03-15')
    expect(text).toContain('claude-opus-5')
    expect(text).toContain('team-b')
    // The day row states its own call count, token total, and the gateway's spend.
    expect(text).toContain('12 calls · 1.62M · 4.61 USD')
  })

  it('says so when no provider is configured instead of rendering an empty card', async () => {
    const empty: QuotaSnapshot = { ...SNAPSHOT, providers: [], rows: [] }
    render(<UsagePanel {...props(api({
      getSnapshot: () => Promise.resolve(ok(empty)),
      readPendingAccounts: () => Promise.resolve(ok(empty)),
      refreshAccounts: () => Promise.resolve(ok(empty)),
    }))} />)

    expect(await screen.findByText('No provider is configured yet')).toBeTruthy()
  })

  it('opens one day\'s breakdown when its calendar cell is selected', async () => {
    render(<UsagePanel {...props(api())} />)

    expect(await screen.findByText('Select a day in the calendar above to see its breakdown')).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: /^2026-03-15:/u }))

    expect(await screen.findByText('2026-03-15 breakdown')).toBeTruthy()
    expect(screen.getByText('deepseek-chat')).toBeTruthy()
  })

  it('moves the calendar by one month from either arrow', async () => {
    render(<UsagePanel {...props(api())} />)

    await screen.findByText('2026-03')
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(await screen.findByText('2026-02')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(await screen.findByText('2026-03')).toBeTruthy()
  })

  it('records a manual allowance and reloads the card against it', async () => {
    const setBalances = vi.fn(() => Promise.resolve(ok({ deepseek: 80 })))
    const getSnapshot = vi.fn(() => Promise.resolve(ok(MANUAL_SNAPSHOT)))
    const getAccount = vi.fn(() => Promise.resolve(ok(MANUAL_ACCOUNT)))
    render(<UsagePanel {...props(api({ setBalances, getSnapshot, getAccount }))} />)

    const input = await screen.findByLabelText('Manual balance')
    fireEvent.change(input, { target: { value: '80' } })
    fireEvent.blur(input)

    await waitFor(() => { expect(setBalances).toHaveBeenCalledWith({ balances: { deepseek: 80 } }) })
    // The card the reader is looking at must reflect the entry, so the snapshot
    // is re-read and the card re-read against it.
    await waitFor(() => { expect(getSnapshot).toHaveBeenCalledTimes(1) })
    await waitFor(() => { expect(getAccount).toHaveBeenCalledTimes(2) })
    expect(await screen.findByText('Manual remainder 9')).toBeTruthy()
  })

  it('asks the Host to fold again on refresh and shows the busy label while it runs', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    const getUsage = vi.fn()
      .mockResolvedValueOnce(ok(USAGE))
      .mockImplementation(() => gate.then(() => ok(USAGE)))
    const { container } = render(<UsagePanel {...props(api({ getUsage }))} />)

    await screen.findByText('session-a')
    fireEvent.click(headerRefresh(container))

    expect(await screen.findByText('Refreshing…')).toBeTruthy()
    await waitFor(() => {
      expect(getUsage).toHaveBeenCalledWith({ refresh: true, provider: 'deepseek' })
    })

    release?.()
    expect(await screen.findByRole('button', { name: 'Refresh' })).toBeTruthy()
  })

  it('resets the session counters through the Host and adopts the answer', async () => {
    const resetStats = vi.fn(() => Promise.resolve(ok({
      ...SNAPSHOT,
      aggregate: { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    })))
    render(<UsagePanel {...props(api({ resetStats }))} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Reset session stats' }))
    await waitFor(() => { expect(resetStats).toHaveBeenCalledWith({}) })
  })

  it('downloads the document the Host built for the requested export kind', async () => {
    const exportUsage = vi.fn(() => Promise.resolve(ok(EXPORT)))
    const createObjectURL = vi.fn(() => 'blob:quota')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    render(<UsagePanel {...props(api({ exportUsage }))} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Daily CSV' }))

    await waitFor(() => { expect(exportUsage).toHaveBeenCalledWith({ kind: 'daily-csv' }) })
    await waitFor(() => { expect(createObjectURL).toHaveBeenCalledTimes(1) })
    // The object URL pins the blob until it is released, so the download owns it.
    await waitFor(() => { expect(revokeObjectURL).toHaveBeenCalledWith('blob:quota') })
    expect(screen.getByText(/Exports carry usage and estimated cost only/u)).toBeTruthy()
  })

  it('reports a failed export instead of saving an empty file', async () => {
    render(<UsagePanel {...props(api({ exportUsage: () => Promise.resolve(failed<QuotaExportDocument>()) }))} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Sessions CSV' }))

    expect(await screen.findByText('Export failed')).toBeTruthy()
  })

  it('keeps the last good view when a Remote read fails', async () => {
    const getUsage = vi.fn()
      .mockResolvedValueOnce(ok(USAGE))
      .mockResolvedValue(failed<QuotaUsageReport>())
    const { container } = render(<UsagePanel {...props(api({ getUsage }))} />)

    await screen.findByText('session-a')
    fireEvent.click(headerRefresh(container))

    // The failed round leaves the previous report standing rather than blanking it.
    await waitFor(() => {
      expect(getUsage).toHaveBeenCalledWith({ refresh: true, provider: 'deepseek' })
    })
    expect(await screen.findByText('session-a')).toBeTruthy()
  })

  it('offers only the three export kinds the Host can build', async () => {
    render(<UsagePanel {...props(api())} />)

    expect(await screen.findByRole('button', { name: 'Daily CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sessions CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Full report JSON' })).toBeTruthy()
  })

  it('reads every monitored key on open and states each key figure in the selector', async () => {
    const keyA: QuotaAccount = { ...ACCOUNT, credentialRef: 'DEEPSEEK_KEY_A', remaining: 42.5 }
    const keyB: QuotaAccount = { ...ACCOUNT, credentialRef: 'DEEPSEEK_KEY_B', remaining: 7 }
    const twoKeys: QuotaSnapshot = { ...SNAPSHOT, providers: [{
      ...SNAPSHOT.providers[0]!,
      credentialRefs: ['DEEPSEEK_KEY_A', 'DEEPSEEK_KEY_B'],
      accounts: [keyA, keyB],
    }] }
    const readPendingAccounts = vi.fn(() => Promise.resolve(ok(twoKeys)))
    const getAccount = vi.fn((request: { credentialRef?: string }) => Promise.resolve(
      ok(request.credentialRef === 'DEEPSEEK_KEY_B' ? keyB : keyA),
    ))
    render(<UsagePanel {...props(api({ readPendingAccounts, getAccount }))} />)

    // Opening the panel is what reads the credentials no round had read yet.
    await waitFor(() => { expect(readPendingAccounts).toHaveBeenCalledTimes(1) })
    // Both keys state their own remainder, so the reader compares them without
    // switching the card back and forth.
    const chipA = await screen.findByRole('button', { name: /DEEPSEEK_KEY_A/u })
    const chipB = screen.getByRole('button', { name: /DEEPSEEK_KEY_B/u })
    expect(chipA.textContent).toContain('42.5 CNY')
    expect(chipB.textContent).toContain('7 CNY')
    // The route names the group its two chips belong to, so the pair reads as
    // the keys of one account rather than as two accounts.
    expect(chipA.closest('fieldset')).toBe(chipB.closest('fieldset'))
    expect(within(chipA.closest('fieldset')!).getByText('Provider keys (2)')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: 'DeepSeek' })).toHaveLength(1)

    fireEvent.click(chipB)
    await waitFor(() => {
      expect(getAccount).toHaveBeenCalledWith({
        provider: 'deepseek', credentialRef: 'DEEPSEEK_KEY_B', refresh: false,
      })
    })
    await waitFor(() => { expect(chipB.getAttribute('aria-pressed')).toBe('true') })
    expect(chipA.getAttribute('aria-pressed')).toBe('false')
  })

  it('marks the key a routing route is serving with', async () => {
    const keyA: QuotaAccount = { ...ACCOUNT, credentialRef: 'DEEPSEEK_KEY_A', remaining: 42.5 }
    const keyB: QuotaAccount = { ...ACCOUNT, credentialRef: 'DEEPSEEK_KEY_B', remaining: 7 }
    const routed: QuotaSnapshot = { ...SNAPSHOT, providers: [{
      ...SNAPSHOT.providers[0]!,
      credentialRefs: ['DEEPSEEK_KEY_A', 'DEEPSEEK_KEY_B'],
      activeCredentialRef: 'DEEPSEEK_KEY_B',
      accounts: [keyA, keyB],
    }] }
    render(<UsagePanel {...props(api({ readPendingAccounts: () => Promise.resolve(ok(routed)) }))} />)

    const chipA = await screen.findByRole('button', { name: /DEEPSEEK_KEY_A/u })
    const chipB = screen.getByRole('button', { name: /DEEPSEEK_KEY_B/u })
    // Every chip states its status dot; the key the next call spends carries one
    // marker more, so the reader can tell which key is in play.
    expect(within(chipA.parentElement!).getByRole('button', { name: 'Use this key' }).hasAttribute('disabled')).toBe(false)
    expect(within(chipB.parentElement!).getByRole('button', { name: 'Active key' }).hasAttribute('disabled')).toBe(true)
  })

  it('re-reads every key when the header refresh runs', async () => {
    const refreshed: QuotaSnapshot = { ...SNAPSHOT, providers: [{
      ...SNAPSHOT.providers[0]!,
      credentialRefs: ['DEEPSEEK_KEY_A', 'DEEPSEEK_KEY_B'],
      accounts: [{ ...ACCOUNT, credentialRef: 'DEEPSEEK_KEY_A', remaining: 3 }],
    }] }
    const refreshAccounts = vi.fn(() => Promise.resolve(ok(refreshed)))
    const { container } = render(<UsagePanel {...props(api({ refreshAccounts }))} />)

    // The card states the selected key's reading before the round.
    await screen.findByText('42.5 CNY')
    fireEvent.click(headerRefresh(container))

    await waitFor(() => { expect(refreshAccounts).toHaveBeenCalledTimes(1) })
    // The round's snapshot replaces the selector's figures with fresh ones.
    expect(await screen.findByText('3 CNY')).toBeTruthy()
  })
})
