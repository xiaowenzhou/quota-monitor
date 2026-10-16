/**
 * The per-key usage page: one card per monitored credential, carrying the
 * allowance that key's own account endpoint reported and the token detail its
 * own usage endpoint reported. Opening a card shows that key's billing period,
 * token split, per-model share, and daily series.
 *
 * A model request names a provider route and never the key that served it, so
 * this page is the only place a per-key figure can come from: every number here
 * was read with that key's own credential. The page derives presentation only —
 * it never folds a key's traffic out of this process's own counters, which
 * cannot attribute a call to a key at all.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/KeyUsagePanel
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  QuotaAccount,
  QuotaAccountStatus,
  QuotaKeyTokens,
  QuotaKeyUsage,
  QuotaPlanWindowKind,
  QuotaProviderEntry,
  QuotaSnapshot,
} from '../types.ts'
import type { zh } from './locales.ts'
import { fmtAmount, fmtNumber, fmtPercent, fmtTime, fmtTokens, initialsOf } from './format.ts'
import type { QuotaMonitorApi } from './UsagePanel.tsx'
import css from './KeyUsage.module.css'

/** A copy key of the `quotaMonitor` dictionary. */
type CopyKey = keyof typeof zh

/** The mounted `ctx.remote.quotaMonitor` face this page talks to. */
export interface KeyUsageInjected {
  quota: QuotaMonitorApi
  /** The Host's model registry is the current provider directory. */
  subscribeProviders?: (listener: () => void) => () => void
}

/** Composed props of the page entry: root runtime seat, `t`, and the Host face. */
export type KeyUsagePanelProps =
  PropsRuntime<'main'> & PropsLocale<'quotaMonitor'> & InjectFace<KeyUsageInjected>

/** One monitored credential of the shown route, with whatever was read for it. */
interface KeyRow {
  /** Credential reference, absent for a route read with its own profile key. */
  readonly ref: string | undefined
  /** Display name: the user's label, the endpoint's identity, or the reference. */
  readonly name: string
  /** The latest reading, absent until a round has read this slot. */
  readonly account: QuotaAccount | undefined
  /** True when the route currently authenticates with this credential. */
  readonly active: boolean
}

/**
 * Join class names, dropping the ones a CSS module lookup could not resolve.
 *
 * `noUncheckedIndexedAccess` types every `css.foo` as `string | undefined`, so a
 * bare lookup cannot be returned as a `string` and an interpolated one would
 * render the literal text `undefined` into the class attribute.
 * @param names - class names in source order.
 * @returns the resolved names, space separated.
 */
function cls(...names: readonly (string | undefined)[]): string {
  return names.filter(name => name !== undefined).join(' ')
}

/** Account status → the copy key stating it. */
const STATUS_KEYS: Record<QuotaAccountStatus, CopyKey> = {
  'ok': 'status.ok',
  'not-configured': 'status.notConfigured',
  'unauthorized': 'status.unauthorized',
  'rate-limited': 'status.rateLimited',
  'unsupported': 'status.unsupported',
  'invalid-response': 'status.invalidResponse',
  'blocked': 'status.blocked',
  'unavailable': 'status.unavailable',
}

/** Plan-window kind → the copy key naming it. */
const WINDOW_KEYS: Record<QuotaPlanWindowKind, CopyKey> = {
  'session': 'window.session',
  'five-hour': 'window.fiveHour',
  'daily': 'window.daily',
  'weekly': 'window.weekly',
  'monthly': 'window.monthly',
  'billing': 'window.billing',
  'quota': 'window.quota',
}

/**
 * The four metered buckets, in the order the split bar and its legend draw them.
 *
 * The segment class doubles as the legend swatch: both set nothing but the
 * background, so one list keeps the bar and its key from drifting apart.
 */
const SPLIT_SEGMENTS = [
  { field: 'inputTokens', label: 'usage.input', className: cls(css.segInput) },
  { field: 'outputTokens', label: 'usage.output', className: cls(css.segOutput) },
  { field: 'cacheWriteTokens', label: 'usage.cacheWrite', className: cls(css.segCacheWrite) },
  { field: 'cacheReadTokens', label: 'usage.cacheRead', className: cls(css.segCacheRead) },
] as const satisfies readonly {
  field: keyof QuotaKeyTokens
  label: 'usage.input' | 'usage.output' | 'usage.cacheWrite' | 'usage.cacheRead'
  className: string
}[]

