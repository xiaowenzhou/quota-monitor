/**
 * The usage panel: the provider account card, token totals with derived spend
 * and budgets, the month calendar, the selected day's breakdown, the session
 * list, and the export row.
 *
 * Every figure arrives from the `quotaMonitor` Remote face. The panel derives
 * presentation only — it never computes a total the Host did not report, so
 * one authority owns the accounting.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsagePanel
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  QuotaAccount,
  QuotaAccountRequest,
  QuotaExportDocument,
  QuotaExportKind,
  QuotaExportRequest,
  QuotaResetStatsRequest,
  QuotaSetBalancesRequest,
  QuotaSnapshot,
  QuotaUsageReport,
  QuotaUsageRequest,
} from '../types.ts'
import type {} from './locales.ts'
import { AccountCard } from './AccountCard.tsx'
import { ExportBar } from './ExportBar.tsx'
import { UsageHeatmap } from './UsageHeatmap.tsx'
import { DayBreakdown } from './DayBreakdown.tsx'
import { ProviderUsage } from './ProviderUsage.tsx'
import { SessionList } from './SessionList.tsx'
import { TotalsRow } from './TotalsRow.tsx'
import css from './UsagePanel.module.css'

/** The mounted `ctx.remote.quotaMonitor` face the panel talks to. */
export interface QuotaMonitorApi {
  getSnapshot(): Promise<RemoteResult<QuotaSnapshot>>
  getAccount(request: QuotaAccountRequest): Promise<RemoteResult<QuotaAccount>>
  getUsage(request: QuotaUsageRequest): Promise<RemoteResult<QuotaUsageReport>>
  exportUsage(request: QuotaExportRequest): Promise<RemoteResult<QuotaExportDocument>>
  setBalances(request: QuotaSetBalancesRequest): Promise<RemoteResult<Record<string, number>>>
  resetStats(request: QuotaResetStatsRequest): Promise<RemoteResult<QuotaSnapshot>>
}

/** Owner share handed down by the main-panel entry. */
export interface UsagePanelInjected {
  quota: QuotaMonitorApi
}

/** Composed props of the panel entry: root runtime seat, `t`, and the Host face. */
export type UsagePanelProps =
  PropsRuntime<'main'> & PropsLocale<'quotaMonitor'> & InjectFace<UsagePanelInjected>

/** The panel's namespace-bound translate, threaded into its rows. */
export type QuotaTranslate = TranslateNS<'quotaMonitor'>

/** The local calendar month a date string belongs to, as `YYYY-MM`. */
function monthOf(date: string): string {
  return date.slice(0, 7)
}

/** The header's mark: a compact bar chart, the panel's own subject. */
function BrandGlyph() {
  return <svg className={css.brandGlyph} viewBox="0 0 24 24" aria-hidden="true">
    <g fill="currentColor">
      <rect x="3" y="13" width="4" height="8" rx="1.4" />
      <rect x="10" y="8" width="4" height="13" rx="1.4" />
      <rect x="17" y="3" width="4" height="18" rx="1.4" />
    </g>
  </svg>
}

