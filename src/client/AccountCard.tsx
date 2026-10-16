/**
 * The selected provider's balance, plan windows, key management and read status.
 * Provider selection belongs to the page toolbar.
 *
 * A non-`ok` status renders its reason instead of a figure. The card never
 * substitutes zero for a number it could not read.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/AccountCard
 */

import { useEffect, useState, type ReactNode } from 'react'
import { Button, IconRefreshOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  QuotaKeyRequest,
  QuotaAccount,
  QuotaAccountMode,
  QuotaAccountStatus,
  QuotaBudgetPool,
  QuotaGatewayUsage,
  QuotaPlanWindow,
  QuotaProviderEntry,
  QuotaWarningLevel,
} from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { fmtAmount, fmtNumber, fmtTime, fmtTokens, initialsOf, resetLabel } from './format.ts'
import { WINDOW_KEYS } from './windows.ts'
import { KeyManager } from './KeyManager.tsx'
import css from './AccountCard.module.css'

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
  /** Credential reference of the shown reading; absent is the route's own key. */
  selectedCredential: string | undefined
  account: QuotaAccount | undefined
  manualTotal: number | undefined
  manualRemaining: number | undefined
  onSelect: (id: string, credentialRef: string | undefined) => void
  onManage: (request: QuotaKeyRequest) => Promise<void>
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

/** The slot the card reads: a route, and one of its monitored credentials. */
interface AccountSlot {
  id: string | undefined
  credentialRef: string | undefined
}

/**
 * The slot references a route's selector draws a chip for.
 *
 * A route that configured no reference still watches one credential, the one
 * its profile supplies, so it draws one unnamed chip.
 * @param entry - the route.
 * @returns one entry per chip, `undefined` for the route's own credential.
 */
function slotsOf(entry: QuotaProviderEntry): readonly (string | undefined)[] {
  return entry.credentialRefs.length === 0 ? [undefined] : entry.credentialRefs
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
    <span>{pool.limit === undefined
      ? t('pool.remaining', { name: pool.name, amount })
      : t('pool.remainingOfLimit', { name: pool.name, amount, limit: fmtAmount(pool.limit) })}</span>
    {pool.percentUsed === undefined ? null : <div className={css.bar}>
      <div className={css.barFill} style={{ width: `${pool.percentUsed}%` }} />
    </div>}
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
  return <tr>
    <td><span className={css.gatewayLabel} title={row.label}>{row.label}</span></td>
    <td className={css.gatewayValue}>{parts.join(' · ')}</td>
  </tr>
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
      <div className={css.tableScroll}>
        <table className={css.gatewayTable}>
          <thead><tr><th scope="col">{t(GATEWAY_GROUPS[kind])}</th><th scope="col">{t('gateway.figures')}</th></tr></thead>
          <tbody>{rows.slice(0, GATEWAY_ROWS).map(row => <GatewayRow
            key={`${row.kind}:${row.label}`}
            t={t}
            row={row}
          />)}</tbody>
        </table>
      </div>
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
      <p className={css.manualHint}>{t('manual.hint')}</p>
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
  </div>
}

/**
 * The card head: avatar, provider name, mode, adapter and key chips, status
 * pill, then the card's action. The name is said once, as the card title.
 */
function Identity({ t, name, credential, account, action }: {
  t: QuotaTranslate
  name: string
  credential: string | undefined
  account: QuotaAccount | undefined
  action: ReactNode
}) {
  return <div className={css.accountHead}>
    <span className={css.avatar} aria-hidden="true">{initialsOf(name)}</span>
    <span className={css.accountIdentity}>
      <h3 className={css.accountName} title={name}>{name}</h3>
      <span className={css.accountMeta}>
        {account === undefined ? null : <span className={css.chip}>{t(MODE_KEYS[account.mode])}</span>}
        {account === undefined ? null : <span className={css.chip}>{account.adapter}</span>}
        {credential === undefined ? null : <span className={css.chip}>{credential}</span>}
        {account?.plan === undefined ? null : <span className={css.chip}>{account.plan}</span>}
      </span>
    </span>
    {account === undefined
      ? null
      : <span className={`${css.pill} ${pillOf(account)}`}>{t(STATUS_KEYS[account.status])}</span>}
    {action}
  </div>
}

