/**
 * The account card: one provider's balance or plan windows, with the provider
 * selector, the endpoint status, and the manual allowance fallback.
 *
 * A non-`ok` status renders its reason instead of a figure. The card never
 * substitutes zero for a number it could not read.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/AccountCard
 */

import { useEffect, useState } from 'react'
import type {
  QuotaAccount,
  QuotaAccountMode,
  QuotaAccountStatus,
  QuotaBudgetPool,
  QuotaGatewayUsage,
  QuotaPlanWindow,
  QuotaPlanWindowKind,
  QuotaProviderEntry,
  QuotaWarningLevel,
} from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtNumber, fmtTime, fmtTokens, initialsOf, resetLabel } from './format.ts'
import css from './UsagePanel.module.css'

/** Dictionary key labelling each plan window. */
const WINDOW_KEYS: Readonly<Record<QuotaPlanWindowKind, 'window.session' | 'window.fiveHour'
  | 'window.daily' | 'window.weekly' | 'window.monthly' | 'window.billing'
  | 'window.quota'>> = Object.freeze({
  'session': 'window.session',
  'five-hour': 'window.fiveHour',
  'daily': 'window.daily',
  'weekly': 'window.weekly',
  'monthly': 'window.monthly',
  'billing': 'window.billing',
  'quota': 'window.quota',
})

/** Dictionary key naming each account status. */
const STATUS_KEYS: Readonly<Record<QuotaAccountStatus, 'status.ok' | 'status.notConfigured'
  | 'status.unauthorized' | 'status.rateLimited' | 'status.unsupported'
  | 'status.invalidResponse' | 'status.blocked' | 'status.unavailable'>> = Object.freeze({
  'ok': 'status.ok',
  'not-configured': 'status.notConfigured',
  'unauthorized': 'status.unauthorized',
  'rate-limited': 'status.rateLimited',
  'unsupported': 'status.unsupported',
  'invalid-response': 'status.invalidResponse',
  'blocked': 'status.blocked',
  'unavailable': 'status.unavailable',
})

/** Dictionary key naming each card frame. */
const MODE_KEYS: Readonly<Record<QuotaAccountMode, 'account.mode.balance'
  | 'account.mode.subscription' | 'account.mode.unsupported'>> = Object.freeze({
  balance: 'account.mode.balance',
  subscription: 'account.mode.subscription',
  unsupported: 'account.mode.unsupported',
})

/** The card's props. */
export interface AccountCardProps {
  t: QuotaTranslate
  providers: readonly QuotaProviderEntry[]
  selected: string | undefined
  account: QuotaAccount | undefined
  manualTotal: number | undefined
  manualRemaining: number | undefined
  onSelect: (id: string) => void
  onRefresh: () => void
  onManualChange: (id: string, value: number) => void
}

/** Severity class for a figure, from the account's own warning level. */
function toneOf(warning: QuotaWarningLevel | undefined): string {
  if (warning === 'critical') return css.critical ?? ''
  if (warning === 'warning') return css.warning ?? ''
  return css.normal ?? ''
}

/** Status-pill class: a read that succeeded is tinted by its own severity. */
function pillOf(account: QuotaAccount): string {
  if (account.status !== 'ok') {
    return account.status === 'not-configured' || account.status === 'unsupported'
      ? ''
      : css.pillError ?? ''
  }
  if (account.warning === 'critical') return css.pillError ?? ''
  return account.warning === 'warning' ? css.pillWarn ?? '' : css.pillOk ?? ''
}

/** Selector-dot class for one route's last known status. */
function dotOf(status: QuotaAccountStatus, warning: QuotaWarningLevel | undefined): string {
  if (status !== 'ok') {
    return status === 'not-configured' || status === 'unsupported' ? '' : css.dotError ?? ''
  }
  if (warning === 'critical') return css.dotError ?? ''
  return warning === 'warning' ? css.dotWarn ?? '' : css.dotOk ?? ''
}

/** The provider selector: one chip per watched route, with its status dot. */
function Selector({ providers, selected, onSelect }: {
  providers: readonly QuotaProviderEntry[]
  selected: string | undefined
  onSelect: (id: string) => void
}) {
  return <div className={css.selector}>
    {providers.map(entry => <button
      key={entry.id}
      type="button"
      aria-pressed={entry.id === selected}
      className={`${css.selectorChip} ${entry.id === selected ? css.selectorChipActive : ''}`}
      onClick={() =>{  onSelect(entry.id) }}
    >
      <span className={`${css.dot} ${dotOf(entry.status, entry.warning)}`} aria-hidden="true" />
      {entry.name}
    </button>)}
  </div>
}