export function UsagePanel({ t, quota }: UsagePanelProps) {
  const [snapshot, setSnapshot] = useState<QuotaSnapshot | undefined>()
  const [account, setAccount] = useState<QuotaAccount | undefined>()
  const [usage, setUsage] = useState<QuotaUsageReport | undefined>()
  const [provider, setProvider] = useState<string | undefined>()
  const [month, setMonth] = useState<string | undefined>()
  const [selectedDay, setSelectedDay] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)

  const loadSnapshot = useCallback(async () => {
    const result = await quota.getSnapshot()
    if (!result.ok) return
    setSnapshot(result.value)
    // The first provider becomes the selection only while none is held, so a
    // background refresh never moves the card out from under the reader.
    setProvider(current => current ?? result.value.providers[0]?.id)
  }, [quota])

  const loadUsage = useCallback(async (refresh: boolean) => {
    const result = await quota.getUsage({ refresh })
    if (result.ok) setUsage(result.value)
  }, [quota])

  const loadAccount = useCallback(async (id: string, refresh: boolean) => {
    const result = await quota.getAccount({ provider: id, refresh })
    if (result.ok) setAccount(result.value)
  }, [quota])

  useEffect(() => {
    void loadSnapshot()
    void loadUsage(false)
  }, [loadSnapshot, loadUsage])

  useEffect(() => {
    if (provider === undefined) return
    setAccount(undefined)
    void loadAccount(provider, false)
  }, [provider, loadAccount])

  const refreshAll = useCallback(async () => {
    setBusy(true)
    try {
      await loadSnapshot()
      await Promise.all([
        loadUsage(true),
        provider === undefined ? Promise.resolve() : loadAccount(provider, true),
      ])
    } finally {
      setBusy(false)
    }
  }, [loadSnapshot, loadUsage, loadAccount, provider])

  const resetStats = useCallback(async () => {
    const result = await quota.resetStats({})
    if (result.ok) setSnapshot(result.value)
  }, [quota])

  const setManual = useCallback(async (id: string, value: number) => {
    await quota.setBalances({ balances: { [id]: value } })
    await loadSnapshot()
    await loadAccount(id, false)
  }, [quota, loadSnapshot, loadAccount])

  const exportUsage = useCallback(async (kind: QuotaExportKind) => {
    const result = await quota.exportUsage({ kind })
    return  result.ok ? result.value : undefined
  }, [quota])

  // The month shown defaults to the one carrying today's figures, and stays
  // put once the reader moves it.
  const activeMonth = month ?? (usage === undefined ? undefined : monthOf(usage.today))
  const days = usage?.days ?? []
  const selected = useMemo(
    () => days.find(day => day.date === selectedDay),
    [days, selectedDay],
  )

  const providers = snapshot?.providers ?? []
  const row = snapshot?.rows.find(entry => entry.id === provider)
  // The folded report carries route keys; the snapshot is what knows a display
  // name for one, so the two are joined here rather than in the Host.
  const providerNames = useMemo(
    () => Object.fromEntries(providers.map(entry => [entry.id, entry.name])),
    [providers],
  )

  return <div className={css.panel}>
    <header className={css.header}>
      <div className={css.brand}>
        <span className={css.brandMark}><BrandGlyph /></span>
        <div>
          <h1 className={css.title}>{t('panel.title')}</h1>
          <p className={css.subtitle}>{t('panel.subtitle')}</p>
        </div>
      </div>
      <div className={css.actions}>
        <button
          type="button"
          className={`${css.action} ${css.actionPrimary}`}
          onClick={() => void refreshAll()}
          disabled={busy}
        >{busy ? t('action.refreshing') : t('action.refresh')}</button>
        <button
          type="button"
          className={css.action}
          onClick={() => void resetStats()}
        >{t('action.reset')}</button>
      </div>
    </header>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('account.heading')}</h2>
      </div>
      {providers.length === 0
        ? <p className={css.empty}>{t('account.empty')}</p>
        : <AccountCard
          t={t}
          providers={providers}
          selected={provider}
          account={account}
          manualTotal={row?.balance?.total}
          manualRemaining={row?.balance?.remaining}
          onSelect={setProvider}
          onRefresh={() => {
            if (provider !== undefined) void loadAccount(provider, true)
          }}
          onManualChange={(id, value) => { void setManual(id, value) }}
        />}
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('usage.heading')}</h2>
      </div>
      <TotalsRow t={t} usage={usage} />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('provider.heading')}</h2>
      </div>
      <ProviderUsage
        t={t}
        providers={usage?.providers ?? []}
        names={providerNames}
        totalTokens={usage?.allTimeTotals.totalTokens ?? 0}
      />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('heatmap.heading')}</h2>
      </div>
      <UsageHeatmap
        t={t}
        days={days}
        month={activeMonth}
        today={usage?.today}
        selected={selectedDay}
        onSelect={setSelectedDay}
        onMonthChange={setMonth}
      />
    </section>

    <DayBreakdown t={t} date={selectedDay} day={selected} />

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('session.heading')}</h2>
      </div>
      <SessionList t={t} sessions={usage?.sessions ?? []} />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('export.heading')}</h2>
      </div>
      <ExportBar t={t} onExport={exportUsage} />
    </section>
  </div>
}
