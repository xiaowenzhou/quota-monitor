/**
 * The composer pill: the selected route's allowance beside the model selector,
 * and the reading behind it once the reader asks for more.
 *
 * The pill states the two tightest plan windows, or a wallet's remainder, and
 * opens a panel with the whole reading: every window with its reset countdown
 * and disclosed remainder, the balance, the budget pools, and the usage the
 * endpoint itself reported for this credential. It renders nothing when that
 * route's provider publishes no account endpoint — a control that always showed
 * something would be noise — and it yields the seat to another plugin's own
 * allowance chip (see {@link siblingStatesAllowance}).
 *
 * The route comes from the session's own `modelSelection` projection, so the
 * pill follows the model the next request will use rather than the account
 * card's independent selection.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge declaring this seat.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { MenuSurface, useAnchoredPosition, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { QuotaAccount, QuotaGatewayUsage, QuotaPlanWindow } from '../types.ts'
import type { QuotaMonitorApi, QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtNumber, fmtPercent, fmtTime, fmtTokens, resetLabel } from './format.ts'
import { accountTone, hasFigure, WINDOW_KEYS, worstWindows } from './windows.ts'
import type {} from './locales.ts'
import css from './QuotaPill.module.css'

/** How many windows the pill states before the panel carries the rest. */
const PILL_WINDOWS = 2

/** How many rows of one gateway usage table the panel shows. */
const GATEWAY_ROWS = 4

/** How often the pill re-reads the Host's cached reading. */
const POLL_MS = 60_000

/** Display order of the gateway usage tables. */
const GATEWAY_ORDER: readonly QuotaGatewayUsage['kind'][] = Object.freeze(['day', 'model', 'pool'])

/** Dictionary key naming each gateway usage table. */
const GATEWAY_KEYS: Readonly<Record<QuotaGatewayUsage['kind'], 'gateway.days'
  | 'gateway.models' | 'gateway.pools'>> = Object.freeze({
  day: 'gateway.days',
  model: 'gateway.models',
  pool: 'gateway.pools',
})

/** What the pill reads through. */
export interface QuotaPillInjected {
  /** The mounted `ctx.remote.quotaMonitor` face. */
  quota: QuotaMonitorApi
}

/** Composed props of the pill entry. */
export type QuotaPillProps =
  PropsRuntime<'conversation.input.right'> & PropsLocale<'quotaMonitor'> & InjectFace<QuotaPillInjected>

/**
 * The endpoint's own token total for one row: its own, or the four buckets summed.
 * @param row - one gateway usage row.
 * @returns the token figure, or undefined when the row reported none.
 */
function gatewayTokens(row: QuotaGatewayUsage): number | undefined {
  if (row.totalTokens !== undefined) return row.totalTokens
  const present = [row.inputTokens, row.outputTokens, row.cacheReadTokens, row.cacheWriteTokens]
    .filter((value): value is number => value !== undefined)
  return present.length === 0 ? undefined : present.reduce((total, value) => total + value, 0)
}

/**
 * One gateway usage row's figures, as a single line.
 * @param t - the panel's namespace-bound translate.
 * @param row - the row to describe.
 * @returns the figures the endpoint reported for it.
 */
function gatewayFacts(t: QuotaTranslate, row: QuotaGatewayUsage): string {
  const parts: string[] = []
  if (row.requests !== undefined) parts.push(t('gateway.requests', { count: fmtNumber(row.requests) }))
  const tokens = gatewayTokens(row)
  if (tokens !== undefined) parts.push(fmtTokens(tokens))
  if (row.cost !== undefined) parts.push(fmtAmount(row.cost, row.currency))
  return parts.join(' · ')
}

/**
 * One plan window inside the panel: its bar, its share, and what resets it.
 * @param props - the window, its account, and the translate seat.
 * @returns the row element.
 */
function WindowDetail({ t, account, window: entry }: {
  t: QuotaTranslate
  account: QuotaAccount
  window: QuotaPlanWindow
}) {
  const reset = resetLabel(t, entry.resetAt)
  const remaining = entry.remaining === undefined
    ? undefined
    : t('window.remaining', { amount: fmtAmount(entry.remaining, account.currency) })
  const meta = [reset, remaining].filter((part): part is string => part !== undefined)
  return <div className={css.detailRow}>
    <div className={css.detailHead}>
      <span className={css.detailLabel}>{t(WINDOW_KEYS[entry.kind])}</span>
      <span className={css.detailValue}>{fmtPercent(entry.percentUsed)}</span>
    </div>
    <div className={css.bar}>
      <div
        className={`${css.barFill} ${entry.percentUsed >= 100 ? css.critical : entry.percentUsed >= 80 ? css.warning : ''}`}
        style={{ width: `${Math.min(100, entry.percentUsed)}%` }}
      />
    </div>
    {meta.length === 0 ? null : <span className={css.detailMeta}>{meta.join(' · ')}</span>}
  </div>
}

