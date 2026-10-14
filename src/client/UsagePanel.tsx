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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  QuotaAccount,
  QuotaAccountRequest,
  QuotaKeyRequest,
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
import { ModelUsage } from './ModelUsage.tsx'
import css from './UsagePanel.module.css'

/** The mounted `ctx.remote.quotaMonitor` face the panel talks to. */
export interface QuotaMonitorApi {
  getSnapshot(): Promise<RemoteResult<QuotaSnapshot>>
  manageKey(request: QuotaKeyRequest): Promise<RemoteResult<QuotaSnapshot>>
  readPendingAccounts(): Promise<RemoteResult<QuotaSnapshot>>
  refreshAccounts(): Promise<RemoteResult<QuotaSnapshot>>
  getAccount(request: QuotaAccountRequest): Promise<RemoteResult<QuotaAccount>>
  getUsage(request: QuotaUsageRequest): Promise<RemoteResult<QuotaUsageReport>>
  exportUsage(request: QuotaExportRequest): Promise<RemoteResult<QuotaExportDocument>>
  setBalances(request: QuotaSetBalancesRequest): Promise<RemoteResult<Record<string, number>>>
  resetStats(request: QuotaResetStatsRequest): Promise<RemoteResult<QuotaSnapshot>>
}

/** Owner share handed down by the main-panel entry. */
export interface UsagePanelInjected {
  quota: QuotaMonitorApi
  /** The Host's model registry is the current provider directory. */
  subscribeProviders?: (listener: () => void) => () => void
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

export function UsagePanel({ t, quota, subscribeProviders }: UsagePanelProps) {
  const [snapshot, setSnapshot] = useState<QuotaSnapshot | undefined>()
  const [account, setAccount] = useState<QuotaAccount | undefined>()
  /** The selected route's own figures: the totals, calendar, and sessions below. */
  const [usage, setUsage] = useState<QuotaUsageReport | undefined>()
  /** Every route together, which is what the provider comparison reads. */
  const [allUsage, setAllUsage] = useState<QuotaUsageReport | undefined>()
  const [provider, setProvider] = useState<string | undefined>()
  /** Credential reference of the shown reading; absent is the route's own key. */
  const [credential, setCredential] = useState<string | undefined>()
  const [month, setMonth] = useState<string | undefined>()
  const [selectedDay, setSelectedDay] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const selection = useRef({ id: provider, credentialRef: credential })
  const requests = useRef({ usage: 0, account: 0, snapshot: 0 })
  selection.current = { id: provider, credentialRef: credential }

  useEffect(() => () => {
    requests.current.usage++
    requests.current.account++
    requests.current.snapshot++
  }, [])

  const applySnapshot = useCallback((value: QuotaSnapshot) => {
    const current = selection.current
    const entry = value.providers.find(candidate => candidate.id === current.id) ?? value.providers[0]
    const id = entry?.id
    const credentialRef = id === current.id
      && (current.credentialRef === undefined || entry?.credentialRefs.includes(current.credentialRef))
      ? current.credentialRef
      : entry?.activeCredentialRef ?? entry?.credentialRefs[0]
    setSnapshot(value)
    if (id === current.id && credentialRef === current.credentialRef) return
    // Invalidate in-flight reads immediately, before React commits the new
    // selection, so a deleted route cannot repaint its old balance afterward.
    selection.current = { id, credentialRef }
    requests.current.account++
    requests.current.usage++
    setAccount(undefined)
    setUsage(undefined)
    setProvider(id)
    setCredential(credentialRef)
  }, [])

  const loadSnapshot = useCallback(async () => {
    const request = ++requests.current.snapshot
    const result = await quota.getSnapshot()
    if (!result.ok || request !== requests.current.snapshot) return
    applySnapshot(result.value)
  }, [quota, applySnapshot])

  /**
   * Open the panel: read the monitored credentials no round has taken yet and
   * adopt the snapshot that answers.
   *
   * This is the whole opening round trip. Every key a deployment monitors then
   * states its own figure, while readings a background round already took are
   * served from cache instead of being queried again.
   */
  const loadPending = useCallback(async () => {
    const request = ++requests.current.snapshot
    const result = await quota.readPendingAccounts()
    if (!result.ok || request !== requests.current.snapshot) return
    applySnapshot(result.value)
  }, [quota, applySnapshot])

  const loadUsage = useCallback(async (id: string | undefined, refresh: boolean) => {
    if (selection.current.id !== id) return
    const request = ++requests.current.usage
    const result = await quota.getUsage({ refresh, ...id === undefined ? {} : { provider: id } })
    if (request !== requests.current.usage) return
    if (result.ok && selection.current.id === id) setUsage(result.value)
    // A refresh completes the Host fold before the cached comparison is read.
    const all = await quota.getUsage({})
    if (all.ok && request === requests.current.usage) setAllUsage(all.value)
  }, [quota])

  const loadAccount = useCallback(async (id: string, credentialRef: string | undefined, refresh: boolean) => {
    if (selection.current.id !== id || selection.current.credentialRef !== credentialRef) return
    const request = ++requests.current.account
    const result = await quota.getAccount({
      provider: id,
      ...credentialRef === undefined ? {} : { credentialRef },
      refresh,
    })
    if (result.ok && request === requests.current.account
      && selection.current.id === id && selection.current.credentialRef === credentialRef) {
      setAccount(result.value)
    }
  }, [quota])

  useEffect(() => {
    void loadPending()
  }, [loadPending])

  useEffect(() => subscribeProviders?.(() => { void loadSnapshot() }), [subscribeProviders, loadSnapshot])

  const hasSnapshot = snapshot !== undefined
  const hasProvider = snapshot?.providers.some(entry => entry.id === provider) === true
  useEffect(() => {
    if (!hasSnapshot) return
    setAccount(undefined)
    setUsage(undefined)
    if (provider !== undefined && hasProvider) void loadAccount(provider, credential, false)
    // Historical routes still have statistics, but no current account or keys.
    void loadUsage(provider, false)
  }, [provider, credential, hasSnapshot, hasProvider, loadAccount, loadUsage])

  const refreshAll = useCallback(async () => {
    setBusy(true)
    try {
      const request = ++requests.current.snapshot
      const result = await quota.refreshAccounts()
      if (result.ok && request === requests.current.snapshot) applySnapshot(result.value)
      await Promise.all([
        loadUsage(provider, true),
        provider === undefined ? Promise.resolve() : loadAccount(provider, credential, false),
      ])
    } finally {
      setBusy(false)
    }
  }, [quota, applySnapshot, loadUsage, loadAccount, provider, credential])

  const resetStats = useCallback(async () => {
    const result = await quota.resetStats({})
    if (result.ok) {
      setSnapshot(result.value)
      await loadUsage(provider, false)
    }
  }, [quota, loadUsage, provider])

  const setManual = useCallback(async (id: string, value: number) => {
    await quota.setBalances({ balances: { [id]: value } })
    await loadSnapshot()
    await loadAccount(id, credential, false)
  }, [quota, loadSnapshot, loadAccount, credential])

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
  /** The selected route's display name, which the statistics section states. */
  const scopeName = provider === undefined
    ? undefined
    : providerNames[provider] ?? provider

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
          selectedCredential={credential}
          account={account}
          manualTotal={row?.balance?.total}
          manualRemaining={row?.balance?.remaining}
          onSelect={(id, credentialRef) => {
            setProvider(id)
            setCredential(credentialRef)
          }}
          onRefresh={() => {
            if (provider !== undefined) void loadAccount(provider, credential, true)
          }}
          onManage={async request => {
            const result = await quota.manageKey(request)
            if (!result.ok) throw new Error(result.error.message)
            applySnapshot(result.value)
            await loadPending()
          }}
          onManualChange={(id, value) => { void setManual(id, value) }}
        />}
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('usage.heading')}</h2>
        {scopeName === undefined
          ? null
          : <span className={css.sectionMeta}>{t('usage.scope', { provider: scopeName })}</span>}
      </div>
      <TotalsRow t={t} usage={usage} />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('model.heading')}</h2>
      </div>
      <ModelUsage t={t} models={usage?.models ?? []} names={providerNames} />
    </section>

    <section className={css.section}>
      <div className={css.sectionHead}>
        <h2 className={css.sectionTitle}>{t('provider.heading')}</h2>
        <span className={css.sectionMeta}>{t('provider.hint')}</span>
      </div>
      <ProviderUsage
        t={t}
        providers={allUsage?.providers ?? []}
        names={providerNames}
        selected={provider}
        onSelect={(id) => {
          setProvider(id)
          // A route picked from the comparison table reads its first key,
          // which is what an absent reference names.
          setCredential(undefined)
        }}
        allTimeTokens={allUsage?.allTimeTotals.totalTokens ?? 0}
        todayTokens={allUsage?.todayTotals.totalTokens ?? 0}
        monthTokens={allUsage?.monthTotals.totalTokens ?? 0}
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