/** One plan window: a labelled bar with its used share and reset countdown. */
function WindowRow({ t, window: entry, tone }: {
  t: QuotaTranslate
  window: QuotaPlanWindow
  tone: string
}) {
  const reset = resetLabel(t, entry.resetAt)
  return <div className={css.windowRow}>
    <div className={css.windowHead}>
      <span className={css.windowName}>{t(WINDOW_KEYS[entry.kind])}</span>
      <span className={css.windowValue}>{t('window.used', { percent: String(entry.percentUsed) })}</span>
    </div>
    <div className={css.bar}>
      <div className={`${css.barFill} ${tone}`} style={{ width: `${entry.percentUsed}%` }} />
    </div>
    {reset === undefined ? null : <span className={css.windowMeta}>{reset}</span>}
  </div>
}

/** One budget pool row. */
function PoolRow({ t, pool }: { t: QuotaTranslate; pool: QuotaBudgetPool }) {
  const amount = fmtAmount(pool.remaining)
  return <li className={css.poolRow}>
    {pool.limit === undefined
      ? t('pool.remaining', { name: pool.name, amount })
      : t('pool.remainingOfLimit', { name: pool.name, amount, limit: fmtAmount(pool.limit) })}
  </li>
}

/** Rows of one gateway table the card shows before it says how many it hides. */
const GATEWAY_ROWS = 6

/** Dictionary key naming each gateway usage table, in display order. */
const GATEWAY_GROUPS: Readonly<Record<QuotaGatewayUsage['kind'], 'gateway.days'
  | 'gateway.models' | 'gateway.pools'>> = Object.freeze({
  day: 'gateway.days',
  model: 'gateway.models',
  pool: 'gateway.pools',
})

/** Display order of the gateway usage tables. */
const GATEWAY_ORDER: readonly QuotaGatewayUsage['kind'][] = Object.freeze(['day', 'model', 'pool'])

/** The endpoint's own token total for a row: its own, or the four buckets summed. */
function gatewayTokens(row: QuotaGatewayUsage): number | undefined {
  if (row.totalTokens !== undefined) return row.totalTokens
  const buckets = [row.inputTokens, row.outputTokens, row.cacheReadTokens, row.cacheWriteTokens]
  const present = buckets.filter((value): value is number => value !== undefined)
  return present.length === 0 ? undefined : present.reduce((total, value) => total + value, 0)
}

/** One row of a gateway table: its label and the figures the endpoint reported. */
function GatewayRow({ t, row }: { t: QuotaTranslate; row: QuotaGatewayUsage }) {
  const parts: string[] = []
  if (row.requests !== undefined) parts.push(t('gateway.requests', { count: fmtNumber(row.requests) }))
  const tokens = gatewayTokens(row)
  if (tokens !== undefined) parts.push(fmtTokens(tokens))
  if (row.cost !== undefined) parts.push(fmtAmount(row.cost, row.currency))
  return <li className={css.gatewayRow}>
    <span className={css.gatewayLabel} title={row.label}>{row.label}</span>
    <span className={css.gatewayValue}>{parts.join(' · ')}</span>
  </li>
}

/**
 * Usage the account endpoint reported for its own credential.
 *
 * This is the gateway's ledger, not this plugin's fold: it is what makes two
 * keys behind one provider route tell themselves apart, and it covers calls
 * that predate this process.
 */
function GatewayUsage({ t, usage }: { t: QuotaTranslate; usage: readonly QuotaGatewayUsage[] }) {
  const groups = GATEWAY_ORDER
    .map(kind => [kind, usage.filter(row => row.kind === kind)] as const)
    .filter(([, rows]) => rows.length > 0)
  if (groups.length === 0) return null

  return <div className={css.pools}>
    <span className={css.poolsTitle}>{t('gateway.heading')}</span>
    <p className={css.gatewayHint}>{t('gateway.hint')}</p>
    {groups.map(([kind, rows]) => <div key={kind}>
      <span className={css.gatewayGroup}>{t(GATEWAY_GROUPS[kind])}</span>
      <ul className={css.poolList}>
        {rows.slice(0, GATEWAY_ROWS).map(row => <GatewayRow
          key={`${row.kind}:${row.label}`}
          t={t}
          row={row}
        />)}
      </ul>
      {rows.length <= GATEWAY_ROWS
        ? null
        : <span className={css.gatewayMore}>{t('gateway.more', { count: String(GATEWAY_ROWS) })}</span>}
    </div>)}
  </div>
}

/** The manual allowance input, shown when the provider publishes no account endpoint. */
function ManualBalance({ t, provider, total, remaining, onChange }: {
  t: QuotaTranslate
  provider: string
  total: number | undefined
  remaining: number | undefined
  onChange: (id: string, value: number) => void
}) {
  const [draft, setDraft] = useState(total === undefined ? '' : String(total))
  // A background refresh may deliver a new stored allowance; adopt it unless
  // the reader is mid-edit, which the draft's divergence cannot distinguish,
  // so the provider key is the reset point.
  useEffect(() => {
    setDraft(total === undefined ? '' : String(total))
  }, [provider, total])

  return <div className={css.manual}>
    <div className={css.manualHead}>
      <span className={css.manualTitle}>{t('manual.heading')}</span>
      {remaining === undefined
        ? null
        : <span className={css.manualValue}>
          {t('manual.remaining', { amount: fmtAmount(remaining) })}
        </span>}
    </div>
    <input
      className={css.manualInput}
      type="number"
      inputMode="decimal"
      value={draft}
      placeholder={t('manual.placeholder')}
      aria-label={t('manual.heading')}
      onChange={(event) => { setDraft(event.target.value) }}
      onBlur={() => { onChange(provider, Number(draft)) }}
    />
    <p className={css.manualHint}>{t('manual.hint')}</p>
  </div>
}

