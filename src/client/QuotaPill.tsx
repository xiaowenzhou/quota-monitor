/**
 * The composer pill: the selected route's allowance, rendered beside the model
 * selector on the composer's tool row.
 *
 * It states what the selected model's own provider publishes — a subscription's
 * plan windows, or a wallet's remainder — and nothing when that provider has no
 * readable account, because a control that always showed something would be
 * noise on every session whose provider publishes no account endpoint. The
 * selection is the session's own `modelSelection` projection, so the pill
 * follows the model the next request will use rather than the account card's
 * independent selection.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
 */

import { useCallback, useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge declaring this seat.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { QuotaAccount } from '../types.ts'
import type { QuotaMonitorApi, QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtPercent, fmtTime, resetLabel } from './format.ts'
import { accountTone, hasFigure, WINDOW_KEYS, worstWindows } from './windows.ts'
import type {} from './locales.ts'
import css from './QuotaPill.module.css'

/** How many windows the pill states before the tooltip carries the rest. */
const PILL_WINDOWS = 2

/** How often the pill re-reads the Host's cached reading. */
const POLL_MS = 60_000

/** What the pill reads through. */
export interface QuotaPillInjected {
  /** The mounted `ctx.remote.quotaMonitor` face. */
  quota: QuotaMonitorApi
}

/** Composed props of the pill entry. */
export type QuotaPillProps =
  PropsRuntime<'conversation.input.right'> & PropsLocale<'quotaMonitor'> & InjectFace<QuotaPillInjected>

/**
 * The tooltip: every window with its reset, the plan, and how to refresh.
 * @param t - the panel's namespace-bound translate.
 * @param account - the reading to describe.
 * @returns the tooltip lines.
 */
function detailOf(t: QuotaTranslate, account: QuotaAccount): string {
  const lines: string[] = [account.plan === undefined ? account.name : `${account.name} · ${account.plan}`]
  for (const window of account.planWindows ?? []) {
    const reset = resetLabel(t, window.resetAt)
    lines.push(`${t(WINDOW_KEYS[window.kind])} ${fmtPercent(window.percentUsed)}${reset === undefined ? '' : ` · ${reset}`}`)
  }
  if (account.unlimited === true) lines.push(t('pill.unlimited'))
  else if (account.remaining !== undefined) {
    lines.push(t('window.remaining', { amount: fmtAmount(account.remaining, account.currency) }))
  }
  lines.push(`${t('account.updated', { time: fmtTime(account.fetchedAt) })} · ${t('account.source', { adapter: account.adapter })}`)
  lines.push(t('pill.hint'))
  return lines.join('\n')
}

export function QuotaPill({ t, quota, useProjection }: QuotaPillProps) {
  const selection = useProjection('modelSelection')
  const provider = selection?.next?.provider
  const [account, setAccount] = useState<QuotaAccount | undefined>()
  const [reading, setReading] = useState(false)

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
    void read(provider, false)
    const timer = setInterval(() => { void read(provider, false) }, POLL_MS)
    return () => { clearInterval(timer) }
  }, [provider, read])

  if (provider === undefined || account === undefined) return null
  // A stale reading for another route, or one with no figure to state, says
  // nothing worth the tool row's width.
  if (account.id !== provider || account.status !== 'ok' || !hasFigure(account)) return null

  const tone = accountTone(account)
  const toneClass = tone === 'critical' ? css.critical : tone === 'warning' ? css.warning : undefined
  const windows = worstWindows(account, PILL_WINDOWS)
  const unlimited = account.unlimited === true
  const showBalance = !unlimited && windows.length === 0 && account.remaining !== undefined

  return <button
    type="button"
    className={`${css.pill} ${toneClass ?? ''} ${reading ? css.reading : ''}`}
    title={detailOf(t, account)}
    aria-label={t('pill.label', { provider: account.name })}
    onClick={() => void read(provider, true)}
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
}
