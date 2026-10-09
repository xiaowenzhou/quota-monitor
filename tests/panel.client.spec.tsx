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
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
    cacheHitPercent: 64.5,
    models: 1,
    lastDay: '2026-03-15',
    cost: { amount: 30, currency: 'CNY', unpricedCalls: 2 },
    todayCost: { amount: 1.25, currency: 'CNY', unpricedCalls: 0 },
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

  it('lists the sessions that spent the tokens, by id and route', async () => {
    render(<UsagePanel {...props(api())} />)

    expect(await screen.findByText('session-a')).toBeTruthy()
    expect(screen.getByText('deepseek · deepseek-chat')).toBeTruthy()
  })

  it('breaks the token totals down by provider route', async () => {
    const usage: QuotaUsageReport = {
      ...USAGE,
      providers: [
        {
          provider: 'deepseek',
          calls: 40,
          inputTokens: 300,
          outputTokens: 200,
          cacheReadTokens: 100,
          cacheWriteTokens: 0,
          totalTokens: 600,
          todayCalls: 5,
          todayTokens: 120,
          cacheHitPercent: 25,
          models: 3,
          lastDay: '2026-03-15',
          cost: { amount: 4.5, currency: 'USD', unpricedCalls: 1 },
        },
        {
          provider: 'pro',
          calls: 10,
          inputTokens: 100,
          outputTokens: 100,
          cacheReadTokens: 200,
          cacheWriteTokens: 0,
          totalTokens: 400,
          todayCalls: 0,
          todayTokens: 0,
          models: 2,
          lastDay: '2026-03-14',
        },
      ],
      allTimeTotals: { ...TOTALS, totalTokens: 1_000 },
    }
    render(<UsagePanel {...props(api({ getUsage: () => Promise.resolve(ok(usage)) }))} />)

    const heading = await screen.findByText('Usage by provider')
    const section = heading.closest('section')
    expect(section).toBeTruthy()
    const rows = within(section as HTMLElement)

    // The route the snapshot names is labelled with its name and its key; a
    // route the snapshot does not know falls back to the key alone.
    expect(rows.getByText('DeepSeek')).toBeTruthy()
    expect(rows.getByText('deepseek')).toBeTruthy()
    expect(rows.getByText('pro')).toBeTruthy()
    // Each row states its own tokens and its share of every folded token.
    expect(rows.getByText('600')).toBeTruthy()
    expect(rows.getByText('60.0% of all tokens')).toBeTruthy()
    expect(rows.getByText('400')).toBeTruthy()
    expect(rows.getByText('40.0% of all tokens')).toBeTruthy()
    // Calls, model count, today's tokens, cache share, and last day are per route.
    expect(rows.getByText('40 calls · 3 models · Today 120 · Cache hit 25.0% · Last 2026-03-15')).toBeTruthy()
    expect(rows.getByText('10 calls · 2 models · Today 0 · Last 2026-03-14')).toBeTruthy()
    // Only the priced route states an amount.
    expect(rows.getByText('4.5 USD')).toBeTruthy()
    expect(rows.queryByText(/ CNY$/u)).toBeNull()
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
    render(<UsagePanel {...props(api({ getSnapshot: () => Promise.resolve(ok(empty)) }))} />)

    expect(await screen.findByText('No provider is configured yet')).toBeTruthy()
  })

  it('opens one day\'s breakdown when its calendar cell is selected', async () => {
    render(<UsagePanel {...props(api())} />)

    expect(await screen.findByText('Select a day in the calendar above to see its breakdown')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^2026-03-15:/u }))

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
    // The card the reader is looking at must reflect the entry, so both reads re-run.
    await waitFor(() => { expect(getSnapshot).toHaveBeenCalledTimes(2) })
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
    await waitFor(() => { expect(getUsage).toHaveBeenLastCalledWith({ refresh: true }) })

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
    await waitFor(() => { expect(getUsage).toHaveBeenCalledTimes(2) })
    expect(screen.getByText('session-a')).toBeTruthy()
  })

  it('offers only the three export kinds the Host can build', async () => {
    render(<UsagePanel {...props(api())} />)

    expect(await screen.findByRole('button', { name: 'Daily CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sessions CSV' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Full report JSON' })).toBeTruthy()
  })
})
