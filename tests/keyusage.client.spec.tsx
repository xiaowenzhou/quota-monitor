// @vitest-environment jsdom

/**
 * The per-key usage page's browser behavior.
 *
 * Every case drives the page through its `ctx.remote.quotaMonitor` face, so the
 * assertions are about what a reader sees. The page derives no figure of its
 * own: a key's allowance, its token split and its series all come from the one
 * reading the host took with that key's own credential, and a key that answered
 * no usage must say so instead of drawing four zeros.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate, RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/index.ts'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  QuotaAccount,
  QuotaExportDocument,
  QuotaKeyPeriod,
  QuotaKeyTokens,
  QuotaKeyUsage,
  QuotaProviderEntry,
  QuotaSnapshot,
  QuotaUsageReport,
} from '../src/types.ts'
import type { QuotaMonitorApi } from '../src/client/UsagePanel.tsx'
import type { KeyUsagePanelProps } from '../src/client/KeyUsagePanel.tsx'
import { KeyUsagePanel } from '../src/client/KeyUsagePanel.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** The two monitored credentials of the route under test, as the keys are named. */
const NAMED_REF = 'QUOTA_KEY_516319de_3c61_4f8c_acca_f4fb4d3418db'
const BARE_REF = 'QUOTA_KEY_2a15739c_f89a_4aa5_bec8_5c08ab1fbfec'
/** A reference the user never labelled, which the card must still name. */
const UNLABELLED_REF = 'QUOTA_KEY_abcdef0123456789'

/** The token buckets the usage endpoint answered with over the 30-day window. */
const WINDOW: QuotaKeyTokens = {
  inputTokens: 650_297,
  outputTokens: 1_503_414,
  reasoningTokens: 4_086,
  cacheReadTokens: 622_721_402,
  cacheWriteTokens: 51_949_694,
  totalTokens: 676_824_807,
}

/** The billing period the account endpoint stated beside the balance. */
const PERIOD: QuotaKeyPeriod = {
  periodKey: '2026-10',
  startAt: '2026-10-01T00:00:00+08:00',
  endAt: '2026-11-01T00:00:00+08:00',
  updatedAt: Date.parse('2026-10-15T11:00:00Z'),
  used: 1.89,
  limit: 5000,
  remaining: 4998.11,
  percentUsed: 0.038,
  currency: 'CNY',
  inputTokens: 192_138,
  outputTokens: 6_418,
  reasoningTokens: 4_086,
  cacheReadTokens: 706_925,
  cacheWriteTokens: 0,
  totalTokens: 905_481,
  calls: 13,
  successCalls: 6,
  failedCalls: 7,
  streamCalls: 13,
}

const USAGE: QuotaKeyUsage = {
  days: 30,
  startDate: '2026-09-16',
  endDate: '2026-10-15',
  period: PERIOD,
  window: { ...WINDOW, calls: 2272, successCalls: 1912, failedCalls: 360, streamCalls: 2254 },
  models: [
    { model: 'gpt-5.6-sol', ...WINDOW, totalTokens: 400_000_000, calls: 1500 },
    { model: 'claude-sonnet-4.5', ...WINDOW, totalTokens: 276_824_807, calls: 772 },
  ],
  daily: [
    { date: '2026-10-14', ...WINDOW, totalTokens: 300_000_000, calls: 1000 },
    { date: '2026-10-15', ...WINDOW, totalTokens: 376_824_807, calls: 1272 },
  ],
  points: [
    { date: '2026-10-15', model: 'claude-sonnet-4.5', ...WINDOW, totalTokens: 376_824_807, calls: 1272 },
    { date: '2026-10-14', model: 'gpt-5.6-sol', ...WINDOW, totalTokens: 300_000_000, calls: 1000 },
  ],
}

/** A key the endpoint metered: allowance, token split and both series. */
const NAMED_ACCOUNT: QuotaAccount = {
  id: 'agentrouter-claude',
  name: 'AgentRouter Claude',
  mode: 'balance',
  status: 'ok',
  adapter: 'stepcode',
  credentialRef: NAMED_REF,
  fetchedAt: Date.parse('2026-10-15T11:00:00Z'),
  remaining: 4998.11,
  used: 1.89,
  limit: 5000,
  currency: 'CNY',
  warning: 'normal',
  budgetPools: [{ name: '二组', remaining: 4998.11, limit: 5000, percentUsed: 0.04 }],
  keyUsage: USAGE,
}

/** A key whose endpoint answered the balance but disclosed no token usage at all. */
const BARE_ACCOUNT: QuotaAccount = {
  id: 'agentrouter-claude',
  name: 'AgentRouter Claude',
  mode: 'balance',
  status: 'ok',
  adapter: 'stepcode',
  credentialRef: BARE_REF,
  fetchedAt: Date.parse('2026-10-15T11:00:00Z'),
  remaining: 4622.1,
  used: 377.9,
  limit: 5000,
  currency: 'CNY',
  warning: 'normal',
}