/** The figures of a balance account: its remainder, then what it was measured against. */
function Figures({ t, account, tone }: {
  t: QuotaTranslate
  account: QuotaAccount
  tone: string
}) {
  if (account.remaining === undefined && account.unlimited !== true) return null
  return <div className={css.figures}>
    <span className={css.figure}>
      <span className={css.figureLabel}>{t('account.remaining')}</span>
      <span className={`${css.figureValue} ${tone}`}>
        {account.unlimited === true
          ? t('account.unlimited')
          : fmtAmount(account.remaining, account.currency)}
      </span>
    </span>
    {account.used === undefined ? null : <span className={css.figure}>
      <span className={css.figureLabel}>{t('account.used')}</span>
      <span className={css.figureValue}>{fmtAmount(account.used, account.currency)}</span>
    </span>}
    {account.limit === undefined ? null : <span className={css.figure}>
      <span className={css.figureLabel}>{t('account.limit')}</span>
      <span className={css.figureValue}>{fmtAmount(account.limit, account.currency)}</span>
    </span>}
  </div>
}

export function AccountCard({
  t, providers, selected, selectedCredential, account, manualTotal, manualRemaining,
  onSelect, onManage, onRefresh, onManualChange,
}: AccountCardProps) {
  const tone = toneOf(account?.warning)
  const windows = account?.planWindows ?? []
  const pools = account?.budgetPools ?? []
  const showManual = account !== undefined && account.status !== 'ok'
  const entry = providers.find(candidate => candidate.id === selected)
  const name = entry?.name ?? selected ?? ''
  const slots = entry === undefined ? [] : slotsOf(entry)
  // An absent reference names the route's first monitored credential, so that
  // key is the one the card reads until the reader picks another.
  const slot: AccountSlot = { id: selected, credentialRef: selectedCredential ?? slots[0] }
  // The card names the key only where the route has more than one, which is
  // where the reader cannot tell them apart by the route name alone.
  const credential = slots.length > 1 ? account?.credentialRef : undefined

  return <div className={css.stack}>
    <section className={css.card}>
      <Identity
        t={t}
        name={name}
        credential={credential}
        account={account}
        action={<Button variant="outline" size="sm" icon={<IconRefreshOutlineRegular size={14} />} onClick={onRefresh}>{t('action.refresh')}</Button>}
      />
      {account?.accountName ? <p className={css.reason}>{account.accountName}</p> : null}

      {account === undefined ? null : account.status === 'ok'
        ? <>
          <Figures t={t} account={account} tone={tone} />

          {windows.length === 0 ? null : <div className={css.windows}>
            {windows.map(entry => <WindowRow key={entry.kind} t={t} window={entry} tone={tone} />)}
          </div>}

          {pools.length === 0 ? null : <div className={css.pools}>
            <h4 className={css.poolsTitle}>{t('pools.heading')}</h4>
            <ul className={css.poolList}>
              {pools.map(pool => <PoolRow key={pool.name} t={t} pool={pool} />)}
            </ul>
          </div>}

          {account.usage === undefined ? null : <GatewayUsage t={t} usage={account.usage} />}
        </>
        : <>
          {account.reason === undefined || account.reason === t(STATUS_KEYS[account.status])
            ? null : <p className={css.reason}>{account.reason}</p>}
          {account.missingCredentials === undefined ? null : <p className={css.reason}>
            {t('status.missingCredentials', { names: account.missingCredentials.join(', ') })}
          </p>}
        </>}

      {showManual && selected !== undefined
        ? <ManualBalance
          t={t}
          provider={selected}
          total={manualTotal}
          remaining={manualRemaining}
          onChange={onManualChange}
        />
        : null}

      {account?.status !== 'ok' ? null : <p className={css.cardMeta}>
        {t('account.source', { adapter: account.adapter })}
        {' · '}
        {t('account.updated', { time: fmtTime(account.fetchedAt) })}
      </p>}
    </section>
    {entry === undefined ? null : <KeyManager key={entry.id} t={t} entry={entry} selected={slot.credentialRef}
      onSelect={ref => onSelect(entry.id, ref)} onManage={onManage} />}
  </div>
}
