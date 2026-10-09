// @vitest-environment jsdom

/**
 * The composer pill's browser behavior.
 *
 * Every case drives the pill through the same two seams its registration gives
 * it: the session's `modelSelection` projection (which route the next request
 * uses) and the `quotaMonitor` Remote face (what that route's endpoint says).
 * The pill derives no figure of its own, and a route with nothing readable must
 * render nothing rather than an empty control.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { makeTranslate, RemoteError } from '@deepseek-ai/dsh-client-test-runtime'
import { en as commonEn } from '@deepseek-ai/dsh-client-locale/src/locales/index.ts'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { QuotaAccount } from '../src/types.ts'
import type { QuotaMonitorApi } from '../src/client/UsagePanel.tsx'
import type { QuotaPillProps } from '../src/client/QuotaPill.tsx'
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
    { kind: 'weekly', percentUsed: 38, resetAt: '2026-10-12T00:00:00Z' },
    { kind: 'five-hour', percentUsed: 62, resetAt: '2026-10-09T12:00:00Z' },
  ],
}

/** A wallet reading. */
const BALANCE: QuotaAccount = {
  id: 'ktc-claude',
  name: 'KTC',
  mode: 'balance',
  status: 'ok',
  adapter: 'sub2api',
  fetchedAt: Date.parse('2026-10-09T09:00:00Z'),
  remaining: 495.38933175,
  currency: 'USD',
  warning: 'normal',
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

/** The pill's props: the locale seat, the injected Remote face, and the seat hook. */
function props(quota: QuotaMonitorApi, provider: string | undefined): QuotaPillProps {
  return {
    t: makeTranslate(en, commonEn),
    quota,
    sessionId: 'session-a',
    useProjection: (key: string) => (key === 'modelSelection' ? selection(provider) : undefined),
  } as unknown as QuotaPillProps
}

describe('quota pill', () => {
  it('states the selected subscription\'s tightest windows, tightest first', async () => {
    render(<QuotaPill {...props(api(SUBSCRIPTION), 'cline-pass')} />)

    expect(await screen.findByText('Cline Pass')).toBeTruthy()
    // Only the two most spent windows take the tool row's width, tightest first.
    const windows = screen.getAllByText(/^(5 hours|This week) /u).map(node => node.textContent)
    expect(windows).toEqual(['5 hours 62.0%', 'This week 38.0%'])
    // The tooltip carries every window with its reset, and the reading's origin.
    const button = screen.getByRole('button', { name: 'Cline Pass allowance' })
    expect(button.getAttribute('title')).toContain('Cline Pass · Cline Pass')
    expect(button.getAttribute('title')).toContain('5 hours 62.0%')
    expect(button.getAttribute('title')).toContain('cline-plan')
  })

  it('states a wallet remainder when the route publishes one', async () => {
    render(<QuotaPill {...props(api(BALANCE), 'ktc-claude')} />)

    expect(await screen.findByText('KTC')).toBeTruthy()
    expect(screen.getByText('495.39 USD')).toBeTruthy()
  })

  it('renders nothing for a route whose endpoint publishes no account', async () => {
    render(<QuotaPill {...props(api(UNSUPPORTED), 'sensenova')} />)

    // The read happened; there is simply nothing to put beside the model.
    await waitFor(() => { expect(screen.queryByText('sensenova')).toBeNull() })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('renders nothing, and reads nothing, before a selection exists', () => {
    const getAccount = vi.fn(() => Promise.resolve(ok(BALANCE)))
    render(<QuotaPill {...props({ ...api(BALANCE), getAccount }, undefined)} />)

    expect(screen.queryByRole('button')).toBeNull()
    expect(getAccount).not.toHaveBeenCalled()
  })

  it('follows the session\'s selection and never shows the previous route', async () => {
    const getAccount = vi.fn((request: { provider: string }) => Promise.resolve(ok(
      request.provider === 'ktc-claude' ? BALANCE : SUBSCRIPTION,
    )))
    const { rerender } = render(<QuotaPill {...props({ ...api(BALANCE), getAccount }, 'ktc-claude')} />)
    expect(await screen.findByText('495.39 USD')).toBeTruthy()

    rerender(<QuotaPill {...props({ ...api(BALANCE), getAccount }, 'cline-pass')} />)

    // The new route's figures replace the old ones rather than sitting beside them.
    expect(await screen.findByText('5 hours 62.0%')).toBeTruthy()
    expect(screen.queryByText('495.39 USD')).toBeNull()
    expect(getAccount).toHaveBeenLastCalledWith({ provider: 'cline-pass', refresh: false })
  })

  it('refreshes the reading when the pill is clicked', async () => {
    const getAccount = vi.fn((request: { refresh?: boolean }) => Promise.resolve(ok(BALANCE)))
    render(<QuotaPill {...props({ ...api(BALANCE), getAccount }, 'ktc-claude')} />)

    const button = await screen.findByRole('button', { name: 'KTC allowance' })
    await waitFor(() => { expect(getAccount).toHaveBeenCalledTimes(1) })
    fireEvent.click(button)

    await waitFor(() => { expect(getAccount).toHaveBeenLastCalledWith({ provider: 'ktc-claude', refresh: true }) })
  })

  it('keeps the last good reading when a refresh fails', async () => {
    const getAccount = vi.fn()
      .mockResolvedValueOnce(ok(BALANCE))
      .mockResolvedValue({ ok: false, error: new RemoteError('gateway/internal', 'unavailable', {}) })
    render(<QuotaPill {...props({ ...api(BALANCE), getAccount }, 'ktc-claude')} />)

    fireEvent.click(await screen.findByRole('button', { name: 'KTC allowance' }))

    await waitFor(() => { expect(getAccount).toHaveBeenCalledTimes(2) })
    expect(screen.getByText('495.39 USD')).toBeTruthy()
  })
})