/** The identity row: avatar, provider name, mode and adapter chips, status pill. */
function Identity({ t, name, account }: {
  t: QuotaTranslate
  name: string
  account: QuotaAccount | undefined
}) {
  return <div className={css.accountHead}>
    <span className={css.avatar} aria-hidden="true">{initialsOf(name)}</span>
    <span className={css.accountIdentity}>
      <span className={css.accountName}>{name}</span>
      <span className={css.accountMeta}>
        {account === undefined ? null : <span className={css.chip}>{t(MODE_KEYS[account.mode])}</span>}
        {account === undefined ? null : <span className={css.chip}>{account.adapter}</span>}
        {account?.plan === undefined ? null : <span className={css.chip}>{account.plan}</span>}
      </span>
    </span>
    {account === undefined
      ? null
      : <span className={`${css.pill} ${pillOf(account)}`}>{t(STATUS_KEYS[account.status])}</span>}
  </div>
}

/** The figures of a balance account: its remainder, then what it was measured against. */
function Figures({ t, account, tone }: {
  t: QuotaTranslate
  account: QuotaAccount
  tone: string
}) {
  if (account.remaining === undefined && account.unlimited !== true) return null
  return <div className={css.hero}>
    <span className={css.heroFigure}>
      <span className={css.heroLabel}>{t('account.remaining')}</span>
      <span className={`${css.heroValue} ${tone}`}>
        {account.unlimited === true
          ? t('account.unlimited')
          : fmtAmount(account.remaining, account.currency)}
      </span>
    </span>
    <span className={css.heroSecondaries}>
      {account.used === undefined ? null : <span className={css.secondary}>
        <span className={css.secondaryLabel}>{t('account.used')}</span>
        <span className={css.secondaryValue}>{fmtAmount(account.used, account.currency)}</span>
      </span>}
      {account.limit === undefined ? null : <span className={css.secondary}>
        <span className={css.secondaryLabel}>{t('account.limit')}</span>
        <span className={css.secondaryValue}>{fmtAmount(account.limit, account.currency)}</span>
      </span>}
    </span>
  </div>
}

export function AccountCard({
  t, providers, selected, account, manualTotal, manualRemaining,
  onSelect, onRefresh, onManualChange,
}: AccountCardProps) {
  const tone = toneOf(account?.warning)
  const windows = account?.planWindows ?? []
  const pools = account?.budgetPools ?? []
  const showManual = account !== undefined && account.status !== 'ok'
  const name = providers.find(entry => entry.id === selected)?.name ?? selected ?? ''

  return <div className={`${css.card} ${css.cardTint}`}>
    <div className={css.sectionHead}>
      <Selector providers={providers} selected={selected} onSelect={onSelect} />
      <button type="button" className={css.action} onClick={onRefresh}>{t('action.refresh')}</button>
    </div>

    <Identity t={t} name={name} account={account} />

    {account === undefined ? null : account.status === 'ok'
      ? <>
        <Figures t={t} account={account} tone={tone} />

        {windows.length === 0 ? null : <div className={css.windows}>
          {windows.map(entry => <WindowRow key={entry.kind} t={t} window={entry} tone={tone} />)}
        </div>}

        {pools.length === 0 ? null : <div className={css.pools}>
          <span className={css.poolsTitle}>{t('pools.heading')}</span>
          <ul className={css.poolList}>
            {pools.map(pool => <PoolRow key={pool.name} t={t} pool={pool} />)}
          </ul>
        </div>}

        {account.usage === undefined ? null : <GatewayUsage t={t} usage={account.usage} />}

        <p className={css.cardMeta}>
          {t('account.source', { adapter: account.adapter })}
          {' · '}
          {t('account.updated', { time: fmtTime(account.fetchedAt) })}
        </p>
      </>
      : <div>
        <p className={css.status}>{t(STATUS_KEYS[account.status])}</p>
        {account.reason === undefined ? null : <p className={css.reason}>{account.reason}</p>}
        {account.missingCredentials === undefined ? null : <p className={css.reason}>
          {t('status.missingCredentials', { names: account.missingCredentials.join(', ') })}
        </p>}
      </div>}

    {showManual && selected !== undefined
      ? <ManualBalance
        t={t}
        provider={selected}
        total={manualTotal}
        remaining={manualRemaining}
        onChange={onManualChange}
      />
      : null}
  </div>
}