const ROUTE: QuotaProviderEntry = {
  id: 'agentrouter-claude',
  name: 'AgentRouter Claude',
  mode: 'balance',
  adapter: 'stepcode',
  status: 'ok',
  warning: 'normal',
  credentialRefs: [NAMED_REF, BARE_REF],
  activeCredentialRef: NAMED_REF,
  accounts: [NAMED_ACCOUNT, BARE_ACCOUNT],
  keyNames: { [NAMED_REF]: '罗经理', [BARE_REF]: '曾广历' },
}

/** A route that monitors no key at all, so it is never the page's opening subject. */
const PLAIN_ROUTE: QuotaProviderEntry = {
  id: 'deepseek-official',
  name: 'DeepSeek',
  mode: 'balance',
  adapter: 'deepseek-balance',
  status: 'ok',
  credentialRefs: [],
  accounts: [],
}

/** A route whose single credential carries no user label, only its own reference. */
const UNLABELLED_ROUTE: QuotaProviderEntry = {
  ...ROUTE,
  id: 'agentrouter-codex',
  name: 'AgentRouter Codex',
  credentialRefs: [UNLABELLED_REF],
  accounts: [],
  keyNames: {},
}

/** Two routes, so a case can assert the page opens on the one that monitors keys. */
const SNAPSHOT: QuotaSnapshot = {
  capturedAt: Date.parse('2026-10-15T11:00:00Z'),
  providers: [PLAIN_ROUTE, ROUTE],
  rows: [{
    id: 'agentrouter-claude',
    name: 'AgentRouter Claude',
    calls: 2272,
    inputTokens: 650_297,
    outputTokens: 1_503_414,
    cacheReadTokens: 622_721_402,
    cacheWriteTokens: 51_949_694,
    reasoningTokens: 4_086,
    totalTokens: 676_824_807,
    errorCount: 0,
    lastCallAt: Date.parse('2026-10-15T11:00:00Z'),
    lastModel: 'gpt-5.6-sol',
    balance: null,
  }, {
    id: 'deepseek-official',
    name: 'DeepSeek',
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    errorCount: 0,
    lastCallAt: 0,
    lastModel: '',
    balance: null,
  }],
  balances: {},
  aggregate: { calls: 2272, inputTokens: 650_297, outputTokens: 1_503_414, totalTokens: 676_824_807 },
}

/** The same route shape with a single unlabelled credential, and no reading yet. */
const UNLABELLED_SNAPSHOT: QuotaSnapshot = {
  ...SNAPSHOT,
  providers: [UNLABELLED_ROUTE],
  rows: [SNAPSHOT.rows[0]!],
}

/** A successful Remote answer. */
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
    // Opening the page is its own round trip, so it is the one the cases count.
    getSnapshot: () => Promise.resolve(ok(SNAPSHOT)),
    readPendingAccounts: () => Promise.resolve(ok(SNAPSHOT)),
    refreshAccounts: () => Promise.resolve(ok(SNAPSHOT)),
    manageKey: () => Promise.resolve(failed<QuotaSnapshot>()),
    getAccount: () => Promise.resolve(ok(NAMED_ACCOUNT)),
    getUsage: () => Promise.resolve(failed<QuotaUsageReport>()),
    exportUsage: () => Promise.resolve(failed<QuotaExportDocument>()),
    setBalances: () => Promise.resolve(ok({})),
    resetStats: () => Promise.resolve(ok(SNAPSHOT)),
    ...overrides,
  }
}

/** Page props: the locale seat and the injected Remote face are all it reads. */
function props(quota: QuotaMonitorApi): KeyUsagePanelProps {
  return { t: makeTranslate(en, commonEn), quota } as unknown as KeyUsagePanelProps
}

/** The page's own refresh control, which is the one that re-reads every key. */
function headerRefresh(container: HTMLElement): HTMLElement {
  const header = container.querySelector('header')
  if (header === null) throw new Error('the page rendered no header')
  return within(header).getByRole('button', { name: 'Refresh' })
}

/** The daily bar of one calendar day, which is the only clickable bar. */
function dayBar(container: HTMLElement, date: string): HTMLButtonElement {
  const bar = [...container.querySelectorAll<HTMLButtonElement>('button[title]')]
    .find(node => node.title.includes(date))
  if (bar === undefined) throw new Error(`the page drew no bar for ${date}`)
  return bar
}

