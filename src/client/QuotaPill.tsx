/**
 * The composer pill: the selected route's allowance beside the model selector,
 * and the reading behind it once the reader asks for more.
 *
 * The pill states the two tightest plan windows, or a wallet's remainder, and
 * clicking it floats the whole reading above the composer: every window with
 * its reset countdown and disclosed remainder, the balance, the budget pools,
 * and the usage the endpoint itself reported for this credential. It renders
 * nothing when that route's provider publishes no account endpoint — a control
 * that always showed something would be noise — and it stands down when another
 * plugin's own allowance chip already speaks for that exact route (see
 * {@link rivalStatesRoute}).
 *
 * That decision belongs here rather than at registration: a rival registers its
 * entry unconditionally and renders nothing unless the selected route is its
 * own, so the seat is occupied even while the rival says nothing — and this pill
 * is the only one that would fill that silence.
 *
 * The reading is portaled to `document.body` and placed by
 * {@link useAnchoredPosition} from the pill's own rect — the platform's own
 * popover contract (see ui-schedule's `PickerPopover`). It has to be, for two
 * reasons a narrower center column makes visible at once: the composer seat is
 * a stacking context (ConversationRoot's own note says it caps an in-card
 * popup's z-index), and the seat also scrolls and clips. A reading laid out
 * inside the card therefore leans out of the column and gets cut once the
 * sidebar takes width, and `right: 0` against a pill that has the model
 * selector beside it points three hundred pixels leftward for no reason the
 * reader can see. From a body portal the panel escapes both, and the hook
 * clamps it inside the viewport and re-places it on scroll and resize.
 *
 * The route comes from the session's own `modelSelection` projection, so the
 * pill follows the model the next request will use rather than the account
 * card's independent selection.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge declaring this seat.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { useAnchoredPosition, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { QuotaAccount, QuotaGatewayUsage, QuotaPlanWindow } from '../types.ts'
import type { QuotaMonitorApi, QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtNumber, fmtPercent, fmtTime, fmtTokens, resetLabel } from './format.ts'
import { accountTone, hasFigure, WINDOW_KEYS, worstWindows } from './windows.ts'
import { PILL_ID, rivalStatesRoute } from './yield.ts'
import type {} from './locales.ts'
import css from './QuotaPill.module.css'

/** How many windows the pill states before the panel carries the rest. */
const PILL_WINDOWS = 2

/** How many rows of one gateway usage table the panel shows. */
const GATEWAY_ROWS = 4

/** How often the pill re-reads the Host's cached reading. */
const POLL_MS = 60_000

/** Gap between the pill and the reading it floats, and the viewport inset. */
const PANEL_GAP = 8
const PANEL_MARGIN = 12

/**
 * Unplaced portal frame: laid out at the viewport origin but left unpainted
 * until the measuring pass in the same commit has placed it.
 */
const MEASURE_STYLE: CSSProperties = { visibility: 'hidden', left: 0, top: 0 }

/** Display order of the gateway usage tables. */
const GATEWAY_ORDER: readonly QuotaGatewayUsage['kind'][] = Object.freeze(['day', 'model', 'pool'])

/** Dictionary key naming each gateway usage table. */
const GATEWAY_KEYS: Readonly<Record<QuotaGatewayUsage['kind'], 'gateway.days'
  | 'gateway.models' | 'gateway.pools'>> = Object.freeze({
  day: 'gateway.days',
  model: 'gateway.models',
  pool: 'gateway.pools',
})

/**
 * A live view of the entries sharing this seat.
 *
 * The arbitration below must run per render rather than once at registration,
 * because what decides it — the selected route — is render state. This face
 * keeps the entry list observable so a rival arriving or leaving re-decides.
 */
export interface SeatRivals {
  /** Version counter of the seat's entry list, for `useSyncExternalStore`. */
  version: () => number
  /** Subscribe to the seat's entry list changing. */
  subscribe: (listener: () => void) => () => void
  /** Every entry id currently registered in the seat. */
  ids: () => readonly (string | undefined)[]
}

/** What the pill reads through. */
export interface QuotaPillInjected {
  /** The mounted `ctx.remote.quotaMonitor` face. */
  quota: QuotaMonitorApi
  /** The other entries in this seat, for the stand-down decision. */
  rivals: SeatRivals
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

export function QuotaPill({ t, quota, rivals, useProjection }: QuotaPillProps) {
  const selection = useProjection('modelSelection')
  const provider = selection?.next?.provider
  // The seat's occupant list, read as an external store: a rival chip may
  // arrive or leave at any time, and this pill re-decides then rather than
  // registering conditionally (see `rivalStatesRoute`).
  const seatVersion = useSyncExternalStore(rivals.subscribe, rivals.version)
  const standsDown = useMemo(() => {
    void seatVersion
    return provider === undefined ? false : rivalStatesRoute(rivals.ids(), PILL_ID, provider)
  }, [rivals, seatVersion, provider])
  const [account, setAccount] = useState<QuotaAccount | undefined>()
  const [reading, setReading] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)
  // The reading is portaled to the body and placed from the pill's own rect,
  // so the composer's clipping and stacking context cannot crop it. The root
  // still counts as the anchor, and the panel is passed as the portal, so a
  // pointerdown in either place keeps it open.
  const panelRef = useRef<HTMLDivElement>(null)
  const position = useAnchoredPosition({
    open,
    anchorRef: rootRef,
    panelRef,
    side: 'top',
    align: 'end',
    gap: PANEL_GAP,
    margin: PANEL_MARGIN,
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

  if (provider === undefined || standsDown || account === undefined) return null
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

    {!open ? null : createPortal(<div
      ref={panelRef}
      role="dialog"
      aria-label={t('pill.details', { provider: account.name })}
      className={css.panel}
      style={position ?? MEASURE_STYLE}
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
    </div>, document.body)}
  </span>
}
