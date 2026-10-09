/**
 * The provider breakdown: folded token totals per provider route.
 *
 * The panel's statistics follow one selected route, so this section is how that
 * route is chosen — a row selects it — and it states what the choice costs: a
 * compact view of the selected route against every route's total, or the whole
 * list once the reader asks for it. The range chips pick which scope the rows
 * state, and the rows are ordered by that scope's tokens.
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
  /** The route the panel's statistics follow. */
  selected: string | undefined
  /** Select a route, which re-scopes the statistics above this section. */
  onSelect: (id: string) => void
  /** All-time tokens across every route, the denominator of the all-time share. */
  allTimeTokens: number
  /** Tokens folded for today, the denominator of the today share. */
  todayTokens: number
  /** Tokens folded for this month, the denominator of the month share. */
  monthTokens: number
}

/**
 * One route's row: its figures for the selected range, its share of that range,
 * and the lifetime facts that belong to no single range. Selecting it makes it
 * the route the rest of the panel describes.
 * @param props - the row and the state it renders against.
 * @returns the row element.
 */
function ProviderRow({ t, row, names, scope, denominator, selected, onSelect }: {
  t: QuotaTranslate
  row: QuotaProviderUsage
  names: Readonly<Record<string, string>>
  scope: Scope
  denominator: number
  selected: boolean
  onSelect: (id: string) => void
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

  return <button
    type="button"
    className={`${css.providerRow} ${selected ? css.providerRowActive : ''}`}
    aria-pressed={selected}
    onClick={() => onSelect(row.provider)}
  >
    <span className={css.providerHead}>
      <span className={css.providerName}>{name ?? row.provider}</span>
      {name === undefined ? null : <span className={css.providerId}>{row.provider}</span>}
      <span className={css.providerTokens}>{fmtTokens(figures.tokens)}</span>
    </span>
    <span className={css.bar}>
      <span className={css.barFill} style={{ width: `${Math.min(100, share)}%` }} />
    </span>
    <span className={css.providerFoot}>
      <span className={css.providerShare}>{t(SHARE_KEYS[scope], { percent: fmtPercent(share) })}</span>
      {figures.cost === undefined ? null : <span className={css.providerCost}>{fmtCost(figures.cost)}</span>}
    </span>
    <span className={css.providerMeta}>{meta.join(' · ')}</span>
  </button>
}

export function ProviderUsage({
  t,
  providers,
  names,
  selected,
  onSelect,
  allTimeTokens,
  todayTokens,
  monthTokens,
}: ProviderUsageProps) {
  const [scope, setScope] = useState<Scope>('month')
  const [expanded, setExpanded] = useState(false)
  const denominator = scope === 'today' ? todayTokens : scope === 'month' ? monthTokens : allTimeTokens
  // Ordering follows the range on screen: the Host sorted by all time, and a
  // quiet day should still lead with the route that spent the most of it.
  const sorted = useMemo(
    () => [...providers].sort((left, right) => figuresOf(right, scope).tokens - figuresOf(left, scope).tokens),
    [providers, scope],
  )

  if (providers.length === 0) return <p className={css.empty}>{t('provider.empty')}</p>

  const chosen = sorted.find(row => row.provider === selected)
  // A route with no usage in the selected range does not get a row: listing it
  // would present a route that only ever ran months ago as if it were spending
  // now. The focused route is always shown, so the section never hides the
  // choice it describes.
  const active = sorted.filter(row => figuresOf(row, scope).tokens > 0)
  const rows = expanded ? active : [chosen ?? active[0] ?? sorted[0]!]

  return <div className={css.providerList}>
    <div className={css.providerTools}>
      <div className={css.selector} role="group" aria-label={t('provider.heading')}>
        {(Object.keys(SCOPE_KEYS) as Scope[]).map(key => <button
          key={key}
          type="button"
          className={`${css.selectorChip} ${key === scope ? css.selectorChipActive : ''}`}
          aria-pressed={key === scope}
          onClick={() => setScope(key)}
        >{t(SCOPE_KEYS[key])}</button>)}
      </div>
      {providers.length === 1
        ? null
        : <button
          type="button"
          className={css.providerToggle}
          aria-expanded={expanded}
          onClick={() => setExpanded(current => !current)}
        >{expanded ? t('provider.showSelected') : t('provider.showAll', { count: String(providers.length) })}</button>}
    </div>
    {rows.map(row => <ProviderRow
      key={row.provider}
      t={t}
      row={row}
      names={names}
      scope={scope}
      denominator={denominator}
      selected={row.provider === selected}
      onSelect={onSelect}
    />)}
    {sorted.length > active.length
      ? <p className={css.sectionMeta}>
        {t('provider.idle', { count: String(sorted.length - active.length) })}
      </p>
      : null}
  </div>
}
