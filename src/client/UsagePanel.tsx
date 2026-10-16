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

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Button, IconRefreshOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
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
  QuotaProviderEntry,
  QuotaUsageReport,
  QuotaUsageRequest,
} from '../types.ts'
import type {} from './locales.ts'
import { MemberAnalysis } from './MemberAnalysis.tsx'
import { AccountCard } from './AccountCard.tsx'
import { LocalStats } from './LocalStats.tsx'
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

/**
 * Whether a provider's upstream reports per-key token history.
 *
 * Only the StepCode / AgentRouter desk does today. Any other provider would
 * render an analysis of empty tiles and charts, so the panel shows its
 * allowance and the local calls instead. The adapter decides it, so a
 * temporary failed read cannot remove a known analysis surface.
 */
function supportsAnalysis(entry: QuotaProviderEntry): boolean {
  return entry.adapter === 'stepcode' || entry.accounts.some(account => account.keyUsage !== undefined)
}

/** The page's views; which of them a provider offers depends on what its upstream reports. */
type PanelView = 'current' | 'members' | 'account' | 'local'

const viewLabels = {
  current: 'tab.current',
  members: 'analysis.openMembers',
  account: 'tab.account',
  local: 'tab.local',
} as const

/** The tab a walk key lands on, per the WAI-ARIA tabs pattern; wraps at both ends. */
function walkTab(key: string, index: number, count: number): number | undefined {
  switch (key) {
    case 'ArrowRight': return (index + 1) % count
    case 'ArrowLeft': return (index + count - 1) % count
    case 'Home': return 0
    case 'End': return count - 1
    default: return undefined
  }
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
  /** The view the reader picked; a provider without it falls back to its first view. */
  const [view, setView] = useState<PanelView | undefined>()
  const [memberCredential, setMemberCredential] = useState<string | undefined>()
  const tabsId = useId()
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
    const entry = value.providers.find(candidate => candidate.id === current.id)
      ?? value.providers.filter(supportsAnalysis)
        .sort((a, b) => b.credentialRefs.length - a.credentialRefs.length)[0]
      ?? value.providers[0]
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
      const reading = result.value
      setAccount(reading)
      setSnapshot(previous => previous === undefined ? previous : {
        ...previous,
        capturedAt: Math.max(previous.capturedAt, reading.fetchedAt),
        providers: previous.providers.map(entry => {
          if (entry.id !== reading.id) return entry
          const others = entry.accounts.filter(item => item.credentialRef !== reading.credentialRef)
          return { ...entry, accounts: [...others, reading] }
        }),
      })
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

  const providers = snapshot?.providers ?? []
  const selectedEntry = providers.find(entry => entry.id === provider)
  // Both follow the selected provider: another provider's history says
  // nothing about this one, and one key has no members to compare.
  const analysis = selectedEntry !== undefined && supportsAnalysis(selectedEntry)
  const members = analysis && (selectedEntry?.credentialRefs.length ?? 0) > 1
  const views: readonly PanelView[] = analysis
    ? members ? ['current', 'members', 'account', 'local'] : ['current', 'account', 'local']
    : ['account', 'local']
  const shown = view !== undefined && views.includes(view) ? view : views[0]!
  const tabId = (value: PanelView) => `${tabsId}-${value}`
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = walkTab(event.key, index, views.length)
    if (next === undefined) return
    event.preventDefault()
    setView(views[next])
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]').item(next).focus()
  }
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
    <div className={css.page}>
      <header className={css.pageHead}>
        <div className={css.pageHeading}>
          <h1 className={css.pageTitle}>{t('panel.title')}</h1>
          <p className={css.pageIntro}>{t('panel.subtitle')}</p>
        </div>
        <div className={css.toolbar}>
          {providers.length > 0 && <label className={css.scope}>
            <span>{t('keypage.scope')}</span>
            <select
              className={css.select}
              value={provider ?? ''}
              onChange={event => {
                const entry = providers.find(item => item.id === event.target.value)
                if (entry === undefined) return
                setProvider(entry.id)
                setCredential(entry.activeCredentialRef ?? entry.credentialRefs[0])
                setMemberCredential(undefined)
              }}
            >{providers.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
          </label>}
          <Button
            variant="outline"
            size="sm"
            icon={<IconRefreshOutlineRegular size={14} />}
            onClick={() => void refreshAll()}
            disabled={busy}
            aria-busy={busy}
          >{busy ? t('action.refreshing') : t('action.refresh')}</Button>
        </div>
      </header>

      <div className={css.tabs} role="tablist" aria-label={t('tab.label')}>
        {views.map((value, index) => <button
          key={value}
          id={tabId(value)}
          type="button"
          role="tab"
          className={css.tab}
          aria-selected={shown === value}
          aria-controls={`${tabsId}-panel`}
          tabIndex={shown === value ? 0 : -1}
          onClick={() => { setView(value) }}
          onKeyDown={event => { onTabKey(event, index) }}
        >{t(viewLabels[value])}</button>)}
      </div>

      <div id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={tabId(shown)} className={css.view}>
        {shown === 'current' && snapshot !== undefined && <MemberAnalysis
          t={t}
          providers={providers}
          provider={provider}
          credential={credential}
          capturedAt={snapshot.capturedAt}
          mode="current"
          onSelect={() => {}}
        />}
        {shown === 'members' && snapshot !== undefined && <MemberAnalysis
          t={t}
          providers={providers}
          provider={provider}
          credential={memberCredential}
          capturedAt={snapshot.capturedAt}
          onSelect={(id, ref) => { setProvider(id); setMemberCredential(ref) }}
        />}
        {shown === 'account' && (providers.length === 0
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
          />)}
        {shown === 'local' && <LocalStats
          t={t}
          usage={usage}
          allUsage={allUsage}
          names={providerNames}
          provider={provider}
          scopeName={scopeName}
          month={activeMonth}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onMonthChange={setMonth}
          onExport={exportUsage}
          onReset={() => void resetStats()}
        />}
      </div>
    </div>
  </div>
}
