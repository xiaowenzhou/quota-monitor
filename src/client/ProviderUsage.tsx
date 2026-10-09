/**
 * The provider breakdown: folded token totals per provider route, so a
 * deployment can see which route spent them instead of one combined figure.
 *
 * The scope switch picks which of the three scopes the rows state — today, this
 * month, or every folded day — and the rows are ordered by that scope's tokens,
 * so the busiest route reads first for the range on screen.
 *
 * The report carries route keys only, so a route the snapshot knows is labelled
 * with its display name and an unknown one falls back to the key itself.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ProviderUsage
 */

import { useMemo, useState } from 'react'
import type { QuotaCostView, QuotaProviderUsage } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtCost, fmtNumber, fmtPercent, fmtTokens } from './format.ts'
import css from './UsagePanel.module.css'

/** The range a row's figures cover. */
type Scope = 'today' | 'month' | 'allTime'

/** Dictionary keys for the scope chips, in the order they render. */
const SCOPE_KEYS: Readonly<Record<Scope, 'usage.today' | 'usage.month' | 'usage.allTime'>> = Object.freeze({
  today: 'usage.today',
  month: 'usage.month',
  allTime: 'usage.allTime',
})

/** Dictionary keys for the share line, which names the range it is a share of. */
const SHARE_KEYS: Readonly<Record<Scope, 'provider.share.today'
  | 'provider.share.month' | 'provider.share.allTime'>> = Object.freeze({
  today: 'provider.share.today',
  month: 'provider.share.month',
  allTime: 'provider.share.allTime',
})

/** One route's figures within the selected scope. */
interface ScopeFigures {
  tokens: number
  calls: number
  cacheHitPercent: number | undefined
  cost: QuotaCostView | undefined
}

/**
 * One route's figures for the selected range.
 * @param row - the route's folded usage.
 * @param scope - the selected range.
 * @returns the figures the row states.
 */
function figuresOf(row: QuotaProviderUsage, scope: Scope): ScopeFigures {
  if (scope === 'today') {
    return {
      tokens: row.todayTokens,
      calls: row.todayCalls,
      cacheHitPercent: row.todayCacheHitPercent,
      cost: row.todayCost,
    }
  }
  if (scope === 'month') {
    return {
      tokens: row.monthTokens,
      calls: row.monthCalls,
      cacheHitPercent: row.monthCacheHitPercent,
      cost: row.monthCost,
    }
  }
  return {
    tokens: row.totalTokens,
    calls: row.calls,
    cacheHitPercent: row.cacheHitPercent,
    cost: row.cost,
  }
}

/** The breakdown's props. */
export interface ProviderUsageProps {
  t: QuotaTranslate
  providers: readonly QuotaProviderUsage[]
  /** Route key → display name, for the routes the snapshot knows. */
  names: Readonly<Record<string, string>>
  /** All-time tokens across every route, the denominator of the all-time share. */
  allTimeTokens: number
  /** Tokens folded for today, the denominator of the today share. */
  todayTokens: number
  /** Tokens folded for this month, the denominator of the month share. */
  monthTokens: number
}

/**
 * One route's row: its figures for the selected range, its share of that range,
 * and the lifetime facts that belong to no single range.
 * @param props - the row and the labels it is rendered with.
 * @returns the row element.
 */
function ProviderRow({ t, row, names, scope, denominator }: {
  t: QuotaTranslate
  row: QuotaProviderUsage
  names: Readonly<Record<string, string>>
  scope: Scope
  denominator: number
}) {
  const name = names[row.provider]
  const figures = figuresOf(row, scope)
  const share = denominator <= 0 ? 0 : Math.round((figures.tokens / denominator) * 1000) / 10
  const meta = [
    t('provider.meta', {
      calls: fmtNumber(figures.calls),
      models: fmtNumber(row.models),
    }),
    figures.cacheHitPercent === undefined
      ? undefined
      : t('provider.cache', { percent: fmtPercent(figures.cacheHitPercent) }),
    t('provider.lastDay', { date: row.lastDay }),
  ].filter(part => part !== undefined)

  return <div className={css.providerRow}>
    <div className={css.providerHead}>
      <span className={css.providerName}>{name ?? row.provider}</span>
      {name === undefined ? null : <span className={css.providerId}>{row.provider}</span>}
      <span className={css.providerTokens}>{fmtTokens(figures.tokens)}</span>
    </div>
    <div className={css.bar}>
      <div className={css.barFill} style={{ width: `${Math.min(100, share)}%` }} />
    </div>
    <div className={css.providerFoot}>
      <span className={css.providerShare}>{t(SHARE_KEYS[scope], { percent: fmtPercent(share) })}</span>
      {figures.cost === undefined ? null : <span className={css.providerCost}>{fmtCost(figures.cost)}</span>}
    </div>
    <span className={css.providerMeta}>{meta.join(' · ')}</span>
  </div>
}

export function ProviderUsage({ t, providers, names, allTimeTokens, todayTokens, monthTokens }: ProviderUsageProps) {
  const [scope, setScope] = useState<Scope>('month')
  const denominator = scope === 'today' ? todayTokens : scope === 'month' ? monthTokens : allTimeTokens
  // Ordering follows the range on screen: the Host sorted by all time, and a
  // quiet day should still lead with the route that spent the most of it.
  const rows = useMemo(
    () => [...providers].sort((left, right) => figuresOf(right, scope).tokens - figuresOf(left, scope).tokens),
    [providers, scope],
  )

  if (providers.length === 0) return <p className={css.empty}>{t('provider.empty')}</p>

  return <div className={css.providerList}>
    <div className={css.selector} role="group" aria-label={t('provider.heading')}>
      {(Object.keys(SCOPE_KEYS) as Scope[]).map(key => <button
        key={key}
        type="button"
        className={`${css.selectorChip} ${key === scope ? css.selectorChipActive : ''}`}
        aria-pressed={key === scope}
        onClick={() => setScope(key)}
      >{t(SCOPE_KEYS[key])}</button>)}
    </div>
    {rows.map(row => <ProviderRow
      key={row.provider}
      t={t}
      row={row}
      names={names}
      scope={scope}
      denominator={denominator}
    />)}
  </div>
}
