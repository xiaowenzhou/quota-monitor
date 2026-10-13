/**
 * Per-model token usage and configured price rates for the selected provider.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ModelUsage
 */
import { useMemo, useState } from 'react'
import type { QuotaModelSummary } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtCost, fmtNumber, fmtPercent } from './format.ts'
import css from './UsagePanel.module.css'

/** Time range used by the model table. */
type Scope = 'today' | 'month' | 'all'

const SCOPES = {
  today: 'usage.today',
  month: 'usage.month',
  all: 'usage.allTime',
} as const

/** Input reported by the Host for the panel's selected provider. */
export interface ModelUsageProps {
  t: QuotaTranslate
  models: readonly QuotaModelSummary[]
  names: Readonly<Record<string, string>>
}

/**
 * Render model counters by range, with partial spend and current rate labels.
 * @param props - Model summaries, provider names, and localized copy.
 * @returns The model usage table or an empty-state message.
 */
export function ModelUsage({ t, models, names }: ModelUsageProps) {
  const [scope, setScope] = useState<Scope>('month')
  const sorted = useMemo(() => [...models].sort((a, b) =>
    b[scope].totalTokens - a[scope].totalTokens
      || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model)), [models, scope])

  return <div className={css.modelUsage}>
    <div className={css.selector} role="group" aria-label={t('model.range')}>
      {(Object.keys(SCOPES) as Scope[]).map(key => <button
        key={key}
        type="button"
        className={`${css.selectorChip} ${scope === key ? css.selectorChipActive : ''}`}
        aria-pressed={scope === key}
        onClick={() => setScope(key)}
      >{t(SCOPES[key])}</button>)}
    </div>
    <p className={css.sectionMeta}>{t('model.estimate')}</p>
    {sorted.length === 0 ? <p className={css.empty}>{t('model.empty')}</p> : <div className={css.tableCard}>
      <table className={css.table}>
        <thead><tr>
          <th scope="col">{t('detail.model')}</th>
          <th scope="col">{t('detail.provider')}</th>
          <th scope="col">{t('model.calls')}</th>
          <th scope="col">{t('usage.input')}</th>
          <th scope="col">{t('usage.output')}</th>
          <th scope="col">{t('usage.cacheRead')}</th>
          <th scope="col">{t('usage.cacheWrite')}</th>
          <th scope="col">{t('usage.cacheHit')}</th>
          <th scope="col">{t('detail.cost')}</th>
          <th scope="col">{t('model.rates')}</th>
        </tr></thead>
        <tbody>{sorted.map((row) => {
          const figures = row[scope]
          const rate = row.rate
          return <tr key={JSON.stringify([row.provider, row.model])}>
            <th scope="row" className={css.mono}>{row.model}</th>
            <td>{names[row.provider] ?? row.provider}
              {names[row.provider] === undefined ? null : <span className={css.modelNote}>{row.provider}</span>}
            </td>
            <td className={css.numeric}>{fmtNumber(figures.calls)}</td>
            <td className={css.numeric}>{fmtNumber(figures.inputTokens)}</td>
            <td className={css.numeric}>{fmtNumber(figures.outputTokens)}</td>
            <td className={css.numeric}>{fmtNumber(figures.cacheReadTokens)}</td>
            <td className={css.numeric}>{fmtNumber(figures.cacheWriteTokens)}</td>
            <td className={css.numeric}>{fmtPercent(figures.cacheHitPercent)}</td>
            <td className={css.numeric}>{fmtCost(figures.cost)}
              {figures.cost === undefined
                ? <span className={css.modelNote}>{t('model.unpriced')}</span>
                : figures.cost.unpricedCalls > 0
                  ? <span className={css.modelNote}>{t('cost.unpriced', { calls: fmtNumber(figures.cost.unpricedCalls) })}</span>
                  : null}
            </td>
            <td>{rate === undefined ? t('model.noRates') : <>
              <span className={css.modelRate}>{t('model.rate.input', { amount: fmtAmount(rate.inputPerMillion, rate.currency) })}</span>
              <span className={css.modelRate}>{t('model.rate.output', { amount: fmtAmount(rate.outputPerMillion, rate.currency) })}</span>
              {rate.cacheReadPerMillion === undefined ? null : <span className={css.modelRate}>
                {t('model.rate.cacheRead', { amount: fmtAmount(rate.cacheReadPerMillion, rate.currency) })}
              </span>}
              {rate.cacheWritePerMillion === undefined ? null : <span className={css.modelRate}>
                {t('model.rate.cacheWrite', { amount: fmtAmount(rate.cacheWritePerMillion, rate.currency) })}
              </span>}
              {rate.from === undefined ? null : <span className={css.modelNote}>{t('model.rate.from', { date: rate.from })}</span>}
            </>}</td>
          </tr>
        })}</tbody>
      </table>
    </div>}
  </div>
}
