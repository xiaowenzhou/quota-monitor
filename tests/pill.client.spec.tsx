// @vitest-environment jsdom

/**
 * The composer pill's browser behavior.
 *
 * Every case drives the pill through the same two seams its registration gives
 * it: the session's `modelSelection` projection (which route the next request
 * uses) and the `quotaMonitor` Remote face (what that route's endpoint says).
 * The pill derives no figure of its own, states the two tightest windows at
 * rest, opens the whole reading on click, and renders nothing when the route
 * publishes no account at all.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { makeTranslate, RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/index.ts'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { QuotaAccount } from '../src/types.ts'
import type { QuotaMonitorApi } from '../src/client/UsagePanel.tsx'
import type { QuotaPillProps, SeatRivals } from '../src/client/QuotaPill.tsx'
import { QuotaPill } from '../src/client/QuotaPill.tsx'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** A Remote answer the pill can read. */
function ok<T>(value: T): RemoteResult<T> {
  return { ok: true, value }
}

/** The projection view the framework seat would hand the pill. */
function selection(provider: string | undefined) {
  return provider === undefined
    ? { lastUsed: null, next: null }
    : { lastUsed: null, next: { provider, model: 'some-model' } }
}

/** A subscription reading: two windows, the tighter one second. */
const SUBSCRIPTION: QuotaAccount = {
  id: 'cline-pass',
  name: 'Cline Pass',
  mode: 'subscription',
  status: 'ok',
  adapter: 'cline-plan',
  fetchedAt: Date.parse('2026-10-09T09:00:00Z'),
  plan: 'Cline Pass',
  planWindows: [
    { kind: 'weekly', percentUsed: 38, resetAt: '2099-10-12T00:00:00Z' },
    { kind: 'five-hour', percentUsed: 62, resetAt: '2099-10-09T12:00:00Z', remaining: 380 },
  ],
}

/** A wallet reading that also reports a pool and the gateway's own tables. */
const WALLET: QuotaAccount = {
  id: 'ktc-claude',
  name: 'KTC',
  mode: 'balance',
  status: 'ok',
  adapter: 'sub2api',
  fetchedAt: Date.parse('2026-10-09T09:00:00Z'),
  remaining: 495.38933175,
  used: 4.61,
  limit: 500,
  currency: 'USD',
  warning: 'normal',
  budgetPools: [{ name: 'team-b', remaining: 12.5, limit: 20 }],
  usage: [
    { kind: 'day', label: '2026-09-29', requests: 12, totalTokens: 1_629_770, cost: 4.61, currency: 'USD' },
    { kind: 'model', label: 'claude-opus-5', requests: 12, totalTokens: 1_629_770 },
  ],
}

/** A route whose endpoint publishes no account. */
const UNSUPPORTED: QuotaAccount = {
  id: 'sensenova',
  name: 'sensenova',
  mode: 'unsupported',
  status: 'unsupported',
  adapter: 'deepseek-balance',
  fetchedAt: Date.parse('2026-10-09T09:00:00Z'),
  reason: 'this provider publishes no account endpoint',
}

function api(account: QuotaAccount | undefined): QuotaMonitorApi {
  return {
    getSnapshot: () => Promise.resolve(ok({} as never)),
    getAccount: () => Promise.resolve(account === undefined
      ? { ok: false, error: new RemoteError('gateway/internal', 'unavailable', {}) } as RemoteResult<QuotaAccount>
      : ok(account)),
    getUsage: () => Promise.resolve(ok({} as never)),
    exportUsage: () => Promise.resolve(ok({} as never)),
    setBalances: () => Promise.resolve(ok({})),
    resetStats: () => Promise.resolve(ok({} as never)),
  }
}

/** A seat rival list the test controls, observable the way the real seat is. */
interface TestSeat extends SeatRivals {
  /** Register or remove a rival chip the way another plugin would. */
  set: (next: readonly (string | undefined)[]) => void
}

