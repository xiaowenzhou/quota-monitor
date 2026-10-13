/**
 * Plan-window vocabulary shared by the account card and the composer pill, so
 * one window kind carries one label wherever it is drawn.
 *
 * Nothing here computes a reading: the Host resolved the windows and their
 * severity, and these helpers only pick which of them a compact surface shows.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/windows
 */

import type {
  QuotaAccount,
  QuotaPlanWindow,
  QuotaPlanWindowKind,
  QuotaWarningLevel,
} from '../types.ts'
import { fmtAmount } from './format.ts'

/** Dictionary key naming each plan window kind. */
export const WINDOW_KEYS: Readonly<Record<QuotaPlanWindowKind, 'window.session' | 'window.fiveHour'
  | 'window.daily' | 'window.weekly' | 'window.monthly' | 'window.billing'
  | 'window.quota'>> = Object.freeze({
  'session': 'window.session',
  'five-hour': 'window.fiveHour',
  'daily': 'window.daily',
  'weekly': 'window.weekly',
  'monthly': 'window.monthly',
  'billing': 'window.billing',
  'quota': 'window.quota',
})

/**
 * The windows a compact surface shows: the most spent first.
 *
 * The order a reading carries is the endpoint's own; a pill that has room for
 * two of five windows should state the two closest to their ceiling, because
 * those are the ones that change what the reader does next.
 * @param account - the reading whose windows are ranked.
 * @param limit - how many windows to keep.
 * @returns the worst windows, most spent first.
 */
export function worstWindows(account: QuotaAccount, limit: number): readonly QuotaPlanWindow[] {
  return [...account.planWindows ?? []]
    .sort((left, right) => right.percentUsed - left.percentUsed)
    .slice(0, limit)
}

/**
 * The severity a reading draws with.
 *
 * A Host-resolved `warning` wins, because the adapter knows its own scale; a
 * reading that carries none falls back to the spent share of its windows.
 * @param account - the reading to tone.
 * @returns the severity level.
 */
export function accountTone(account: QuotaAccount): QuotaWarningLevel {
  if (account.warning !== undefined) return account.warning
  const spent = Math.max(0, ...(account.planWindows ?? []).map(window => window.percentUsed))
  if (spent >= 100) return 'critical'
  return spent >= 80 ? 'warning' : 'normal'
}

/**
 * Whether a reading carries any figure worth a compact surface.
 * @param account - the reading to test.
 * @returns true when it states a window or a balance.
 */
export function hasFigure(account: QuotaAccount): boolean {
  if (account.planWindows !== undefined && account.planWindows.length > 0) return true
  return account.unlimited === true || account.remaining !== undefined
}

/**
 * The figure a selector chip states for one reading.
 *
 * A balance states what is left, which is the number that ranks keys against
 * each other. A plan states the spent share of its tightest window, because
 * that is the one that runs out first. A reading that could not be read, or
 * that carries no figure at all, states nothing and leaves its dot to say why.
 * @param account - the reading to summarize.
 * @returns the compact figure, or undefined when the reading carries none.
 */
export function chipFigure(account: QuotaAccount | undefined): string | undefined {
  if (account === undefined || account.status !== 'ok') return undefined
  if (account.remaining !== undefined) return fmtAmount(account.remaining, account.currency)
  const tightest = worstWindows(account, 1)[0]
  return tightest === undefined ? undefined : `${Math.round(tightest.percentUsed)}%`
}