/**
 * The credentials a route is read with.
 *
 * A route naming no credential still has one slot: its own profile key, which
 * is what the account endpoint answers about.
 * @param entry - the provider entry.
 * @returns one reference per slot, `undefined` for the route's own key.
 */
function refsOf(entry: QuotaProviderEntry): readonly (string | undefined)[] {
  return entry.credentialRefs.length > 0 ? entry.credentialRefs : [undefined]
}

/**
 * A readable label for a credential reference that carries no user name.
 * @param ref - the credential reference.
 * @returns its distinctive part, trimmed for a card.
 */
function shortRef(ref: string): string {
  const stripped = ref.startsWith('QUOTA_KEY_') ? ref.slice('QUOTA_KEY_'.length) : ref
  return stripped.length > 14 ? `${stripped.slice(0, 14)}…` : stripped
}

/**
 * The four token buckets behind one reading, from the usage window when that
 * endpoint answered and from the billing period otherwise.
 *
 * A section that metered nothing yields nothing, so a card states the absence
 * rather than drawing four zeros.
 * @param usage - the reading's per-key detail.
 * @returns the buckets, or `undefined` when no section disclosed them.
 */
function splitOf(usage: QuotaKeyUsage | undefined): QuotaKeyTokens | undefined {
  const source = usage?.window ?? usage?.period
  if (source === undefined) return undefined
  if (source.inputTokens === undefined && source.outputTokens === undefined && source.totalTokens === undefined) {
    return undefined
  }
  const inputTokens = source.inputTokens ?? 0
  const outputTokens = source.outputTokens ?? 0
  const cacheReadTokens = source.cacheReadTokens ?? 0
  const cacheWriteTokens = source.cacheWriteTokens ?? 0
  return {
    inputTokens,
    outputTokens,
    reasoningTokens: source.reasoningTokens ?? 0,
    cacheReadTokens,
    cacheWriteTokens,
    // Reasoning is already counted inside output, so it is shown but not added.
    totalTokens: source.totalTokens ?? inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
  }
}

/**
 * A key's own price and cache mix for the billing period it is billed on.
 *
 * The spend figure and the token figure must come from the SAME window or the
 * two cannot be divided: over 30 days a key can burn ten times the tokens it
 * burned this month, so `rate` reads the period only and stays comparable with
 * the used amount beside it. A key that metered no period tokens yields
 * nothing, and a card then states the absence instead of a bogus rate.
 * @param account - one key's account reading.
 * @returns the amount per million tokens and the cache-read share, each optional.
 */
function rateOf(account: QuotaAccount | undefined): { rate: number | undefined; cacheShare: number | undefined } {
  const period = account?.keyUsage?.period
  const tokens = period?.totalTokens ?? 0
  if (tokens <= 0) return { rate: undefined, cacheShare: undefined }
  const used = period?.used ?? account?.used
  return {
    rate: used === undefined ? undefined : used / (tokens / 1e6),
    cacheShare: period?.cacheReadTokens === undefined
      ? undefined
      : (period.cacheReadTokens / tokens) * 100,
  }
}

/**
 * Percent of a limit consumed, capped at 100.
 * @param used - amount consumed.
 * @param limit - the cap.
 * @returns the percentage, or `undefined` when either side is unknown.
 */
function percentOf(used: number | undefined, limit: number | undefined): number | undefined {
  if (used === undefined || limit === undefined || limit <= 0) return undefined
  return Math.min(100, (used / limit) * 100)
}

/** The header's mark: a key, matching the rail entry that opens this page. */
function KeyGlyph() {
  return <svg className={css.brandGlyph} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="7.5" cy="16.5" r="4" />
    <path d="M10.4 13.6 20 4" />
    <path d="M16.5 7.5 19 10" />
    <path d="M13.5 10.5 16 13" />
  </svg>
}

/**
 * The severity class of a key card's status dot.
 * @param account - the reading behind the card, if any.
 * @returns the dot's class names.
 */