function seat(ids: readonly (string | undefined)[] = []): TestSeat {
  const listeners = new Set<() => void>()
  let version = 0
  let current = ids
  return {
    version: () => version,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    ids: () => current,
    set: (next) => {
      current = next
      version += 1
      for (const listener of listeners) listener()
    },
  }
}

/** The pill's props: the locale seat, the injected Remote face, and the seat hook. */
function props(
  quota: QuotaMonitorApi,
  provider: string | undefined,
  rivals: SeatRivals = seat(),
): QuotaPillProps {
  return {
    t: makeTranslate(en, commonEn),
    quota,
    rivals,
    sessionId: 'session-a',
    useProjection: (key: string) => (key === 'modelSelection' ? selection(provider) : undefined),
  } as unknown as QuotaPillProps
}

/**
 * Render the pill and open the reading it holds.
 * @param account - the reading its route answers with.
 * @param provider - the route the session selected.
 * @returns the opened dialog.
 */
async function opened(account: QuotaAccount, provider: string) {
  render(<QuotaPill {...props(api(account), provider)} />)
  fireEvent.click(await screen.findByRole('button', { name: `${account.name} allowance` }))
  return screen.findByRole('dialog', { name: `${account.name} allowance and usage` })
}

describe('quota pill', () => {
  it('states the selected subscription\'s tightest windows, tightest first', async () => {
    render(<QuotaPill {...props(api(SUBSCRIPTION), 'cline-pass')} />)

    expect(await screen.findByText('Cline Pass')).toBeTruthy()
    const windows = screen.getAllByText(/^(5 hours|This week) /u).map(node => node.textContent)
    expect(windows).toEqual(['5 hours 62.0%', 'This week 38.0%'])
    const trigger = screen.getByRole('button', { name: 'Cline Pass allowance' })
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('states a wallet remainder when the route publishes one', async () => {
    render(<QuotaPill {...props(api(WALLET), 'ktc-claude')} />)

    expect(await screen.findByText('KTC')).toBeTruthy()
    expect(screen.getByText('495.39 USD')).toBeTruthy()
  })

  it('opens every window the reading carries, with what resets each', async () => {
    const dialog = await opened(SUBSCRIPTION, 'cline-pass')
    const reading = within(dialog)

    // Both windows, not only the two the pill states, and the disclosed remainder.
    expect(reading.getByText('5 hours')).toBeTruthy()
    expect(reading.getByText('This week')).toBeTruthy()
    expect(reading.getByText(/380 left/u)).toBeTruthy()
    // The reading's own origin, so a figure is never anonymous.
    expect(reading.getByText(/cline-plan/u)).toBeTruthy()
  })

  it('opens the balance, the pool, and the gateway\'s own usage tables', async () => {
    const dialog = await opened(WALLET, 'ktc-claude')
    const reading = within(dialog)

    expect(reading.getByText('495.39 USD')).toBeTruthy()
    expect(reading.getByText('4.61 USD')).toBeTruthy()
    expect(reading.getByText('500 USD')).toBeTruthy()
    expect(reading.getByText(/team-b/u)).toBeTruthy()
    expect(reading.getByText('By day')).toBeTruthy()
    expect(reading.getByText('2026-09-29')).toBeTruthy()
    expect(reading.getByText('By model')).toBeTruthy()
    expect(reading.getByText('claude-opus-5')).toBeTruthy()
  })

  it('portals the reading to the body, clear of the composer\'s clipping', async () => {
    const dialog = await opened(WALLET, 'ktc-claude')
    const trigger = screen.getByRole('button', { name: 'KTC allowance' })

    // A body portal is the whole fix: the composer seat clips and stacks its
    // own children, which cut the reading off once the sidebar took width, so
    // the card must not be a descendant of the pill at all.
    expect(dialog.parentElement).toBe(document.body)
    expect(trigger.contains(dialog)).toBe(false)

    // And a click inside the portal is still a click inside the reading: the
    // outside-pointer dismissal must treat the portaled card as its own.
    fireEvent.pointerDown(dialog)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('forces a read from inside the reading', async () => {
    const getAccount = vi.fn((request: { refresh?: boolean }) => Promise.resolve(ok(WALLET)))
    render(<QuotaPill {...props({ ...api(WALLET), getAccount }, 'ktc-claude')} />)

    fireEvent.click(await screen.findByRole('button', { name: 'KTC allowance' }))
    const refresh = await screen.findByRole('button', { name: 'Refresh' })
    await waitFor(() => { expect(getAccount).toHaveBeenCalledTimes(1) })
    fireEvent.click(refresh)

    await waitFor(() => { expect(getAccount).toHaveBeenLastCalledWith({ provider: 'ktc-claude', refresh: true }) })
  })

  it('closes the reading on Escape', async () => {
    await opened(SUBSCRIPTION, 'cline-pass')

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull() })
    // The pill itself stays, so the choice is still visible at rest.
    expect(screen.getByRole('button', { name: 'Cline Pass allowance' })).toBeTruthy()
  })

  it('renders nothing for a route whose endpoint publishes no account', async () => {
    render(<QuotaPill {...props(api(UNSUPPORTED), 'sensenova')} />)

    await waitFor(() => { expect(screen.queryByText('sensenova')).toBeNull() })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing, and reads nothing, before a selection exists', () => {
    const getAccount = vi.fn(() => Promise.resolve(ok(WALLET)))
    render(<QuotaPill {...props({ ...api(WALLET), getAccount }, undefined)} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(getAccount).not.toHaveBeenCalled()
  })

  it('follows the session\'s selection and never shows the previous route', async () => {
    const getAccount = vi.fn((request: { provider: string }) => Promise.resolve(ok(
      request.provider === 'ktc-claude' ? WALLET : SUBSCRIPTION,
    )))
    const { rerender } = render(<QuotaPill {...props({ ...api(WALLET), getAccount }, 'ktc-claude')} />)
    expect(await screen.findByText('495.39 USD')).toBeTruthy()

    rerender(<QuotaPill {...props({ ...api(WALLET), getAccount }, 'cline-pass')} />)

    expect(await screen.findByText('5 hours 62.0%')).toBeTruthy()
    expect(screen.queryByText('495.39 USD')).toBeNull()
    expect(getAccount).toHaveBeenLastCalledWith({ provider: 'cline-pass', refresh: false })
  })

  it('keeps the last good reading when a refresh fails', async () => {
    const getAccount = vi.fn()
      .mockResolvedValueOnce(ok(WALLET))
      .mockResolvedValue({ ok: false, error: new RemoteError('gateway/internal', 'unavailable', {}) })
    render(<QuotaPill {...props({ ...api(WALLET), getAccount }, 'ktc-claude')} />)

    fireEvent.click(await screen.findByRole('button', { name: 'KTC allowance' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Refresh' }))

    await waitFor(() => { expect(getAccount).toHaveBeenCalledTimes(2) })
    // The pill and the open reading both state it; the point is it survived.
    expect(screen.getAllByText('495.39 USD').length).toBeGreaterThan(0)
  })

  it('still states a route whose seat is occupied by a rival\'s silent chip', async () => {
    // The regression: `dsh-cline-pass` registers `cline-pass-usage` for every
    // route and renders nothing unless that route is its own. A seat-occupant
    // check would have retired this pill for good — including here, where the
    // selected route is `cline` and the rival chip says nothing at all.
    render(<QuotaPill {...props(api(WALLET), 'ktc-claude', seat(['cline-pass-usage']))} />)

    expect(await screen.findByText('KTC')).toBeTruthy()
  })

  it('stands down for a rival chip that speaks for the selected route, and takes the seat back', async () => {
    const rivals = seat()
    render(<QuotaPill {...props(api(WALLET), 'ktc-claude', rivals)} />)
    expect(await screen.findByText('KTC')).toBeTruthy()

    // The rival's chip arrives already stating this route: it wins the seat.
    act(() => { rivals.set(['ktc-claude-usage']) })
    await waitFor(() => { expect(screen.queryByText('KTC')).toBeNull() })

    // It leaves — this route's reading returns rather than staying blank.
    act(() => { rivals.set([]) })
    expect(await screen.findByText('KTC')).toBeTruthy()
  })
})
