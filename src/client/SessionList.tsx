/**
 * The session list: which sessions spent the tokens, ordered by their latest
 * activity.
 *
 * A session is named by its id and its routes, never by its title: a title is
 * text the user wrote, and this panel's accounting deliberately holds no prompt
 * text.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/SessionList
 */

import type { QuotaSessionUsage } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtCost, fmtDateTime, fmtNumber, fmtTokens } from './format.ts'
import css from './UsagePanel.module.css'

/** How many rows the list shows before it stops, so one busy corpus stays readable. */
const MAX_ROWS = 20

/** The list's props. */
export interface SessionListProps {
  t: QuotaTranslate
  sessions: readonly QuotaSessionUsage[]
}

export function SessionList({ t, sessions }: SessionListProps) {
  if (sessions.length === 0) return <p className={css.empty}>{t('session.empty')}</p>
  const rows = sessions.slice(0, MAX_ROWS)
  const priced = rows.some(session => session.cost !== undefined)

  return <>
    <div className={css.tableCard}>
      <table className={css.table}>
        <thead>
          <tr>
            <th scope="col">{t('session.id')}</th>
            <th scope="col">{t('session.routes')}</th>
            <th scope="col" className={css.numeric}>{t('session.tokens')}</th>
            <th scope="col" className={css.numeric}>{t('session.calls')}</th>
            {priced ? <th scope="col" className={css.numeric}>{t('session.cost')}</th> : null}
            <th scope="col">{t('session.lastActive')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(session => <tr key={session.id}>
            <td className={css.mono}>{session.id}</td>
            <td className={css.routes}>{session.routes.join(', ')}</td>
            <td className={css.numeric}>{fmtTokens(session.totalTokens)}</td>
            <td className={css.numeric}>{fmtNumber(session.calls)}</td>
            {priced ? <td className={css.numeric}>{fmtCost(session.cost)}</td> : null}
            <td>{fmtDateTime(session.lastActiveAt)}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    {sessions.length > rows.length
      ? <p className={css.sectionMeta}>{t('session.more', { count: String(rows.length) })}</p>
      : null}
  </>
}