describe('key usage page', () => {
  it('opens on the route that monitors keys and draws each key its own reading', async () => {
    const readPending = vi.fn(() => Promise.resolve(ok(SNAPSHOT)))
    render(<KeyUsagePanel {...props(api({ readPendingAccounts: readPending }))} />)

    await waitFor(() => expect(screen.getByText('罗经理')).toBeTruthy())
    expect(readPending).toHaveBeenCalledTimes(1)

    // Every monitored credential gets a card, named by the label the user set.
    expect(screen.getByText('曾广历')).toBeTruthy()
    expect(screen.getByText('Per-key usage')).toBeTruthy()
    expect(screen.getByText('2 healthy · 0 failing')).toBeTruthy()

    // The metered key states its window; the unmetered one states the absence.
    expect(screen.getByText('676.82M in the last 30 days')).toBeTruthy()
    expect(screen.getByText('This key returned no token usage')).toBeTruthy()

    // The spend tile carries the period's own tokens, so money and tokens share one window.
    expect(screen.getByText('905.5k tokens this period · 2.0873 CNY per million')).toBeTruthy()

    // A metered key states what a million of its tokens costs and how much of it was cache.
    expect(screen.getByText('2.0873 CNY per million tokens this period')).toBeTruthy()
    expect(screen.getByText('cache read 78.1%')).toBeTruthy()

    // Allowances stay per key rather than being folded into one route figure.
    expect(screen.getByText('4998.11 CNY')).toBeTruthy()
    expect(screen.getByText('4622.1 CNY')).toBeTruthy()
  })

  it('opens a key into its allowance, token split, period, models and days', async () => {
    const { container } = render(<KeyUsagePanel {...props(api())} />)
    await waitFor(() => expect(screen.getByText('罗经理')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /罗经理/ }))

    expect(screen.getByText('Allowance and budget pools')).toBeTruthy()
    expect(screen.getByText('二组')).toBeTruthy()
    expect(screen.getByText('Billing period')).toBeTruthy()
    expect(screen.getByText('2026-10')).toBeTruthy()
    expect(screen.getByText('2026-10-01 to 2026-11-01')).toBeTruthy()
    expect(screen.getByText('6 succeeded · 7 failed')).toBeTruthy()

    // The split is the window's own buckets plus the total they add up to.
    expect(screen.getByText('Token split · last 30 days')).toBeTruthy()
    expect(screen.getByText('Total')).toBeTruthy()
    expect(screen.getByText('Input')).toBeTruthy()
    expect(screen.getByText('Output')).toBeTruthy()

    expect(screen.getByText('By model (last 30 days)')).toBeTruthy()
    expect(screen.getByText('400.00M · 1,500')).toBeTruthy()

    expect(screen.getByText('Daily tokens (last 30 days)')).toBeTruthy()
    expect(screen.queryByText('2026-10-15 by model')).toBeNull()

    // A day is a slice of the series already read, not another round trip.
    fireEvent.click(dayBar(container, '2026-10-15'))
    expect(screen.getByText('2026-10-15 by model')).toBeTruthy()
    const table = container.querySelector('table')
    if (table === null) throw new Error('the day view drew no table')
    expect(within(table).getByText('claude-sonnet-4.5')).toBeTruthy()
    expect(within(table).getByText('376.82M')).toBeTruthy()
  })

  it('names a credential the user never labelled by the reference itself', async () => {
    render(<KeyUsagePanel {...props(api({
      readPendingAccounts: () => Promise.resolve(ok(UNLABELLED_SNAPSHOT)),
    }))} />)

    await waitFor(() => expect(screen.getByText('abcdef01234567…')).toBeTruthy())
  })

  it('keeps the last good view when the re-read fails', async () => {
    const refresh = vi.fn(() => Promise.resolve(failed<QuotaSnapshot>()))
    const { container } = render(<KeyUsagePanel {...props(api({ refreshAccounts: refresh }))} />)
    await waitFor(() => expect(screen.getByText('罗经理')).toBeTruthy())

    fireEvent.click(headerRefresh(container))

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    // The control returns to its resting label rather than staying busy …
    expect(headerRefresh(container)).toBeTruthy()
    // … and the reading it could not replace is still on screen.
    expect(screen.getByText('罗经理')).toBeTruthy()
    expect(screen.getByText('676.82M in the last 30 days')).toBeTruthy()
  })

  it('switches the shown route from the snapshot without another round trip', async () => {
    const readPending = vi.fn(() => Promise.resolve(ok(SNAPSHOT)))
    const { container } = render(<KeyUsagePanel {...props(api({ readPendingAccounts: readPending }))} />)
    await waitFor(() => expect(screen.getByText('罗经理')).toBeTruthy())

    fireEvent.click(within(container).getByRole('button', { name: /DeepSeek/ }))

    await waitFor(() => expect(screen.getByText('Route default credential')).toBeTruthy())
    expect(screen.queryByText('罗经理')).toBeNull()
    expect(readPending).toHaveBeenCalledTimes(1)
  })
})