export function QuotaPill({ t, quota, useProjection }: QuotaPillProps) {
  const selection = useProjection('modelSelection')
  const provider = selection?.next?.provider
  const [account, setAccount] = useState<QuotaAccount | undefined>()
  const [reading, setReading] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // The composer sits on the window's bottom edge, so the panel opens upward.
  const position = useAnchoredPosition({
    open,
    anchorRef: rootRef,
    panelRef,
    side: 'top',
    align: 'start',
    gap: 8,
    margin: 12,
  })
  useDismissOnOutsidePointer(rootRef, open, setOpen, panelRef)

  const read = useCallback(async (id: string, refresh: boolean) => {
    setReading(true)
    try {
      const result = await quota.getAccount({ provider: id, refresh })
      if (result.ok) setAccount(result.value)
    } finally {
      setReading(false)
    }
  }, [quota])

  useEffect(() => {
    if (provider === undefined) return
    // Another route's figures must never appear under a new selection.
    setAccount(undefined)
    setOpen(false)
    void read(provider, false)
    const timer = setInterval(() => { void read(provider, false) }, POLL_MS)
    return () => { clearInterval(timer) }
  }, [provider, read])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey) }
  }, [open])

  if (provider === undefined || account === undefined) return null
  // A stale reading for another route, or one with no figure to state, says
  // nothing worth the tool row's width.
  if (account.id !== provider || account.status !== 'ok' || !hasFigure(account)) return null

  const tone = accountTone(account)
  const toneClass = tone === 'critical' ? css.critical : tone === 'warning' ? css.warning : undefined
  const windows = worstWindows(account, PILL_WINDOWS)
  const unlimited = account.unlimited === true
  const showBalance = !unlimited && windows.length === 0 && account.remaining !== undefined
  const groups = GATEWAY_ORDER
    .map(kind => [kind, (account.usage ?? []).filter(row => row.kind === kind)] as const)
    .filter(([, rows]) => rows.length > 0)

  return <span className={css.root} ref={rootRef}>
    <button
      type="button"
      className={`${css.pill} ${toneClass ?? ''} ${reading ? css.reading : ''}`}
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={t('pill.label', { provider: account.name })}
      onClick={() => setOpen(current => !current)}
    >
      <span className={css.dot} aria-hidden="true" />
      <span className={css.name}>{account.name}</span>
      {unlimited
        ? <span className={css.figure}>{t('pill.unlimited')}</span>
        : windows.map(window => <span key={window.kind} className={css.window}>
          {t('pill.window', {
            label: t(WINDOW_KEYS[window.kind]),
            percent: fmtPercent(window.percentUsed),
          })}
        </span>)}
      {showBalance
        ? <span className={css.figure}>{fmtAmount(account.remaining, account.currency)}</span>
        : null}
    </button>

    {!open ? null : <MenuSurface
      ref={panelRef}
      role="dialog"
      aria-label={t('pill.details', { provider: account.name })}
      className={css.panel}
      style={{
        ...position ?? {},
        // Placed by layout effect on the first frame; hidden until then so it
        // never paints at the viewport origin.
        visibility: position === null ? 'hidden' : 'visible',
      }}
    >
      <div className={css.panelHead}>
        <span className={css.panelName}>{account.name}</span>
        {account.plan === undefined ? null : <span className={css.panelPlan}>{account.plan}</span>}
        <button
          type="button"
          className={css.panelAction}
          disabled={reading}
          onClick={() => void read(provider, true)}
        >{reading ? t('action.refreshing') : t('action.refresh')}</button>
      </div>

      {(account.planWindows ?? []).map(window => <WindowDetail
        key={window.kind}
        t={t}
        account={account}
        window={window}
      />)}

      {unlimited
        ? <p className={css.detailMeta}>{t('account.unlimited')}</p>
        : account.remaining === undefined ? null : <dl className={css.detailList}>
          <div className={css.detailPair}>
            <dt>{t('account.remaining')}</dt>
            <dd>{fmtAmount(account.remaining, account.currency)}</dd>
          </div>
          {account.used === undefined ? null : <div className={css.detailPair}>
            <dt>{t('account.used')}</dt>
            <dd>{fmtAmount(account.used, account.currency)}</dd>
          </div>}
          {account.limit === undefined ? null : <div className={css.detailPair}>
            <dt>{t('account.limit')}</dt>
            <dd>{fmtAmount(account.limit, account.currency)}</dd>
          </div>}
        </dl>}

      {account.budgetPools === undefined || account.budgetPools.length === 0 ? null : <>
        <p className={css.panelHeading}>{t('pools.heading')}</p>
        <ul className={css.detailList}>
          {account.budgetPools.map(pool => <li key={pool.name} className={css.detailMeta}>
            {pool.limit === undefined
              ? t('pool.remaining', { name: pool.name, amount: fmtAmount(pool.remaining) })
              : t('pool.remainingOfLimit', {
                name: pool.name,
                amount: fmtAmount(pool.remaining),
                limit: fmtAmount(pool.limit),
              })}
          </li>)}
        </ul>
      </>}

      {groups.length === 0 ? null : <>
        <p className={css.panelHeading}>{t('gateway.heading')}</p>
        {groups.map(([kind, rows]) => <div key={kind} className={css.gatewayGroup}>
          <span className={css.panelHeading}>{t(GATEWAY_KEYS[kind])}</span>
          <ul className={css.detailList}>
            {rows.slice(0, GATEWAY_ROWS).map(row => <li key={row.label} className={css.gatewayRow}>
              <span className={css.gatewayLabel} title={row.label}>{row.label}</span>
              <span className={css.gatewayValue}>{gatewayFacts(t, row)}</span>
            </li>)}
          </ul>
          {rows.length > GATEWAY_ROWS
            ? <span className={css.detailMeta}>{t('gateway.more', { count: String(GATEWAY_ROWS) })}</span>
            : null}
        </div>)}
      </>}

      <p className={css.panelMeta}>
        {t('account.updated', { time: fmtTime(account.fetchedAt) })}
        {' · '}
        {t('account.source', { adapter: account.adapter })}
      </p>
    </MenuSurface>}
  </span>
}
