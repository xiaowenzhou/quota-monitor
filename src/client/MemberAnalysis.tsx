import { useMemo, useState, type ReactNode } from 'react'
import type { QuotaProviderEntry, QuotaKeyWindow, QuotaKeyPeriod } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtNumber, fmtPercent, fmtTokens } from './format.ts'
import { periodRange, sliceUsage, sumUsage, type UsagePeriod } from './key-usage-period.ts'
import css from './MemberAnalysis.module.css'
import { UsageCharts } from './UsageCharts.tsx'

const periods = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth', 'last30'] as const
const buckets = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'] as const
const labels = ['usage.input', 'usage.output', 'usage.cacheRead', 'usage.cacheWrite'] as const

function billingRate(period: QuotaKeyPeriod | undefined): number | undefined {
  return period?.totalTokens && period.used !== undefined ? period.used / period.totalTokens * 1e6 : undefined
}

function BucketCells({ value }: { value: QuotaKeyWindow }) {
  return <>{buckets.map(key => <td key={key} className={css.numeric} title={fmtNumber(value[key])}>{fmtTokens(value[key])}</td>)}</>
}

/** Uses the parent snapshot and selection: opening the analysis never triggers another fetch. */
export function MemberAnalysis({ t, providers, provider, credential, capturedAt, onSelect, mode = 'team' }: {
  mode?: 'current' | 'team'
  t: QuotaTranslate
  providers: readonly QuotaProviderEntry[]
  provider: string | undefined
  credential: string | undefined
  capturedAt: number
  onSelect: (provider: string, credential: string | undefined) => void
}) {
  const [period, setPeriod] = useState<UsagePeriod>('thisMonth')
  const range = useMemo(() => periodRange(period, capturedAt), [period, capturedAt])
  const entry = providers.find(item => item.id === provider)
  const modelNames = useMemo(() => [...new Set((entry?.accounts ?? []).flatMap(account => [...(account.keyUsage?.models ?? []).map(model => model.model), ...(account.keyUsage?.points ?? []).map(point => point.model)]))].sort(), [entry])
  const rows = useMemo(() => (entry?.credentialRefs.length ? entry.credentialRefs : [undefined]).map(ref => {
    const account = entry?.accounts.find(item => item.credentialRef === ref) ?? (ref === undefined ? entry?.accounts[0] : undefined)
    const name = (ref === undefined ? undefined : entry?.keyNames?.[ref]) ?? account?.keyName ?? account?.accountName
      ?? (ref === undefined ? t('keypage.identity.default') : ref.replace(/^QUOTA_KEY_/, '').slice(0, 14) + '…')
    return { ref, name, account, usage: sliceUsage(account?.keyUsage, range) }
  }).sort((a, b) => (b.usage.totals?.totalTokens ?? -1) - (a.usage.totals?.totalTokens ?? -1)), [entry, range, t])
  const active = rows.find(row => row.ref === (entry?.activeCredentialRef ?? entry?.credentialRefs[0])) ?? rows[0]
  const visibleRows = mode === 'current' ? (active ? [active] : []) : rows
  const metered = visibleRows.filter(row => row.usage.totals !== undefined)
  const total = sumUsage(metered.map(row => row.usage.totals!))
  const selected = mode === 'current' ? active : rows.find(row => row.ref === credential) ?? rows[0]
  const detail = selected?.usage
  const partial = visibleRows.some(row => row.usage.coverage === 'partial')
  const retained = visibleRows.flatMap(row => row.account?.keyUsageFetchedAt === undefined ? [] : [row.account.keyUsageFetchedAt])
  const retainedAt = retained.length ? new Date(Math.min(...retained)).toLocaleString(undefined, { timeZone: 'Asia/Shanghai', hour12: false }) : undefined
  const fullTotal = metered.length === visibleRows.length && !partial
  const cacheShare = total.totalTokens > 0 ? total.cacheReadTokens / total.totalTokens * 100 : undefined
  const header = <tr><th>{t('analysis.model')}</th><th>{t('analysis.calls')}</th>{labels.map(label => <th key={label}>{t(label)}</th>)}<th>{t('analysis.tokens')}</th></tr>
  const billing = selected?.account?.keyUsage?.period
  const price = billing?.totalTokens && billing.used !== undefined ? billing.used / billing.totalTokens * 1e6 : undefined
  const account = selected?.account
  const used = billing?.used ?? account?.used
  const usedPercent = used !== undefined && account?.limit !== undefined && account.limit > 0
    ? Math.min(100, Math.max(0, used / account.limit * 100))
    : undefined
  const exact = (title: string, label: string, head: ReactNode, body: ReactNode) => <details className={css.more}>
    <summary><span className={css.chevron} aria-hidden="true" />{title}</summary>
    <div className={css.tableWrap}><table className={css.table} aria-label={label}><thead>{head}</thead><tbody>{body}</tbody></table></div>
  </details>

  return <section className={css.root} aria-label={t(mode === 'current' ? 'analysis.current' : 'analysis.title')}>
    <div className={css.head}>
      <h2 className={css.title}>{t(mode === 'current' ? 'analysis.current' : 'analysis.title')}</h2>
      <p className={css.meta}>{mode === 'current' ? `${entry?.name ?? ''} · ${selected?.name ?? '—'}` : t('analysis.hint')}</p>
    </div>
    {mode === 'current' && <div className={css.hero}>
      <div className={css.heroMain}>
        <span className={css.label}>{t('account.remaining')}</span>
        <div className={css.heroFigure}>
          <strong className={css.heroValue}>{fmtAmount(account?.remaining, account?.currency)}</strong>
          {account?.status === 'ok' && <span className={css.badgeOk}>{t('status.ok')}</span>}
        </div>
        {account?.status !== 'ok' && <span className={css.statusNote}>{account?.reason ?? t('status.unavailable')}</span>}
      </div>
      <dl className={css.heroStats}>
        <div><dt>{t('keypage.tile.used')} · {billing?.periodKey ?? '—'}</dt><dd>{fmtAmount(used, account?.currency)}</dd></div>
        <div><dt>{t('analysis.limit')}</dt><dd>{fmtAmount(account?.limit, account?.currency)}</dd></div>
      </dl>
      {usedPercent !== undefined && <div className={css.heroMeter}>
        <span className={css.meter} aria-hidden="true"><i style={{ width: `${usedPercent}%` }} /></span>
        <span className={css.meta}>{t('keypage.key.percent', { percent: fmtPercent(usedPercent) })}</span>
      </div>}
    </div>}
    <div className={css.periodBar}>
      <div className={css.pills} role="group" aria-label={t('analysis.period')}>
        {periods.map(value => <button type="button" key={value} className={css.pill} aria-pressed={period === value} onClick={() => setPeriod(value)}>{t(`analysis.${value}`)}</button>)}
      </div>
      <span className={css.meta}>{range.start} — {range.end}</span>
    </div>
    {mode === 'team' && <p className={css.meta}>{t('analysis.scope')}</p>}
    {account && account.status !== 'ok' && account.keyUsage === undefined && <p role="status" className={css.note}>{t('analysis.readFailed', { reason: account.reason ?? account.status })}</p>}
    {retainedAt && <p role="status" className={css.note}>{t('analysis.retained', { count: retained.length, time: retainedAt })}</p>}
    {partial && <p role="status" className={css.note}>{t('analysis.coverage')}</p>}
    <div className={css.tiles}>
      <div className={css.tile}><span className={css.label}>{t('analysis.tokens')}{fullTotal ? '' : ` · ${t('analysis.partial')}`}</span><strong className={css.tileValue}>{metered.length ? fmtTokens(total.totalTokens) : '—'}</strong><span className={css.meta}>{range.start} — {range.end}</span></div>
      <div className={css.tile}><span className={css.label}>{t('analysis.calls')}</span><strong className={css.tileValue}>{metered.length ? fmtNumber(total.calls) : '—'}</strong></div>
      <div className={css.tile}><span className={css.label}>{t('analysis.cacheShare')}</span><strong className={css.tileValue}>{fmtPercent(cacheShare)}</strong></div>
      {mode === 'team' && <div className={css.tile}><span className={css.label}>{t('analysis.members')}</span><strong className={css.tileValue}>{metered.filter(row => (row.usage.totals?.totalTokens ?? 0) > 0 || (row.usage.totals?.calls ?? 0) > 0).length} / {rows.length}</strong></div>}
    </div>
    {mode === 'team' && <ol className={css.memberList} aria-label={t('analysis.member')}>
      {rows.map((row, index) => <li key={row.ref ?? 'default'}><button type="button" className={css.memberCard} aria-label={row.name} aria-pressed={row === selected} onClick={() => entry && onSelect(entry.id, row.ref)}>
        <span className={css.memberRank}>{index + 1}</span>
        <span className={css.memberBody}><span className={css.memberTop}><strong title={row.name}>{row.name}</strong><span>{fmtTokens(row.usage.totals?.totalTokens)}</span></span>
          <span className={css.meter}><i style={{ width: `${total.totalTokens > 0 ? (row.usage.totals?.totalTokens ?? 0) / total.totalTokens * 100 : 0}%` }} /></span>
          <span className={css.memberMeta}><span>{t('usage.calls', { calls: fmtNumber(row.usage.totals?.calls) })}</span><span>{t('keypage.key.cacheShare', { percent: fmtPercent(row.usage.totals && row.usage.totals.totalTokens > 0 ? row.usage.totals.cacheReadTokens / row.usage.totals.totalTokens * 100 : undefined) })}</span><span>{t('keypage.key.rateShort', { amount: fmtAmount(billingRate(row.account?.keyUsage?.period), row.account?.currency) })}</span></span>
          {row.usage.coverage !== 'complete' && <span className={css.meta}>{t(row.usage.coverage === 'partial' ? 'analysis.partial' : 'analysis.unavailable')}</span>}
        </span>
      </button></li>)}
    </ol>}
    {mode === 'team' && exact(t('analysis.exactMembers'), t('analysis.member'),
      <tr><th>{t('analysis.member')}</th><th>{t('analysis.tokens')}</th><th>{t('analysis.share')}</th><th>{t('analysis.calls')}</th><th>{t('analysis.activeDays')}</th><th>{t('analysis.cacheShare')}</th><th>{t('keypage.tile.used')}</th><th>{t('analysis.currentRate')}</th></tr>,
      rows.map(row => <tr key={row.ref ?? 'default'}>
        <td>{row.name}{row.usage.coverage !== 'complete' && <span className={css.meta}> {t(row.usage.coverage === 'partial' ? 'analysis.partial' : 'analysis.unavailable')}</span>}</td>
        <td title={fmtNumber(row.usage.totals?.totalTokens)}>{fmtTokens(row.usage.totals?.totalTokens)}</td>
        <td>{fmtPercent(row.usage.totals && total.totalTokens > 0 ? row.usage.totals.totalTokens / total.totalTokens * 100 : undefined)}</td>
        <td>{fmtNumber(row.usage.totals?.calls)}</td>
        <td>{row.usage.totals ? row.usage.daily.filter(day => day.totalTokens > 0 || (day.calls ?? 0) > 0).length : '—'}</td>
        <td>{fmtPercent(row.usage.totals && row.usage.totals.totalTokens > 0 ? row.usage.totals.cacheReadTokens / row.usage.totals.totalTokens * 100 : undefined)}</td>
        <td title={row.account?.keyUsage?.period?.periodKey}>{fmtAmount(row.account?.keyUsage?.period?.used, row.account?.currency)}</td>
        <td title={row.account?.keyUsage?.period?.periodKey}>{fmtAmount(billingRate(row.account?.keyUsage?.period), row.account?.currency)}</td>
      </tr>))}
    <div className={css.subHead}><h3 className={css.subTitle}>{selected?.name} · {t('charts.overview')}</h3><span className={css.meta}>{range.start} — {range.end}</span></div>
    <UsageCharts modelNames={modelNames} t={t} totals={detail?.totals} models={detail?.models ?? []} daily={detail?.daily ?? []} range={range} startDate={selected?.account?.keyUsage?.startDate} endDate={selected?.account?.keyUsage?.endDate} />
    <div className={css.extras}>
      {detail?.models.length
        ? exact(t('analysis.exactModels'), t('analysis.models'), header,
          detail.models.map(model => <tr key={model.model}><td className={css.mono}>{model.model}</td><td>{fmtNumber(model.calls)}</td><BucketCells value={model} /><td title={fmtNumber(model.totalTokens)}>{fmtTokens(model.totalTokens)}</td></tr>))
        : <p className={css.empty}>{t('analysis.empty')}</p>}
      {exact(`${t('analysis.daily')} · ${selected?.name ?? ''}`, t('analysis.daily'),
        <tr><th>{t('analysis.date')}</th><th>{t('analysis.calls')}</th>{labels.map(label => <th key={label}>{t(label)}</th>)}<th>{t('analysis.tokens')}</th></tr>,
        detail?.daily.map(day => <tr key={day.date}><td>{day.date}</td><td>{fmtNumber(day.calls)}</td><BucketCells value={day} /><td>{fmtTokens(day.totalTokens)}</td></tr>))}
    </div>
    <div className={css.footnotes}>
      <p>{t('analysis.money')}</p>
      {billing && <p>{selected?.name} · {billing.periodKey} · {t('keypage.tile.used')}: {fmtAmount(billing.used, billing.currency ?? selected?.account?.currency)} · {t('keypage.tile.periodTokens', { tokens: fmtTokens(billing.totalTokens) })}{price === undefined ? '' : ` · ${t('keypage.key.rateShort', { amount: fmtAmount(price, billing.currency ?? selected?.account?.currency) })}`}</p>}
      <p>{t('analysis.freshness', { date: entry?.accounts.find(item => item.keyUsage?.endDate)?.keyUsage?.endDate ?? '—' })}</p>
    </div>
  </section>
}
