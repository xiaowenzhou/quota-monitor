/**
 * The token totals row: today, this month, and all time, each with its derived
 * spend and its input/output/cache split, followed by the budget windows.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/TotalsRow
 */

import type {
  QuotaBudgetStatus,
  QuotaBudgetWindow,
  QuotaCostView,
  QuotaTokenTotals,
  QuotaUsageReport,
} from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtCost, fmtPercent, fmtTime, fmtTokens } from './format.ts'
import css from './UsagePanel.module.css'

/** Dictionary key naming each budget state. */
const BUDGET_STATUS_KEYS: Readonly<Record<QuotaBudgetStatus, 'budget.status.normal'
  | 'budget.status.warning' | 'budget.status.critical'
  | 'budget.status.unknown'>> = Object.freeze({
  normal: 'budget.status.normal',
  warning: 'budget.status.warning',
  critical: 'budget.status.critical',
  unknown: 'budget.status.unknown',
})

/** Severity class for a budget window. */
function budgetTone(status: QuotaBudgetStatus): string {
  if (status === 'critical') return css.critical ?? ''
  return status === 'warning' ? css.warning ?? '' : ''
}

/** One totals tile: its headline figure, its derived spend, and its split. */
function TotalsCard({ t, label, totals, cost }: {
  t: QuotaTranslate
  label: string
  totals: QuotaTokenTotals | undefined
  cost: QuotaCostView | undefined
}) {
  return <div className={css.totalCard}>
    <span className={css.totalLabel}>{label}</span>
    <span className={css.totalValue}>{fmtTokens(totals?.totalTokens)}</span>
    {cost === undefined
      ? null
      : <span className={css.totalCost}>{fmtCost(cost)}</span>}
    {cost === undefined || cost.unpricedCalls === 0
      ? null
      : <span className={css.totalNote}>
        {t('cost.unpriced', { calls: String(cost.unpricedCalls) })}
      </span>}
    <dl className={css.totalSplit}>
      <div className={css.splitRow}>
        <dt>{t('usage.input')}</dt>
        <dd>{fmtTokens(totals?.inputTokens)}</dd>
      </div>
      <div className={css.splitRow}>
        <dt>{t('usage.output')}</dt>
        <dd>{fmtTokens(totals?.outputTokens)}</dd>
      </div>
      <div className={css.splitRow}>
        <dt>{t('usage.cacheRead')}</dt>
        <dd>{fmtTokens(totals?.cacheReadTokens)}</dd>
      </div>
      <div className={css.splitRow}>
        <dt>{t('usage.cacheWrite')}</dt>
        <dd>{fmtTokens(totals?.cacheWriteTokens)}</dd>
      </div>
    </dl>
  </div>
}

/** One budget window: its ceiling, its spend, and a bar of the used share. */
function BudgetCard({ t, label, currency, window: entry }: {
  t: QuotaTranslate
  label: string
  currency: string
  window: QuotaBudgetWindow
}) {
  const spent: QuotaCostView = {
    amount: entry.spent,
    currency,
    unpricedCalls: entry.unpricedCalls,
  }
  const limit: QuotaCostView = { amount: entry.limit, currency, unpricedCalls: 0 }
  return <div className={css.budgetCard}>
    <div className={css.budgetHead}>
      <span className={css.budgetName}>{label}</span>
      <span className={`${css.budgetValue} ${budgetTone(entry.status)}`}>
        {t('budget.spentOfLimit', { spent: fmtCost(spent), limit: fmtCost(limit) })}
      </span>
    </div>
    <div className={css.bar}>
      <div
        className={`${css.barFill} ${budgetTone(entry.status)}`}
        style={{ width: `${Math.min(100, entry.percentUsed)}%` }}
      />
    </div>
    <span className={css.windowMeta}>
      {t(BUDGET_STATUS_KEYS[entry.status])}
      {' · '}
      {fmtPercent(entry.percentUsed)}
      {entry.unpricedCalls === 0
        ? ''
        : ` · ${t('cost.unpriced', { calls: String(entry.unpricedCalls) })}`}
    </span>
  </div>
}

/** The totals row's props. */
export interface TotalsRowProps {
  t: QuotaTranslate
  usage: QuotaUsageReport | undefined
}

export function TotalsRow({ t, usage }: TotalsRowProps) {
  const budgets = usage?.budgets
  return <div className={css.totals}>
    <div className={css.totalGrid}>
      <TotalsCard t={t} label={t('usage.today')} totals={usage?.todayTotals} cost={usage?.todayCost} />
      <TotalsCard t={t} label={t('usage.month')} totals={usage?.monthTotals} cost={usage?.monthCost} />
      <TotalsCard t={t} label={t('usage.allTime')} totals={usage?.allTimeTotals} cost={usage?.allTimeCost} />
    </div>

    {budgets === undefined ? null : <div className={css.budgetGrid}>
      {budgets.daily === undefined ? null : <BudgetCard
        t={t}
        label={t('budget.daily')}
        currency={budgets.currency}
        window={budgets.daily}
      />}
      {budgets.monthly === undefined ? null : <BudgetCard
        t={t}
        label={t('budget.monthly')}
        currency={budgets.currency}
        window={budgets.monthly}
      />}
    </div>}

    <p className={css.totalsMeta}>
      {usage === undefined
        ? t('usage.empty')
        : usage.folding
          ? t('usage.folding')
          : <>
            {t('usage.cacheHitToday', { percent: fmtPercent(usage.todayCacheHitPercent) })}
            {' · '}
            {t('usage.sessions', { count: String(usage.sessionCount) })}
            {usage.foldedAt > 0 ? ` · ${t('usage.foldedAt', { time: fmtTime(usage.foldedAt) })}` : ''}
            {usage.allTimeCost === undefined ? ` · ${t('cost.unconfigured')}` : ''}
          </>}
    </p>
  </div>
}