function dotClass(account: QuotaAccount | undefined): string {
  if (account === undefined) return cls(css.cardDot)
  if (account.status !== 'ok' || account.warning === 'critical') return cls(css.cardDot, css.cardDotBad)
  if (account.warning === 'warning') return cls(css.cardDot, css.cardDotWarn)
  return cls(css.cardDot, css.cardDotOk)
}

/**
 * The severity class of an allowance bar's fill.
 * @param warning - the reading's warning level.
 * @returns the fill's class names.
 */
function fillClass(warning: QuotaAccount['warning']): string {
  if (warning === 'critical') return cls(css.barFill, css.barFillCritical)
  if (warning === 'warning') return cls(css.barFill, css.barFillWarn)
  return cls(css.barFill)
}

/** One legend row of the token split. */
function LegendRow({ label, value, share, swatchClass }: {
  label: string
  value: string
  share: string
  swatchClass?: string
}) {
  return <li className={css.legendItem}>
    <span className={cls(css.legendSwatch, swatchClass)} aria-hidden="true" />
    <span className={css.legendLabel}>{label}</span>
    <span className={css.legendValue}>{value}</span>
    <span className={css.legendShare}>{share}</span>
  </li>
}

export function KeyUsagePanel({ t, quota, subscribeProviders }: KeyUsagePanelProps) {
  const [snapshot, setSnapshot] = useState<QuotaSnapshot | undefined>()
  const [provider, setProvider] = useState<string | undefined>()
  /** Credential reference of the key whose detail is open. */
  const [selectedRef, setSelectedRef] = useState<string | undefined>()
  /** True once a card has been opened, so the route's own key can be named. */
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  /** Generation counter: a later request makes an earlier answer stale. */
  const requests = useRef(0)

  useEffect(() => () => { requests.current++ }, [])

  const applySnapshot = useCallback((value: QuotaSnapshot) => {
    setSnapshot(value)
    setProvider(current => {
      if (current !== undefined && value.providers.some(entry => entry.id === current)) return current
      // Open on a route that actually monitors keys, so the page starts on the
      // subject it exists for rather than on an unrelated first route.
      return value.providers.find(entry => entry.credentialRefs.length > 0)?.id ?? value.providers[0]?.id
    })
  }, [])

  /**
   * Open the page: read every monitored credential no round has taken yet and
   * adopt the snapshot that answers. One round trip states every key.
   */
  const loadPending = useCallback(async () => {
    const request = ++requests.current
    const result: RemoteResult<QuotaSnapshot> = await quota.readPendingAccounts()
    if (!result.ok || request !== requests.current) return
    applySnapshot(result.value)
  }, [quota, applySnapshot])

  const loadSnapshot = useCallback(async () => {
    const request = ++requests.current
    const result = await quota.getSnapshot()
    if (!result.ok || request !== requests.current) return
    applySnapshot(result.value)
  }, [quota, applySnapshot])

  useEffect(() => { void loadPending() }, [loadPending])
  useEffect(() => subscribeProviders?.(() => { void loadSnapshot() }), [subscribeProviders, loadSnapshot])

  const refresh = useCallback(async () => {
    setBusy(true)
    try {
      const request = ++requests.current
      const result = await quota.refreshAccounts()
      if (result.ok && request === requests.current) applySnapshot(result.value)
    } finally {
      setBusy(false)
    }
  }, [quota, applySnapshot])

  const providers = snapshot?.providers ?? []
  const entry = useMemo(
    () => providers.find(candidate => candidate.id === provider),
    [providers, provider],
  )

  const rows = useMemo<readonly KeyRow[]>(() => {
    if (entry === undefined) return []
    return refsOf(entry).map(ref => {
      const account = entry.accounts.find(candidate => candidate.credentialRef === ref)
      const name = (ref === undefined ? undefined : entry.keyNames?.[ref])
        ?? account?.keyName
        ?? account?.accountName
        ?? (ref === undefined ? t('keypage.identity.default') : shortRef(ref))
      return { ref, name, account, active: ref !== undefined && ref === entry.activeCredentialRef }
    })
  }, [entry, t])

  const totals = useMemo(() => {
    let used = 0
    let usedSeen = false
    let calls = 0
    let callsSeen = false
    let tokens = 0
    let tokensSeen = false
    let periodTokens = 0
    let periodSeen = false
    let periodUsed = 0
    let periodUsedSeen = false
    let ok = 0
    let currency: string | undefined
    for (const row of rows) {
      const account = row.account
      if (account?.status === 'ok') ok++
      currency ??= account?.currency
      if (account?.used !== undefined) {
        used += account.used
        usedSeen = true
      }
      const usage = account?.keyUsage
      const rowCalls = usage?.window?.calls ?? usage?.period?.calls
      if (rowCalls !== undefined) {
        calls += rowCalls
        callsSeen = true
      }
      const rowTokens = splitOf(usage)?.totalTokens
      if (rowTokens !== undefined) {
        tokens += rowTokens
        tokensSeen = true
      }
      const rowPeriodTokens = usage?.period?.totalTokens
      if (rowPeriodTokens !== undefined && rowPeriodTokens > 0) {
        periodTokens += rowPeriodTokens
        periodSeen = true
        // The rate below divides this key's tokens by this key's own money.
        const rowPeriodUsed = usage?.period?.used ?? account?.used
        if (rowPeriodUsed !== undefined) {
          periodUsed += rowPeriodUsed
          periodUsedSeen = true
        }
      }
    }
    return {
      used, usedSeen, calls, callsSeen, tokens, tokensSeen,
      periodTokens, periodSeen, periodUsed, periodUsedSeen, ok, currency, count: rows.length,
    }
  }, [rows])

  /** The window every key's series covers; the endpoint answers one per read. */
  const days = rows.find(row => row.account?.keyUsage !== undefined)?.account?.keyUsage?.days ?? 0

  /**
   * The blended price of the very period the spend tile states, so both agree.
   *
   * It covers the keys that reported period tokens, which on a metered provider
   * is every key; a key that disclosed no period simply does not contribute.
   */
  const periodRate = totals.periodSeen && totals.periodUsedSeen && totals.periodTokens > 0
    ? totals.periodUsed / (totals.periodTokens / 1e6)
    : undefined

  /**
   * The spend tile's second line: the period's own tokens, plus the price they
   * work out to. A provider that metered no period keeps the window note.
   */
  const spendNote = totals.periodSeen
    ? [
      t('keypage.tile.periodTokens', { tokens: fmtTokens(totals.periodTokens) }),
      periodRate === undefined
        ? ''
        : t('keypage.key.rateShort', { amount: fmtAmount(periodRate, totals.currency) }),
    ].filter(part => part !== '').join(' · ')
    : days > 0 ? t('keypage.tile.windowNote', { days: String(days) }) : ''

  const selected = useMemo(
    () => rows.find(row => row.ref === selectedRef),
    [rows, selectedRef],
  )
  const account = selected?.account
  const usage = account?.keyUsage
  const split = useMemo(() => splitOf(usage), [usage])

  const daily = useMemo(
    () => [...usage?.daily ?? []].sort((left, right) => left.date < right.date ? -1 : left.date > right.date ? 1 : 0),
    [usage],
  )
  const maxDaily = useMemo(
    () => daily.reduce((peak, day) => Math.max(peak, day.totalTokens), 0),
    [daily],
  )
  const models = useMemo(
    () => [...usage?.models ?? []].sort((left, right) => right.totalTokens - left.totalTokens),
    [usage],
  )
  const maxModel = models[0]?.totalTokens ?? 0
  const dayPoints = useMemo(
    () => (selectedDay === undefined
      ? []
      : [...usage?.points ?? []].filter(point => point.date === selectedDay))
      .sort((left, right) => right.totalTokens - left.totalTokens),
    [usage, selectedDay],
  )

  const openKey = useCallback((ref: string | undefined) => {
    setSelectedRef(ref)
    setDetailOpen(true)
    setSelectedDay(undefined)
  }, [])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setSelectedRef(undefined)
    setSelectedDay(undefined)
  }, [])

  const statusOf = useCallback(
    (value: QuotaAccount | undefined): string => t(STATUS_KEYS[value?.status ?? 'unsupported']),
    [t],
  )

  const reason = account?.reason

  return <div className={css.page}>
    <header className={css.header}>
      <div className={css.brand}>
        <span className={css.brandMark}><KeyGlyph /></span>
        <div>
          <h1 className={css.title}>{t('keypage.title')}</h1>
          <p className={css.subtitle}>{t('keypage.subtitle')}</p>
        </div>
      </div>
      <div className={css.actions}>
        <button type="button" className={`${css.action} ${css.actionPrimary}`}
          onClick={() => void refresh()} disabled={busy}>
          {busy ? t('action.refreshing') : t('action.refresh')}
        </button>
      </div>
    </header>

    {providers.length === 0
      ? <p className={css.empty}>{t('account.empty')}</p>
      : <>
        <div className={css.scope} role="group" aria-label={t('keypage.scope')}>
          {providers.map(candidate => {
            const tone = candidate.status !== 'ok'
              ? css.scopeDotBad
              : candidate.warning === undefined ? css.scopeDot : css.scopeDotWarn
            return <button key={candidate.id} type="button"
              className={`${css.scopeChip} ${candidate.id === provider ? css.scopeChipActive : ''}`}
              aria-pressed={candidate.id === provider}
              onClick={() => {
                setProvider(candidate.id)
                closeDetail()
              }}>
              <span className={`${css.scopeDot} ${tone}`} aria-hidden="true" />
              {candidate.name}
              <span className={css.scopeCount}>{refsOf(candidate).length}</span>
            </button>
          })}
        </div>

        <div className={css.tiles}>
          <div className={css.tile}>
            <span className={css.tileLabel}>{t('keypage.tile.used')}</span>
            <span className={css.tileValue}>
              {totals.usedSeen ? fmtAmount(totals.used, totals.currency) : '—'}
            </span>
            <span className={css.tileNote}>{spendNote}</span>
          </div>
          <div className={css.tile}>
            <span className={css.tileLabel}>{t('keypage.tile.calls')}</span>
            <span className={css.tileValue}>{totals.callsSeen ? fmtNumber(totals.calls) : '—'}</span>
            <span className={css.tileNote}>
              {days > 0 ? t('keypage.tile.windowNote', { days: String(days) }) : ''}
            </span>
          </div>
          <div className={css.tile}>
            <span className={css.tileLabel}>{t('keypage.tile.tokens')}</span>
            <span className={css.tileValue}>{totals.tokensSeen ? fmtTokens(totals.tokens) : '—'}</span>
            <span className={css.tileNote}>
              {days > 0 ? t('keypage.tile.windowNote', { days: String(days) }) : ''}
            </span>
          </div>
          <div className={css.tile}>
            <span className={css.tileLabel}>{t('keypage.tile.keys')}</span>
            <span className={css.tileValue}>{fmtNumber(totals.count)}</span>
            <span className={css.tileNote}>
              {t('keypage.tile.keysNote', { ok: String(totals.ok), bad: String(totals.count - totals.ok) })}
            </span>
          </div>
        </div>

        <section className={css.section}>
          <div className={css.sectionHead}>
            <h2 className={css.sectionTitle}>{t('keypage.keys.heading')}</h2>
            <span className={css.sectionMeta}>{t('keypage.keys.hint')}</span>
          </div>
          {rows.length === 0
            ? <p className={css.empty}>{t('keypage.keys.empty')}</p>
            : <div className={css.cards}>
              {rows.map(row => {
                const rowAccount = row.account
                const rowUsage = rowAccount?.keyUsage
                const rowSplit = splitOf(rowUsage)
                const rowCalls = rowUsage?.window?.calls ?? rowUsage?.period?.calls
                const percent = percentOf(rowAccount?.used, rowAccount?.limit)
                const rowRate = rateOf(rowAccount)
                const isOpen = detailOpen && row.ref === selectedRef
                return <button key={row.ref ?? '\u0000route'} type="button"
                  className={`${css.card} ${isOpen ? css.cardActive : ''}`}
                  aria-pressed={isOpen}
                  onClick={() => openKey(row.ref)}>
                  <span className={css.cardHead}>
                    <span className={dotClass(rowAccount)} aria-hidden="true" />
                    <span className={css.cardName} title={row.ref ?? row.name}>{row.name}</span>
                    {row.active
                      ? <span className={`${css.cardTag} ${css.cardTagActive}`}>{t('keys.active')}</span>
                      : null}
                  </span>
                  <span className={css.cardSub}>
                    {rowAccount === undefined
                      ? t('keys.unread')
                      : [statusOf(rowAccount), rowAccount.accountName].filter(part => part !== undefined).join(' · ')}
                  </span>
                  <span className={css.figures}>
                    <span className={css.figure}>
                      <span className={css.figureLabel}>{t('account.remaining')}</span>
                      <span className={css.figureValue}>
                        {rowAccount?.status !== 'ok'
                          ? '—'
                          : rowAccount.unlimited === true
                            ? t('account.unlimited')
                            : fmtAmount(rowAccount.remaining, rowAccount.currency)}
                      </span>
                    </span>
                    <span className={`${css.figure} ${css.figureRight}`}>
                      <span className={css.figureLabel}>{t('account.used')} / {t('account.limit')}</span>
                      <span className={`${css.figureValue} ${css.figureValueSmall}`}>
                        {fmtAmount(rowAccount?.used, rowAccount?.currency)}
                        {' / '}
                        {fmtAmount(rowAccount?.limit, rowAccount?.currency)}
                      </span>
                    </span>
                  </span>
                  <span className={css.bar}>
                    <span className={fillClass(rowAccount?.warning)} style={{ width: `${percent ?? 0}%` }} />
                  </span>
                  <span className={css.meta}>
                    <span className={css.metaItem}>
                      {t('keypage.key.percent', { percent: fmtPercent(percent) })}
                    </span>
                    <span className={css.metaItem}>
                      {rowCalls === undefined ? '—' : t('usage.calls', { calls: fmtNumber(rowCalls) })}
                    </span>
                    <span className={css.metaItem}>
                      {t('keypage.key.windowTokens', {
                        days: String(rowUsage?.days ?? days),
                        tokens: fmtTokens(rowSplit?.totalTokens),
                      })}
                    </span>
                    {rowRate.rate === undefined
                      ? null
                      : <span className={css.metaItem}>
                        {t('keypage.key.rate', { amount: fmtAmount(rowRate.rate, rowAccount?.currency) })}
                      </span>}
                    {rowRate.cacheShare === undefined
                      ? null
                      : <span className={css.metaItem}>
                        {t('keypage.key.cacheShare', { percent: fmtPercent(rowRate.cacheShare) })}
                      </span>}
                  </span>
                  {rowSplit === undefined
                    ? <span className={css.note}>{t('keypage.key.noUsage')}</span>
                    : null}
                </button>
              })}
            </div>}
        </section>

        {detailOpen && selected !== undefined && account !== undefined
          ? <section className={css.detail}>
            <div className={css.detailHead}>
              <div className={css.detailIdentity}>
                <span className={css.avatar} aria-hidden="true">{initialsOf(selected.name)}</span>
                <div>
                  <h2 className={css.detailName}>{selected.name}</h2>
                  <p className={css.detailSub}>
                    {[entry?.name, account.accountName, account.adapter]
                      .filter(part => part !== undefined)
                      .join(' · ')}
                  </p>
                </div>
              </div>
              <div className={css.actions}>
                <span className={css.cardTag}>{statusOf(account)}</span>
                <button type="button" className={css.action} onClick={closeDetail}>
                  {t('keypage.detail.close')}
                </button>
              </div>
            </div>

            {account.status !== 'ok'
              ? <>
                <p className={`${css.note} ${css.noteBad}`}>
                  {statusOf(account)}{reason === undefined ? '' : ` — ${reason}`}
                </p>
                {(account.missingCredentials ?? []).length === 0
                  ? null
                  : <p className={css.note}>
                    {t('status.missingCredentials', { names: (account.missingCredentials ?? []).join(', ') })}
                  </p>}
              </>
              : <div className={css.detailGrid}>
                <div className={css.block}>
                  <h3 className={css.blockTitle}>{t('keypage.detail.allowance')}</h3>
                  <div className={css.figures}>
                    <div className={css.figure}>
                      <span className={css.figureLabel}>{t('account.remaining')}</span>
                      <span className={css.figureValue}>
                        {account.unlimited === true
                          ? t('account.unlimited')
                          : fmtAmount(account.remaining, account.currency)}
                      </span>
                    </div>
                    <div className={`${css.figure} ${css.figureRight}`}>
                      <span className={css.figureLabel}>{t('account.used')} / {t('account.limit')}</span>
                      <span className={`${css.figureValue} ${css.figureValueSmall}`}>
                        {fmtAmount(account.used, account.currency)}
                        {' / '}
                        {fmtAmount(account.limit, account.currency)}
                      </span>
                    </div>
                  </div>
                  <div className={css.bar}>
                    <div className={fillClass(account.warning)}
                      style={{ width: `${percentOf(account.used, account.limit) ?? 0}%` }} />
                  </div>
                  {(account.budgetPools ?? []).length === 0
                    ? null
                    : <div className={css.poolList}>
                      {(account.budgetPools ?? []).map(pool => <div key={pool.name} className={css.poolRow}>
                        <div className={css.poolTop}>
                          <span className={css.poolName}>{pool.name}</span>
                          <span className={css.poolFigures}>
                            {pool.limit === undefined
                              ? fmtAmount(pool.remaining, account.currency)
                              : t('keypage.detail.poolFigures', {
                                amount: fmtAmount(pool.remaining, account.currency),
                                limit: fmtAmount(pool.limit, account.currency),
                              })}
                          </span>
                        </div>
                        <div className={css.bar}>
                          <div className={css.barFill} style={{ width: `${pool.percentUsed ?? 0}%` }} />
                        </div>
                      </div>)}
                    </div>}
                  {(account.planWindows ?? []).map(planWindow => <div key={planWindow.kind} className={css.poolRow}>
                    <div className={css.poolTop}>
                      <span className={css.poolName}>{t(WINDOW_KEYS[planWindow.kind])}</span>
                      <span className={css.poolFigures}>{fmtPercent(planWindow.percentUsed)}</span>
                    </div>
                    <div className={css.bar}>
                      <div className={css.barFill} style={{ width: `${planWindow.percentUsed}%` }} />
                    </div>
                  </div>)}
                  <p className={css.note}>{t('account.source', { adapter: account.adapter })}</p>
                </div>

                <div className={css.block}>
                  <h3 className={css.blockTitle}>
                    {usage === undefined
                      ? t('keypage.detail.tokens')
                      : `${t('keypage.detail.tokens')} · ${t('keypage.tile.windowNote', { days: String(usage.days) })}`}
                  </h3>
                  {split === undefined
                    ? <p className={css.note}>{t('keypage.detail.usageUnavailable')}</p>
                    : <>
                      <div className={css.split}>
                        {SPLIT_SEGMENTS.map(segment => {
                          const value = split[segment.field]
                          return value <= 0 ? null : <div key={segment.field}
                            className={`${css.seg} ${segment.className}`}
                            style={{ width: `${split.totalTokens > 0 ? (value / split.totalTokens) * 100 : 0}%` }}
                            title={`${t(segment.label)} ${fmtTokens(value)}`} />
                        })}
                      </div>
                      <ul className={css.legend}>
                        {SPLIT_SEGMENTS.map(segment => {
                          const value = split[segment.field]
                          return <LegendRow key={segment.field}
                            label={t(segment.label)}
                            value={fmtTokens(value)}
                            share={fmtPercent(split.totalTokens > 0 ? (value / split.totalTokens) * 100 : 0)}
                            swatchClass={segment.className} />
                        })}
                        <LegendRow label={t('keypage.total')} value={fmtTokens(split.totalTokens)} share="" />
                      </ul>
                      {split.reasoningTokens <= 0
                        ? null
                        : <p className={css.note}>
                          {t('keypage.detail.reasoning', { value: fmtTokens(split.reasoningTokens) })}
                        </p>}
                    </>}
                </div>

                <div className={css.block}>
                  <h3 className={css.blockTitle}>{t('keypage.detail.period')}</h3>
                  {usage?.period === undefined
                    ? <p className={css.note}>{t('keypage.detail.usageUnavailable')}</p>
                    : <div className={css.poolList}>
                      <div className={css.poolTop}>
                        <span className={css.poolName}>{usage.period.periodKey ?? t('window.billing')}</span>
                        <span className={css.poolFigures}>
                          {usage.period.startAt === undefined || usage.period.endAt === undefined
                            ? ''
                            : t('keypage.detail.periodRange', {
                              start: usage.period.startAt.slice(0, 10),
                              end: usage.period.endAt.slice(0, 10),
                            })}
                        </span>
                      </div>
                      <div className={css.meta}>
                        <span className={css.metaItem}>
                          {t('keypage.tile.tokens')}
                          <span className={css.metaValue}>{fmtTokens(usage.period.totalTokens)}</span>
                        </span>
                        <span className={css.metaItem}>
                          {t('keypage.detail.calls')}
                          <span className={css.metaValue}>{fmtNumber(usage.period.calls)}</span>
                        </span>
                        <span className={css.metaItem}>
                          {t('keypage.detail.outcomes', {
                            success: fmtNumber(usage.period.successCalls),
                            failed: fmtNumber(usage.period.failedCalls),
                          })}
                        </span>
                      </div>
                      <p className={css.note}>
                        {t('keypage.detail.updated', {
                          time: fmtTime(usage.period.updatedAt ?? account.fetchedAt),
                        })}
                      </p>
                    </div>}
                </div>

                <div className={css.block}>
                  <h3 className={css.blockTitle}>
                    {t('keypage.detail.models', { days: String(usage?.days ?? days) })}
                  </h3>
                  {models.length === 0
                    ? <p className={css.note}>{t('keypage.detail.modelsEmpty')}</p>
                    : <div className={css.modelList}>
                      {models.map(model => <div key={model.model} className={css.modelRow}>
                        <div className={css.modelTrack}>
                          <span className={css.modelLabel} title={model.model}>{model.model}</span>
                          <div className={css.bar}>
                            <div className={css.modelFill}
                              style={{ width: `${maxModel > 0 ? (model.totalTokens / maxModel) * 100 : 0}%` }} />
                          </div>
                        </div>
                        <span className={css.modelValue}>
                          {fmtTokens(model.totalTokens)} · {fmtNumber(model.calls)}
                        </span>
                      </div>)}
                    </div>}
                </div>

                <div className={css.block}>
                  <h3 className={css.blockTitle}>
                    {t('keypage.detail.daily', { days: String(usage?.days ?? days) })}
                  </h3>
                  {daily.length === 0
                    ? <p className={css.note}>{t('keypage.detail.dailyEmpty')}</p>
                    : <>
                      <div className={css.daily}>
                        {daily.map(day => {
                          const active = day.date === selectedDay
                          return <button key={day.date} type="button" className={css.dailySlot}
                            disabled={day.totalTokens <= 0}
                            title={t('heatmap.day', {
                              date: day.date,
                              tokens: fmtTokens(day.totalTokens),
                              calls: fmtNumber(day.calls),
                            })}
                            onClick={() => setSelectedDay(current => current === day.date ? undefined : day.date)}>
                            <span className={`${css.dailyBar} ${
                              day.totalTokens <= 0 ? css.dailyBarIdle : active ? css.dailyBarActive : ''
                            }`}
                            style={{ height: `${maxDaily > 0 ? Math.max(2, (day.totalTokens / maxDaily) * 100) : 2}%` }} />
                          </button>
                        })}
                      </div>
                      <div className={css.dailyAxis}>
                        <span>{daily[0]?.date}</span>
                        <span>{t('keypage.detail.dailyHint')}</span>
                        <span>{daily[daily.length - 1]?.date}</span>
                      </div>
                    </>}
                </div>

                {selectedDay === undefined
                  ? null
                  : <div className={css.block}>
                    <h3 className={css.blockTitle}>{t('keypage.day.heading', { date: selectedDay })}</h3>
                    {dayPoints.length === 0
                      ? <p className={css.note}>{t('keypage.day.empty')}</p>
                      : <div className={css.tableCard}>
                        <table className={css.table}>
                          <thead>
                            <tr>
                              <th>{t('keypage.day.model')}</th>
                              <th className={css.numeric}>{t('keypage.day.tokens')}</th>
                              <th className={css.numeric}>{t('keypage.day.calls')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayPoints.map(point => <tr key={point.model}>
                              <td className={css.mono} title={point.model}>{point.model}</td>
                              <td className={css.numeric}>{fmtTokens(point.totalTokens)}</td>
                              <td className={css.numeric}>{fmtNumber(point.calls)}</td>
                            </tr>)}
                          </tbody>
                        </table>
                      </div>}
                  </div>}
              </div>}
          </section>
          : null}
      </>}
  </div>
}
