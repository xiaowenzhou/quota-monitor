/**
 * Quota monitor Host half: per-provider token accounting over the
 * `llm/stream` waterfall, account reads through the adapter registry,
 * historical usage folded from persisted session logs, derived spend and
 * budgets, downloadable exports, and the Remote face (`quotaMonitor/*`) the
 * browser panel calls.
 *
 * Credentials never leave this process. An account reading carries figures
 * and a status; the API key, cookie, or management token that produced it is
 * resolved here and discarded.
 *
 * Spend is derived only from prices a deployment configured. This plugin ships
 * no price list, because a price belongs to whichever gateway a deployment buys
 * from and a stale built-in figure would be reported as fact.
 * @module @deepseek-ai/dsh-extension-quota-monitor
 */

import { Context, Service } from '@deepseek-ai/cordis'
import zs from '@deepseek-ai/schemastery'
import { readFile } from 'node:fs/promises'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { CredentialRef, ResolvedCredential } from '@deepseek-ai/dsh-credentials'
import type { GenerateOptions, LlmConfigurableProvider, LlmProviderInfo, StreamChunk, TokenUsage } from '@deepseek-ai/dsh-llm'
import type { SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol'
import { adapterFor, credentialRefsFor, declarativeAdapter } from './adapters/index.ts'
import type { QuotaAccountReading, QuotaAdapter, QuotaAdapterContext } from './adapters/index.ts'
import { detectSub2apiPanel } from './adapters/sub2api.ts'
import { Config, CREDENTIAL_REF_PATTERN, assertConsistent, resolveMonitor } from './config.ts'
import type { QuotaMonitorConfig, QuotaMonitorConfigInput } from './config.ts'
import { buildExport } from './export.ts'
import { QuotaRequestError } from './http.ts'
import { ADAPTER_MODES, resolveProviderIdentity } from './identity.ts'
import type { QuotaAdapterId } from './identity.ts'
import type { QuotaPriceTable } from './pricing.ts'
import { loadPriceTable } from './price-import.ts'
import { QuotaUsageStore } from './usage-store.ts'
import type {
  QuotaAccount,
  QuotaAccountRequest,
  QuotaBalanceEstimate,
  QuotaExportDocument,
  QuotaExportRequest,
  QuotaProviderEntry,
  QuotaProviderRow,
  QuotaResetStatsRequest,
  QuotaSetBalancesRequest,
  QuotaSnapshot,
  QuotaUsageReport,
  QuotaUsageRequest,
  QuotaWarningLevel,
} from './types.ts'

export type * from './types.ts'
export type { QuotaMonitorConfig, QuotaMonitorConfigInput, QuotaMonitorEntry } from './config.ts'
export type { QuotaPriceRule, QuotaPriceTable } from './pricing.ts'
export { Config } from './config.ts'

/** Delay before the first background round, so boot is not spent on network calls. */
const INITIAL_DELAY_MS = 2_000

/** Well-known base URLs used when a provider profile stores none. */
const DEFAULT_BASE_URLS: Readonly<Record<string, string>> = Object.freeze({
  'deepseek-official': 'https://api.deepseek.com',
  'deepseek': 'https://api.deepseek.com',
  'minimax-cn': 'https://www.minimaxi.com',
  'minimax': 'https://www.minimax.io',
})

declare module '@deepseek-ai/cordis' {
  interface Context {
    quotaMonitor: QuotaMonitorService
  }
}

/** Provider profile fields the monitor reads from user settings. */
interface ProviderProfile {
  baseURL?: unknown
  apiKeyEnv?: unknown
}

/** A profile with nothing configured. */
const EMPTY_PROFILE: ProviderProfile = Object.freeze({})

/** One monitored credential: a provider route plus the reference it is read with. */
interface QuotaAccountSlot {
  /** Provider route key. */
  readonly id: string
  /** Credential reference this route's account is read with, when one is named. */
  readonly credentialRef?: string
}

/**
 * Cache key of one monitored credential.
 *
 * A route watched through several keys holds one reading per key, so the route
 * id alone cannot address the map; the NUL separator cannot appear in either
 * part, so two different slots never collide.
 * @param slot - the route and its credential reference.
 * @returns a key unique among a route's monitored credentials.
 */
function accountKey(slot: QuotaAccountSlot): string {
  return slot.credentialRef === undefined ? slot.id : `${slot.id}\u0000${slot.credentialRef}`
}

/** Mutable per-provider accounting bucket. */
interface QuotaMutableBucket {
  name: string
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  reasoningTokens: number
  errorCount: number
  lastCallAt: number
  lastModel: string
}

/**
 * Token usage plus account monitoring for every configured LLM provider.
 * Serves the browser panel through the Gateway as the `quotaMonitor`
 * namespace.
 */
export class QuotaMonitorService extends TypertRemoteService {
  static inject = ['llm', 'settings', 'credentials', 'sessionQuery', 'storageDomain']

  static Config: zs<QuotaMonitorConfigInput, QuotaMonitorConfig> = Config

  private readonly usage = new Map<string, QuotaMutableBucket>()
  private readonly names = new Map<string, string>()
  private readonly profiles = new Map<string, LlmConfigurableProvider>()
  /**
   * Readings keyed by route and monitored credential ({@link accountKey}), so a
   * route watched through several keys keeps one reading per key.
   */
  private readonly accounts = new Map<string, QuotaAccount>()
  private readonly manual = new Map<string, number>()
  private readonly usageStore: QuotaUsageStore
  /**
   * Prices this deployment stated, or undefined when it stated none. Rebuilt
   * whenever an imported document changes, so the field is the current table
   * rather than the one the constructor resolved.
   */
  private prices: QuotaPriceTable | undefined
  /**
   * Fingerprint outcome per route and base URL, so an unrecognized gateway is
   * asked what it is at most once per configuration.
   */
  private readonly detected = new Map<string, Promise<boolean>>()
  /**
   * The credential the panel is showing, refreshed at the active interval.
   * Absent until the panel asks for a reading.
   */
  private focused: QuotaAccountSlot | undefined

  /**
   * @param ctx - Host context carrying the llm, settings, credentials, session
   * query, and storage seams.
   * @param config - validated plugin config.
   */
  constructor(ctx: Context, public config: QuotaMonitorConfig) {
    super(ctx, 'quotaMonitor')
    assertConsistent(config)
    this.prices = config.pricing.rules.length === 0
      ? undefined
      : {
        currency: config.pricing.currency,
        rules: config.pricing.rules,
        fuzzyMatch: config.pricing.fuzzyMatch,
      }
    const priced = config.pricing.rules.length > 0 || config.pricing.imports.length > 0
    this.usageStore = new QuotaUsageStore(ctx, () => Date.now(), {
      ...this.prices === undefined ? {} : { prices: this.prices },
      ...priced ? { budgets: config.budgets } : {},
    })
  }

  /** Attach the stream tap, open the usage cache, and schedule background rounds. */
  protected async [Service.init](): Promise<void> {
    this.refresh()
    // Imported documents are read before the first report, so a deployment
    // whose prices live in a file never shows an unpriced report.
    await this.reloadPrices(true)

    const stopStream = this.ctx.on('llm/stream', (options: GenerateOptions, next: () => AsyncIterable<StreamChunk>) =>
      this.tapStream(options, next))
    // An adapter plugin may load after this one, and the background rounds a
    // deployment can disable are not the registry's only observer: re-read it
    // whenever the topology changes, so a route registered later reaches the
    // selector without waiting for its first call.
    const stopTopology = this.ctx.on('llm/adapters-updated', () => {
      this.refresh()
    })
    const closeUsage = await this.usageStore.open()

    const timers: Array<ReturnType<typeof setTimeout>> = []
    if (this.config.refresh.enabled) {
      const initial = setTimeout(() => {
        void this.runBackgroundRound()
      }, INITIAL_DELAY_MS)
      const background = setInterval(() => {
        void this.runBackgroundRound()
      }, this.config.refresh.backgroundMs)
      const active = setInterval(() => {
        void this.refreshFocusedAccount()
      }, this.config.refresh.activeMs)
      timers.push(initial, background, active)
    }

    this.ctx.effect(() => () => {
      stopStream()
      stopTopology()
      for (const timer of timers) {
        clearTimeout(timer)
        clearInterval(timer)
      }
      closeUsage()
    }, 'quota-monitor.dispose')
  }

  /**
   * Whole-registry view: the provider selector, per-process usage rows, and
   * the manual balance table.
   * @returns the snapshot served to the panel.
   */
  @Remote('getSnapshot')
  getSnapshot(): QuotaSnapshot {
    return this.snapshot()
  }

  /**
   * Read one provider's account.
   * @param request - the provider route, the credential reference to read, and
   * whether to bypass the cached reading. An absent reference reads the route's
   * first monitored credential.
   * @returns the account, including a non-`ok` status when it cannot be read.
   */
  @Remote('getAccount')
  async getAccount(request: QuotaAccountRequest): Promise<QuotaAccount> {
    const slot = this.slotFor(request)
    this.focused = slot
    const cached = this.accounts.get(accountKey(slot))
    if (cached !== undefined && request.refresh !== true) return cached
    return this.readAccount(slot)
  }

  /**
   * Read every monitored credential that has no cached reading yet, and answer
   * with the resulting snapshot.
   *
   * This is what opening the panel needs: every key a deployment monitors
   * states its own figure, while the readings a previous round already took are
   * served from cache rather than queried again.
   * @returns the snapshot carrying the readings.
   */
  @Remote('readPendingAccounts')
  async readPendingAccounts(): Promise<QuotaSnapshot> {
    await this.readRouteAccounts(slot => !this.accounts.has(accountKey(slot)))
    return this.snapshot()
  }

  /**
   * Re-read every monitored credential of every known route.
   * @returns the snapshot carrying the new readings.
   */
  @Remote('refreshAccounts')
  async refreshAccounts(): Promise<QuotaSnapshot> {
    await this.readRouteAccounts()
    return this.snapshot()
  }

  /**
   * The folded historical usage report.
   * @param request - `refresh: true` forces a fold round before answering;
   * `provider` reports that route alone instead of every route together.
   * @returns the report, with `folding` set while a round runs.
   */
  @Remote('getUsage')
  async getUsage(request: QuotaUsageRequest): Promise<QuotaUsageReport> {
    if (request.refresh === true) return this.usageStore.refresh(request.provider)
    return this.usageStore.current(request.provider)
  }

  /**
   * Build one downloadable document from the current report.
   * @param request - which document to build.
   * @returns the document, with its filename and media type.
   */
  @Remote('exportUsage')
  exportUsage(request: QuotaExportRequest): QuotaExportDocument {
    return buildExport(request.kind, this.usageStore.current(), this.providerEntries(), Date.now())
  }

  /**
   * Replace the manual balance fallbacks.
   * @param request - provider id → total allowance; a non-finite value clears the entry.
   * @returns the resulting manual balance table.
   */
  @Remote('setBalances')
  setBalances(request: QuotaSetBalancesRequest): Record<string, number> {
    for (const [id, raw] of Object.entries(request.balances)) {
      const value = typeof raw === 'number' ? raw : Number(raw)
      if (!Number.isFinite(value)) this.manual.delete(id)
      else this.manual.set(id, value)
    }
    return this.balancesView()
  }

  /**
   * Zero the per-process usage counters.
   * @param request - restrict the reset to one provider route, or clear every bucket.
   * @returns the post-reset snapshot.
   */
  @Remote('resetStats')
  resetStats(request: QuotaResetStatsRequest): QuotaSnapshot {
    for (const [id, bucket] of this.usage) {
      if (request.provider !== undefined && id !== request.provider) continue
      bucket.calls = 0
      bucket.inputTokens = 0
      bucket.outputTokens = 0
      bucket.cacheReadTokens = 0
      bucket.cacheWriteTokens = 0
      bucket.reasoningTokens = 0
      bucket.errorCount = 0
      bucket.lastCallAt = 0
      bucket.lastModel = ''
    }
    return this.snapshot()
  }

  /** Refold usage, then re-read every monitored credential. */
  private async runBackgroundRound(): Promise<void> {
    await this.reloadPrices(false)
    await this.usageStore.refresh()
    await this.readRouteAccounts()
  }

  /** Re-read only the credential the panel is showing. */
  private async refreshFocusedAccount(): Promise<void> {
    if (this.focused === undefined) return
    await this.readAccount(this.focused)
  }

  /**
   * Read monitored credentials route by route.
   *
   * Routes proceed together while one route's credentials are read in order, so
   * a gateway monitoring several keys is not asked all of them at once.
   * @param pending - which slots to read; absent reads every monitored slot.
   */
  private async readRouteAccounts(pending?: (slot: QuotaAccountSlot) => boolean): Promise<void> {
    await Promise.all([...this.usage.keys()].map(async id => {
      for (const slot of this.slotsOf(id)) {
        if (pending !== undefined && !pending(slot)) continue
        await this.readAccount(slot)
      }
    }))
  }

  /**
   * The monitored credentials of one route, in read order.
   *
   * A configured `credentialRefs` list replaces the route's own credential
   * entirely; otherwise the route has one slot, read with the monitor override
   * or with the provider key its profile names.
   * @param id - provider route key.
   * @returns one slot per monitored credential.
   */
  private slotsOf(id: string): readonly QuotaAccountSlot[] {
    const configured = resolveMonitor(this.config, id)?.credentialRefs
    if (configured !== undefined && configured.length > 0) {
      return configured.map(credentialRef => ({ id, credentialRef }))
    }
    const credentialRef = this.credentialRefOf(id)
    return [credentialRef === undefined ? { id } : { id, credentialRef }]
  }

  /** The credential reference one route's own account read uses, when one is named. */
  private credentialRefOf(id: string): string | undefined {
    const configured = resolveMonitor(this.config, id)?.credentialRef
    if (configured !== undefined) return configured
    const fromProfile = this.profileOf(id).apiKeyEnv
    return typeof fromProfile === 'string' && CREDENTIAL_REF_PATTERN.test(fromProfile) ? fromProfile : undefined
  }

  /**
   * The monitored credential one account request names.
   * @param request - provider route and optional credential reference.
   * @returns the slot, defaulting to the route's first monitored credential.
   */
  private slotFor(request: QuotaAccountRequest): QuotaAccountSlot {
    if (request.credentialRef === undefined) return this.slotsOf(request.provider)[0] ?? { id: request.provider }
    return { id: request.provider, credentialRef: request.credentialRef }
  }

  /**
   * Run one provider's adapter for one monitored credential and cache the
   * reading.
   *
   * Every failure becomes an account with a status: the panel states why a
   * figure is missing instead of drawing a zero.
   * @param slot - the route and the credential reference to read it with.
   * @returns the reading, cached under this credential.
   */
  private async readAccount(slot: QuotaAccountSlot): Promise<QuotaAccount> {
    this.refresh()
    const { id, credentialRef } = slot
    const name = this.names.get(id) ?? id
    const fetchedAt = Date.now()
    const entry = resolveMonitor(this.config, id)
    const profile = this.profileOf(id)
    const baseURL = trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id]
    const identity = resolveProviderIdentity(id, baseURL, entry?.adapter)

    const base: QuotaAccount = {
      id,
      name,
      mode: identity.mode,
      status: 'unsupported',
      adapter: identity.adapter ?? 'none',
      ...credentialRef === undefined ? {} : { credentialRef },
      fetchedAt,
    }

    const apiKey = await this.resolveApiKey(profile.apiKeyEnv)
    const context: QuotaAdapterContext = {
      id,
      now: () => Date.now(),
      credential: reference => this.resolveApiKey(reference),
      ...baseURL === undefined ? {} : { baseURL },
      ...apiKey === undefined ? {} : { apiKey },
      ...entry?.usageBaseURL === undefined ? {} : { usageBaseURL: entry.usageBaseURL },
      ...credentialRef === undefined ? {} : { credentialRef },
      ...entry?.allowPlaintextEndpoint === true ? { allowPlaintext: true } : {},
      ...entry?.allowedHosts === undefined ? {} : { allowedHosts: entry.allowedHosts.map(host => host.toLowerCase()) },
    }

    const adapter = this.adapterFor(identity.adapter, entry)
      ?? await this.detectAdapter(identity.adapter, context)
    if (adapter === undefined) {
      return this.publish({
        ...base,
        reason: 'this provider publishes no account endpoint',
        ...this.manualOf(id),
      })
    }

    const mode = ADAPTER_MODES[adapter.id]
    try {
      const reading = await adapter.read(context)
      return this.publish(this.accountOf(base, adapter, reading.mode ?? mode, reading, entry))
    } catch (error) {
      const status = error instanceof QuotaRequestError ? error.status : 'unavailable'
      const reason = error instanceof QuotaRequestError ? error.message : 'account read failed'
      const missing = status === 'not-configured' ? credentialRefsFor(adapter.id) : []
      return this.publish({
        ...base,
        mode,
        adapter: adapter.id,
        status,
        reason,
        ...missing.length === 0 ? {} : { missingCredentials: missing },
        ...this.manualOf(id),
      })
    }
  }

  /** Assemble one successful reading into an account row. */
  private accountOf(
    base: QuotaAccount,
    adapter: QuotaAdapter,
    mode: QuotaAccount['mode'],
    reading: QuotaAccountReading,
    entry: ReturnType<typeof resolveMonitor>,
  ): QuotaAccount {
    const warning = this.warningOf(reading, entry)
    return {
      ...base,
      mode,
      adapter: adapter.id,
      status: 'ok',
      ...reading.remaining === undefined ? {} : { remaining: reading.remaining },
      ...reading.used === undefined ? {} : { used: reading.used },
      ...reading.limit === undefined ? {} : { limit: reading.limit },
      ...reading.currency === undefined ? {} : { currency: reading.currency },
      ...reading.unlimited === undefined ? {} : { unlimited: reading.unlimited },
      ...reading.plan === undefined ? {} : { plan: reading.plan },
      ...reading.planWindows === undefined ? {} : { planWindows: reading.planWindows },
      ...reading.budgetPools === undefined ? {} : { budgetPools: reading.budgetPools },
      ...reading.usage === undefined ? {} : { usage: reading.usage },
      ...warning === undefined ? {} : { warning },
    }
  }

  /**
   * Severity of a reading, from the configured thresholds.
   *
   * A balance account compares its remainder against absolute amounts; a
   * subscription account compares the tightest window's used share, since
   * there is no amount to compare.
   */
  private warningOf(
    reading: QuotaAccountReading,
    entry: ReturnType<typeof resolveMonitor>,
  ): QuotaWarningLevel | undefined {
    if (reading.unlimited === true) return 'normal'
    const windows = reading.planWindows
    if (windows !== undefined && windows.length > 0) {
      const used = Math.max(...windows.map(window => window.percentUsed))
      if (used >= this.config.thresholds.criticalPercentUsed) return 'critical'
      return used >= this.config.thresholds.warningPercentUsed ? 'warning' : 'normal'
    }
    const remaining = reading.remaining
    if (remaining === undefined) return undefined
    const critical = entry?.criticalRemaining ?? this.config.thresholds.criticalRemaining
    const warning = entry?.warningRemaining ?? this.config.thresholds.warningRemaining
    if (remaining <= critical) return 'critical'
    return remaining <= warning ? 'warning' : 'normal'
  }

  /** Cache one account reading under its route and credential and return it. */
  private publish(account: QuotaAccount): QuotaAccount {
    this.accounts.set(accountKey(account), account)
    return account
  }

  /** The adapter one provider runs, including a configured declarative spec. */
  private adapterFor(
    id: QuotaAdapterId | null,
    entry: ReturnType<typeof resolveMonitor>,
  ): QuotaAdapter | undefined {
    if (entry?.declarative !== undefined) return declarativeAdapter(entry.declarative)
    return id === null ? undefined : adapterFor(id)
  }

  /**
   * Ask an unrecognized gateway what it is, and run the matching adapter.
   *
   * Only a route no rule resolved reaches this, and only when it already holds
   * a credential — a gateway this build cannot name and cannot authenticate
   * against has nothing to disclose. The question itself carries no credential,
   * and its answer is remembered so the request is not repeated every round.
   */
  private async detectAdapter(
    resolved: QuotaAdapterId | null,
    context: QuotaAdapterContext,
  ): Promise<QuotaAdapter | undefined> {
    if (resolved !== null || !this.config.detection.enabled) return undefined
    if (context.apiKey === undefined && context.credentialRef === undefined) return undefined
    const key = `${context.id}\u0000${context.usageBaseURL ?? context.baseURL ?? ''}`
    let answer = this.detected.get(key)
    if (answer === undefined) {
      answer = detectSub2apiPanel(context)
      this.detected.set(key, answer)
    }
    return await answer ? adapterFor('sub2api-auth') : undefined
  }

  /** The manual allowance fallback for one provider, when the user entered one. */
  private manualOf(id: string): { manual?: QuotaBalanceEstimate } {
    const estimate = manualBalanceEstimate(this.manual.get(id), this.totalTokensOf(id))
    return estimate === null ? {} : { manual: estimate }
  }

  /** Tokens observed this process for one provider route. */
  private totalTokensOf(id: string): number {
    const bucket = this.usage.get(id)
    if (bucket === undefined) return 0
    return bucket.inputTokens + bucket.outputTokens + bucket.cacheReadTokens + bucket.cacheWriteTokens
  }

  /** Count one streaming call per provider, forwarding chunks unchanged. */
  private tapStream(
    options: GenerateOptions,
    next: () => AsyncIterable<StreamChunk>,
  ): AsyncIterable<StreamChunk> {
    const id = options.provider || 'unknown'
    const bucket = this.bucketFor(id, this.names.get(id) ?? id)
    const recordUsage = (chunk: StreamChunk): void => {
      if (chunk.type === 'usage') this.addUsage(bucket, chunk.usage)
    }
    return (async function* () {
      let counted = false
      try {
        for await (const chunk of next()) {
          if (!counted) {
            counted = true
            bucket.calls += 1
            bucket.lastCallAt = Date.now()
            bucket.lastModel = options.model
          }
          recordUsage(chunk)
          yield chunk
        }
      } catch (error) {
        bucket.errorCount += 1
        throw error
      }
    })()
  }

  /** Accumulate one usage report into a bucket. */
  private addUsage(bucket: QuotaMutableBucket, usage: TokenUsage): void {
    bucket.inputTokens += usage.inputTokens || 0
    bucket.outputTokens += usage.outputTokens || 0
    bucket.cacheReadTokens += usage.cacheReadTokens ?? 0
    bucket.cacheWriteTokens += usage.cacheWriteTokens ?? 0
    bucket.reasoningTokens += usage.reasoningTokens ?? 0
  }

  /**
   * Reload the price table, including every configured document.
   *
   * A deployment that keeps prices in a file edits that file, not the profile
   * patch: re-reading on each round is what makes the edit take effect without
   * a restart. The table is replaced only when it actually changed, so a
   * steady-state round costs one read per document and no report rebuild.
   * @param failLoud - whether an unreadable document throws instead of being
   * logged. True at load, where it is a configuration error; false afterwards,
   * where keeping the last good table beats blanking every cost figure.
   */
  private async reloadPrices(failLoud: boolean): Promise<void> {
    let next: QuotaPriceTable | undefined
    try {
      next = await loadPriceTable(this.config, path => readFile(path, 'utf8'))
    } catch (error) {
      if (failLoud) throw error
      this.ctx.logger.warn(`quota monitor: keeping the previous price table: ${String(error)}`)
      return
    }
    const before = this.prices === undefined ? '' : JSON.stringify(this.prices)
    const after = next === undefined ? '' : JSON.stringify(next)
    this.prices = next
    if (before === after) return
    this.usageStore.setPrices(next)
  }

  /** Re-read the provider registry and configurable-provider directory. */
  private refresh(): void {
    const llm = this.ctx.llm
    for (const provider of llm.listProviders()) this.noteProvider(provider)
    for (const entry of llm.listConfigurableProviders()) {
      this.profiles.set(entry.provider, entry)
    }
  }

  private noteProvider(provider: LlmProviderInfo): void {
    if (provider.id === '') return
    this.names.set(provider.id, provider.name || provider.id)
    this.bucketFor(provider.id, provider.name || provider.id)
  }

  private bucketFor(id: string, name: string): QuotaMutableBucket {
    let bucket = this.usage.get(id)
    if (bucket === undefined) {
      bucket = {
        name,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        errorCount: 0,
        lastCallAt: 0,
        lastModel: '',
      }
      this.usage.set(id, bucket)
    } else if (name !== '') {
      bucket.name = name
    }
    return bucket
  }

  /** Resolve the settings section backing one configurable provider. */
  private profileOf(id: string): ProviderProfile {
    const entry = this.profiles.get(id)
    if (entry === undefined) return EMPTY_PROFILE
    const section = this.settingsSection(entry.settingsNs, entry.settingsPath)
    if (typeof section !== 'object' || section === null) return EMPTY_PROFILE
    const record = section as Record<string, unknown>
    return { baseURL: record['baseURL'], apiKeyEnv: record['apiKeyEnv'] }
  }

  /**
   * One settings section, read from whichever settings surface this deployment
   * runs.
   *
   * The namespace-document API exposes `get(ns)`; the forms API that replaced it
   * exposes `describe()`, whose rows carry the same live values keyed by profile
   * entry id. A plugin loaded into a deployment it was not built against must
   * read either one, so both are addressed structurally rather than through the
   * settings seam's own method types.
   * @param ns - namespace (profile entry id) owning the section.
   * @param path - path from that section to one provider's profile.
   * @returns the section, or `undefined` when this deployment cannot supply it.
   */
  private settingsSection(ns: string, path: readonly string[]): unknown {
    const settings = this.ctx.settings as unknown as {
      get?: (namespace: SettingsNamespace) => unknown
      describe?: () => readonly { ns: string; value?: unknown }[]
    }
    let section: unknown
    try {
      if (typeof settings.get === 'function') {
        // The provider directory carries a plain string; the settings service
        // brands and validates it at the boundary, so naming the brand here is
        // the whole conversion.
        section = settings.get(brandString<SettingsNamespace>(ns))
      } else if (typeof settings.describe === 'function') {
        section = settings.describe().find(row => row.ns === ns)?.value
      } else {
        return undefined
      }
    } catch {
      return undefined
    }
    for (const key of path) {
      if (typeof section !== 'object' || section === null) return undefined
      section = (section as Record<string, unknown>)[key]
    }
    return section
  }

  /** Current credential value for one reference name, or undefined. */
  private async resolveApiKey(reference: unknown): Promise<string | undefined> {
    if (typeof reference !== 'string' || !CREDENTIAL_REF_PATTERN.test(reference)) return undefined
    try {
      // The grammar check above is the seam's own `isCredentialRefName`, so the
      // brand below is the whole conversion — same reason `profileOf` brands its
      // settings namespace rather than importing the seam's helper. Both brands
      // come from `dsh-brand`, whose runtime surface stays valid across
      // duplicate installs; the seam's marker functions do not.
      const resolved: ResolvedCredential | undefined =
        await this.ctx.credentials.resolve(brandString<CredentialRef>(reference))
      return resolved?.value
    } catch {
      return undefined
    }
  }

  /** The provider selector entries, one per known route. */
  private providerEntries(): QuotaProviderEntry[] {
    const entries: QuotaProviderEntry[] = []
    for (const [id, bucket] of this.usage) {
      const monitor = resolveMonitor(this.config, id)
      const profile = this.profileOf(id)
      const baseURL = trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id]
      const identity = resolveProviderIdentity(id, baseURL, monitor?.adapter)
      const adapter = monitor?.declarative !== undefined ? 'declarative' : identity.adapter
      const slots = this.slotsOf(id)
      // The route-level fields describe its first monitored credential, which
      // is the one a single-credential route has always reported.
      const account = slots[0] === undefined ? undefined : this.accounts.get(accountKey(slots[0]))
      const accounts: QuotaAccount[] = []
      for (const slot of slots) {
        const reading = this.accounts.get(accountKey(slot))
        if (reading !== undefined) accounts.push(reading)
      }
      entries.push({
        id,
        name: bucket.name,
        // A read that declared its own mode wins: the same gateway serves a
        // wallet or a subscription, and the card frame follows the answer.
        mode: account?.mode ?? (adapter === null ? 'unsupported' : ADAPTER_MODES[adapter]),
        adapter: account?.adapter ?? adapter ?? 'none',
        status: account?.status ?? 'unsupported',
        ...account?.warning === undefined ? {} : { warning: account.warning },
        credentialRefs: slots.flatMap(slot => slot.credentialRef === undefined ? [] : [slot.credentialRef]),
        accounts,
      })
    }
    return entries
  }

  /** Assemble the snapshot from the current accounting maps. */
  private snapshot(): QuotaSnapshot {
    const rows: QuotaProviderRow[] = []
    const aggregate = { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
    for (const [id, bucket] of this.usage) {
      const totalTokens = bucket.inputTokens + bucket.outputTokens
        + bucket.cacheReadTokens + bucket.cacheWriteTokens
      rows.push({
        id,
        name: bucket.name,
        calls: bucket.calls,
        inputTokens: bucket.inputTokens,
        outputTokens: bucket.outputTokens,
        cacheReadTokens: bucket.cacheReadTokens,
        cacheWriteTokens: bucket.cacheWriteTokens,
        reasoningTokens: bucket.reasoningTokens,
        totalTokens,
        errorCount: bucket.errorCount,
        lastCallAt: bucket.lastCallAt,
        lastModel: bucket.lastModel,
        balance: manualBalanceEstimate(this.manual.get(id), totalTokens),
      })
      aggregate.calls += bucket.calls
      aggregate.inputTokens += bucket.inputTokens
      aggregate.outputTokens += bucket.outputTokens
      aggregate.totalTokens += bucket.inputTokens + bucket.outputTokens
    }
    return {
      capturedAt: Date.now(),
      providers: this.providerEntries(),
      rows,
      balances: this.balancesView(),
      aggregate,
    }
  }

  /** The manual balance table as a plain object. */
  private balancesView(): Record<string, number> {
    return Object.fromEntries(this.manual)
  }
}

/**
 * Rough spend estimate behind a manually entered allowance.
 * @param total - the manual allowance, or undefined when none was entered.
 * @param totalTokens - tokens observed this process.
 * @returns the estimate, or null without a manual figure.
 */
function manualBalanceEstimate(total: number | undefined, totalTokens: number): QuotaBalanceEstimate | null {
  if (total === undefined) return null
  const spent = totalTokens / 1_000_000
  return {
    total,
    spent,
    remaining: Math.max(0, total - spent),
    pct: total > 0 ? (spent / total) * 100 : 0,
  }
}

/** Trim trailing slashes off a stored base URL. */
function trimBaseURL(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim().replace(/\/+$/, '')
  return trimmed === '' ? undefined : trimmed
}

export default QuotaMonitorService
