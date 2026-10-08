/**
 * The selected day's breakdown: one row per `provider · model`, ordered by
 * token total, with the derived spend when prices are configured.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/DayBreakdown
 */

import type { QuotaDayUsage } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtCost, fmtNumber, fmtTokens } from './format.ts'
import css from './UsagePanel.module.css'

/** The breakdown's props. */
export interface DayBreakdownProps {
  t: QuotaTranslate
  date: string | undefined
  day: QuotaDayUsage | undefined
}

export function DayBreakdown({ t, date, day }: DayBreakdownProps) {
  if (date === undefined) return <p className={css.empty}>{t('detail.hint')}</p>
  const priced = day?.cost !== undefined

  return <div className={css.section}>
    <div className={css.sectionHead}>
      <h2 className={css.sectionTitle}>{t('detail.heading', { date })}</h2>
      {day?.cost === undefined
        ? null
        : <p className={css.sectionMeta}>{fmtCost(day.cost)}</p>}
    </div>
    {day === undefined || day.models.length === 0
      ? <p className={css.empty}>{t('detail.empty')}</p>
      : <div className={css.tableCard}>
        <table className={css.table}>
          <thead>
            <tr>
              <th scope="col">{t('detail.provider')}</th>
              <th scope="col">{t('detail.model')}</th>
              <th scope="col" className={css.numeric}>{t('detail.tokens')}</th>
              <th scope="col" className={css.numeric}>{t('detail.calls')}</th>
              {priced ? <th scope="col" className={css.numeric}>{t('detail.cost')}</th> : null}
            </tr>
          </thead>
          <tbody>
            {day.models.map(row => <tr key={`${row.provider}/${row.model}`}>
              <td>{row.provider}</td>
              <td>{row.model}</td>
              <td className={css.numeric}>{fmtTokens(row.totalTokens)}</td>
              <td className={css.numeric}>{fmtNumber(row.calls)}</td>
              {priced ? <td className={css.numeric}>{fmtCost(row.cost)}</td> : null}
            </tr>)}
          </tbody>
        </table>
      </div>}
  </div>
}
