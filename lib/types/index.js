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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Service } from '@deepseek-ai/cordis';
import { readFile } from 'node:fs/promises';
import { brandString } from '@deepseek-ai/dsh-brand';
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { adapterFor, credentialRefsFor, declarativeAdapter } from "./adapters/index.js";
import { detectSub2apiPanel } from "./adapters/sub2api.js";
import { Config, assertConsistent, resolveMonitor } from "./config.js";
import { buildExport } from "./export.js";
import { QuotaRequestError } from "./http.js";
import { ADAPTER_MODES, resolveProviderIdentity } from "./identity.js";
import { loadPriceTable } from "./price-import.js";
import { QuotaUsageStore } from "./usage-store.js";
export { Config } from "./config.js";
/** Delay before the first background round, so boot is not spent on network calls. */
const INITIAL_DELAY_MS = 2_000;
/** Credential reference grammar accepted by the credentials seam. */
const credentialRefPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
/** Well-known base URLs used when a provider profile stores none. */
const DEFAULT_BASE_URLS = Object.freeze({
    'deepseek-official': 'https://api.deepseek.com',
    'deepseek': 'https://api.deepseek.com',
    'minimax-cn': 'https://www.minimaxi.com',
    'minimax': 'https://www.minimax.io',
});
/** A profile with nothing configured. */
const EMPTY_PROFILE = Object.freeze({});
/**
 * Token usage plus account monitoring for every configured LLM provider.
 * Serves the browser panel through the Gateway as the `quotaMonitor`
 * namespace.
 */
let QuotaMonitorService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _getSnapshot_decorators;
    let _getAccount_decorators;
    let _getUsage_decorators;
    let _exportUsage_decorators;
    let _setBalances_decorators;
    let _resetStats_decorators;
    return class QuotaMonitorService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getSnapshot_decorators = [Remote('getSnapshot')];
            _getAccount_decorators = [Remote('getAccount')];
            _getUsage_decorators = [Remote('getUsage')];
            _exportUsage_decorators = [Remote('exportUsage')];
            _setBalances_decorators = [Remote('setBalances')];
            _resetStats_decorators = [Remote('resetStats')];
            __esDecorate(this, null, _getSnapshot_decorators, { kind: "method", name: "getSnapshot", static: false, private: false, access: { has: obj => "getSnapshot" in obj, get: obj => obj.getSnapshot }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAccount_decorators, { kind: "method", name: "getAccount", static: false, private: false, access: { has: obj => "getAccount" in obj, get: obj => obj.getAccount }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getUsage_decorators, { kind: "method", name: "getUsage", static: false, private: false, access: { has: obj => "getUsage" in obj, get: obj => obj.getUsage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _exportUsage_decorators, { kind: "method", name: "exportUsage", static: false, private: false, access: { has: obj => "exportUsage" in obj, get: obj => obj.exportUsage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setBalances_decorators, { kind: "method", name: "setBalances", static: false, private: false, access: { has: obj => "setBalances" in obj, get: obj => obj.setBalances }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resetStats_decorators, { kind: "method", name: "resetStats", static: false, private: false, access: { has: obj => "resetStats" in obj, get: obj => obj.resetStats }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        config = __runInitializers(this, _instanceExtraInitializers);
        static inject = ['llm', 'settings', 'credentials', 'sessionQuery', 'storageDomain'];
        static Config = Config;
        usage = new Map();
        names = new Map();
        profiles = new Map();
        accounts = new Map();
        manual = new Map();
        usageStore;
        /**
         * Prices this deployment stated, or undefined when it stated none. Rebuilt
         * whenever an imported document changes, so the field is the current table
         * rather than the one the constructor resolved.
         */
        prices;
        /**
         * Fingerprint outcome per route and base URL, so an unrecognized gateway is
         * asked what it is at most once per configuration.
         */
        detected = new Map();
        /** Provider whose account the panel is showing, refreshed at the active interval. */
        focused;
        /**
         * @param ctx - Host context carrying the llm, settings, credentials, session
         * query, and storage seams.
         * @param config - validated plugin config.
         */
        constructor(ctx, config) {
            super(ctx, 'quotaMonitor');
            this.config = config;
            assertConsistent(config);
            this.prices = config.pricing.rules.length === 0
                ? undefined
                : {
                    currency: config.pricing.currency,
                    rules: config.pricing.rules,
                    fuzzyMatch: config.pricing.fuzzyMatch,
                };
            const priced = config.pricing.rules.length > 0 || config.pricing.imports.length > 0;
            this.usageStore = new QuotaUsageStore(ctx, () => Date.now(), {
                ...this.prices === undefined ? {} : { prices: this.prices },
                ...priced ? { budgets: config.budgets } : {},
            });
        }
        /** Attach the stream tap, open the usage cache, and schedule background rounds. */
        async [Service.init]() {
            this.refresh();
            // Imported documents are read before the first report, so a deployment
            // whose prices live in a file never shows an unpriced report.
            await this.reloadPrices(true);
            const stopStream = this.ctx.on('llm/stream', (options, next) => this.tapStream(options, next));
            // An adapter plugin may load after this one, and the background rounds a
            // deployment can disable are not the registry's only observer: re-read it
            // whenever the topology changes, so a route registered later reaches the
            // selector without waiting for its first call.
            const stopTopology = this.ctx.on('llm/adapters-updated', () => {
                this.refresh();
            });
            const closeUsage = await this.usageStore.open();
            const timers = [];
            if (this.config.refresh.enabled) {
                const initial = setTimeout(() => {
                    void this.runBackgroundRound();
                }, INITIAL_DELAY_MS);
                const background = setInterval(() => {
                    void this.runBackgroundRound();
                }, this.config.refresh.backgroundMs);
                const active = setInterval(() => {
                    void this.refreshFocusedAccount();
                }, this.config.refresh.activeMs);
                timers.push(initial, background, active);
            }
            this.ctx.effect(() => () => {
                stopStream();
                stopTopology();
                for (const timer of timers) {
                    clearTimeout(timer);
                    clearInterval(timer);
                }
                closeUsage();
            }, 'quota-monitor.dispose');
        }
        /**
         * Whole-registry view: the provider selector, per-process usage rows, and
         * the manual balance table.
         * @returns the snapshot served to the panel.
         */
        getSnapshot() {
            return this.snapshot();
        }
        /**
         * Read one provider's account.
         * @param request - the provider and whether to bypass the cached reading.
         * @returns the account, including a non-`ok` status when it cannot be read.
         */
        async getAccount(request) {
            this.focused = request.provider;
            const cached = this.accounts.get(request.provider);
            if (cached !== undefined && request.refresh !== true)
                return cached;
            return this.readAccount(request.provider);
        }
        /**
         * The folded historical usage report.
         * @param request - `refresh: true` forces a fold round before answering;
         * `provider` reports that route alone instead of every route together.
         * @returns the report, with `folding` set while a round runs.
         */
        async getUsage(request) {
            if (request.refresh === true)
                return this.usageStore.refresh(request.provider);
            return this.usageStore.current(request.provider);
        }
        /**
         * Build one downloadable document from the current report.
         * @param request - which document to build.
         * @returns the document, with its filename and media type.
         */
        exportUsage(request) {
            return buildExport(request.kind, this.usageStore.current(), this.providerEntries(), Date.now());
        }
        /**
         * Replace the manual balance fallbacks.
         * @param request - provider id → total allowance; a non-finite value clears the entry.
         * @returns the resulting manual balance table.
         */
        setBalances(request) {
            for (const [id, raw] of Object.entries(request.balances)) {
                const value = typeof raw === 'number' ? raw : Number(raw);
                if (!Number.isFinite(value))
                    this.manual.delete(id);
                else
                    this.manual.set(id, value);
            }
            return this.balancesView();
        }
        /**
         * Zero the per-process usage counters.
         * @param request - restrict the reset to one provider route, or clear every bucket.
         * @returns the post-reset snapshot.
         */
        resetStats(request) {
            for (const [id, bucket] of this.usage) {
                if (request.provider !== undefined && id !== request.provider)
                    continue;
                bucket.calls = 0;
                bucket.inputTokens = 0;
                bucket.outputTokens = 0;
                bucket.cacheReadTokens = 0;
                bucket.cacheWriteTokens = 0;
                bucket.reasoningTokens = 0;
                bucket.errorCount = 0;
                bucket.lastCallAt = 0;
                bucket.lastModel = '';
            }
            return this.snapshot();
        }
        /** Refold usage and refresh the focused provider's account. */
        async runBackgroundRound() {
            await this.reloadPrices(false);
            await this.usageStore.refresh();
            await this.refreshFocusedAccount();
        }
        /** Re-read only the account the panel is showing. */
        async refreshFocusedAccount() {
            const id = this.focused;
            if (id === undefined)
                return;
            await this.readAccount(id);
        }
        /**
         * Run one provider's adapter and cache the reading.
         *
         * Every failure becomes an account with a status: the panel states why a
         * figure is missing instead of drawing a zero.
         */
        async readAccount(id) {
            this.refresh();
            const name = this.names.get(id) ?? id;
            const fetchedAt = Date.now();
            const entry = resolveMonitor(this.config, id);
            const profile = this.profileOf(id);
            const baseURL = trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id];
            const identity = resolveProviderIdentity(id, baseURL, entry?.adapter);
            const base = {
                id,
                name,
                mode: identity.mode,
                status: 'unsupported',
                adapter: identity.adapter ?? 'none',
                fetchedAt,
            };
            const apiKey = await this.resolveApiKey(profile.apiKeyEnv);
            const context = {
                id,
                now: () => Date.now(),
                credential: reference => this.resolveApiKey(reference),
                ...baseURL === undefined ? {} : { baseURL },
                ...apiKey === undefined ? {} : { apiKey },
                ...entry?.usageBaseURL === undefined ? {} : { usageBaseURL: entry.usageBaseURL },
                ...entry?.credentialRef === undefined ? {} : { credentialRef: entry.credentialRef },
                ...entry?.allowPlaintextEndpoint === true ? { allowPlaintext: true } : {},
                ...entry?.allowedHosts === undefined ? {} : { allowedHosts: entry.allowedHosts.map(host => host.toLowerCase()) },
            };
            const adapter = this.adapterFor(identity.adapter, entry)
                ?? await this.detectAdapter(identity.adapter, context);
            if (adapter === undefined) {
                return this.publish({
                    ...base,
                    reason: 'this provider publishes no account endpoint',
                    ...this.manualOf(id),
                });
            }
            const mode = ADAPTER_MODES[adapter.id];
            try {
                const reading = await adapter.read(context);
                return this.publish(this.accountOf(base, adapter, reading.mode ?? mode, reading, entry));
            }
            catch (error) {
                const status = error instanceof QuotaRequestError ? error.status : 'unavailable';
                const reason = error instanceof QuotaRequestError ? error.message : 'account read failed';
                const missing = status === 'not-configured' ? credentialRefsFor(adapter.id) : [];
                return this.publish({
                    ...base,
                    mode,
                    adapter: adapter.id,
                    status,
                    reason,
                    ...missing.length === 0 ? {} : { missingCredentials: missing },
                    ...this.manualOf(id),
                });
            }
        }
        /** Assemble one successful reading into an account row. */
        accountOf(base, adapter, mode, reading, entry) {
            const warning = this.warningOf(reading, entry);
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
            };
        }
        /**
         * Severity of a reading, from the configured thresholds.
         *
         * A balance account compares its remainder against absolute amounts; a
         * subscription account compares the tightest window's used share, since
         * there is no amount to compare.
         */
        warningOf(reading, entry) {
            if (reading.unlimited === true)
                return 'normal';
            const windows = reading.planWindows;
            if (windows !== undefined && windows.length > 0) {
                const used = Math.max(...windows.map(window => window.percentUsed));
                if (used >= this.config.thresholds.criticalPercentUsed)
                    return 'critical';
                return used >= this.config.thresholds.warningPercentUsed ? 'warning' : 'normal';
            }
            const remaining = reading.remaining;
            if (remaining === undefined)
                return undefined;
            const critical = entry?.criticalRemaining ?? this.config.thresholds.criticalRemaining;
            const warning = entry?.warningRemaining ?? this.config.thresholds.warningRemaining;
            if (remaining <= critical)
                return 'critical';
            return remaining <= warning ? 'warning' : 'normal';
        }
        /** Cache one account reading and return it. */
        publish(account) {
            this.accounts.set(account.id, account);
            return account;
        }
        /** The adapter one provider runs, including a configured declarative spec. */
        adapterFor(id, entry) {
            if (entry?.declarative !== undefined)
                return declarativeAdapter(entry.declarative);
            return id === null ? undefined : adapterFor(id);
        }
        /**
         * Ask an unrecognized gateway what it is, and run the matching adapter.
         *
         * Only a route no rule resolved reaches this, and only when it already holds
         * a credential — a gateway this build cannot name and cannot authenticate
         * against has nothing to disclose. The question itself carries no credential,
         * and its answer is remembered so the request is not repeated every round.
         */
        async detectAdapter(resolved, context) {
            if (resolved !== null || !this.config.detection.enabled)
                return undefined;
            if (context.apiKey === undefined && context.credentialRef === undefined)
                return undefined;
            const key = `${context.id}\u0000${context.usageBaseURL ?? context.baseURL ?? ''}`;
            let answer = this.detected.get(key);
            if (answer === undefined) {
                answer = detectSub2apiPanel(context);
                this.detected.set(key, answer);
            }
            return await answer ? adapterFor('sub2api-auth') : undefined;
        }
        /** The manual allowance fallback for one provider, when the user entered one. */
        manualOf(id) {
            const estimate = manualBalanceEstimate(this.manual.get(id), this.totalTokensOf(id));
            return estimate === null ? {} : { manual: estimate };
        }
        /** Tokens observed this process for one provider route. */
        totalTokensOf(id) {
            const bucket = this.usage.get(id);
            if (bucket === undefined)
                return 0;
            return bucket.inputTokens + bucket.outputTokens + bucket.cacheReadTokens + bucket.cacheWriteTokens;
        }
        /** Count one streaming call per provider, forwarding chunks unchanged. */
        tapStream(options, next) {
            const id = options.provider || 'unknown';
            const bucket = this.bucketFor(id, this.names.get(id) ?? id);
            const recordUsage = (chunk) => {
                if (chunk.type === 'usage')
                    this.addUsage(bucket, chunk.usage);
            };
            return (async function* () {
                let counted = false;
                try {
                    for await (const chunk of next()) {
                        if (!counted) {
                            counted = true;
                            bucket.calls += 1;
                            bucket.lastCallAt = Date.now();
                            bucket.lastModel = options.model;
                        }
                        recordUsage(chunk);
                        yield chunk;
                    }
                }
                catch (error) {
                    bucket.errorCount += 1;
                    throw error;
                }
            })();
        }
        /** Accumulate one usage report into a bucket. */
        addUsage(bucket, usage) {
            bucket.inputTokens += usage.inputTokens || 0;
            bucket.outputTokens += usage.outputTokens || 0;
            bucket.cacheReadTokens += usage.cacheReadTokens ?? 0;
            bucket.cacheWriteTokens += usage.cacheWriteTokens ?? 0;
            bucket.reasoningTokens += usage.reasoningTokens ?? 0;
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
        async reloadPrices(failLoud) {
            let next;
            try {
                next = await loadPriceTable(this.config, path => readFile(path, 'utf8'));
            }
            catch (error) {
                if (failLoud)
                    throw error;
                this.ctx.logger.warn(`quota monitor: keeping the previous price table: ${String(error)}`);
                return;
            }
            const before = this.prices === undefined ? '' : JSON.stringify(this.prices);
            const after = next === undefined ? '' : JSON.stringify(next);
            this.prices = next;
            if (before === after)
                return;
            this.usageStore.setPrices(next);
        }
        /** Re-read the provider registry and configurable-provider directory. */
        refresh() {
            const llm = this.ctx.llm;
            for (const provider of llm.listProviders())
                this.noteProvider(provider);
            for (const entry of llm.listConfigurableProviders()) {
                this.profiles.set(entry.provider, entry);
            }
        }
        noteProvider(provider) {
            if (provider.id === '')
                return;
            this.names.set(provider.id, provider.name || provider.id);
            this.bucketFor(provider.id, provider.name || provider.id);
        }
        bucketFor(id, name) {
            let bucket = this.usage.get(id);
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
                };
                this.usage.set(id, bucket);
            }
            else if (name !== '') {
                bucket.name = name;
            }
            return bucket;
        }
        /** Resolve the settings section backing one configurable provider. */
        profileOf(id) {
            const entry = this.profiles.get(id);
            if (entry === undefined)
                return EMPTY_PROFILE;
            const section = this.settingsSection(entry.settingsNs, entry.settingsPath);
            if (typeof section !== 'object' || section === null)
                return EMPTY_PROFILE;
            const record = section;
            return { baseURL: record['baseURL'], apiKeyEnv: record['apiKeyEnv'] };
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
        settingsSection(ns, path) {
            const settings = this.ctx.settings;
            let section;
            try {
                if (typeof settings.get === 'function') {
                    // The provider directory carries a plain string; the settings service
                    // brands and validates it at the boundary, so naming the brand here is
                    // the whole conversion.
                    section = settings.get(brandString(ns));
                }
                else if (typeof settings.describe === 'function') {
                    section = settings.describe().find(row => row.ns === ns)?.value;
                }
                else {
                    return undefined;
                }
            }
            catch {
                return undefined;
            }
            for (const key of path) {
                if (typeof section !== 'object' || section === null)
                    return undefined;
                section = section[key];
            }
            return section;
        }
        /** Current credential value for one reference name, or undefined. */
        async resolveApiKey(reference) {
            if (typeof reference !== 'string' || !credentialRefPattern.test(reference))
                return undefined;
            try {
                // The grammar check above is the seam's own `isCredentialRefName`, so the
                // brand below is the whole conversion — same reason `profileOf` brands its
                // settings namespace rather than importing the seam's helper. Both brands
                // come from `dsh-brand`, whose runtime surface stays valid across
                // duplicate installs; the seam's marker functions do not.
                const resolved = await this.ctx.credentials.resolve(brandString(reference));
                return resolved?.value;
            }
            catch {
                return undefined;
            }
        }
        /** The provider selector entries, one per known route. */
        providerEntries() {
            const entries = [];
            for (const [id, bucket] of this.usage) {
                const monitor = resolveMonitor(this.config, id);
                const profile = this.profileOf(id);
                const baseURL = trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id];
                const identity = resolveProviderIdentity(id, baseURL, monitor?.adapter);
                const adapter = monitor?.declarative !== undefined ? 'declarative' : identity.adapter;
                const account = this.accounts.get(id);
                entries.push({
                    id,
                    name: bucket.name,
                    // A read that declared its own mode wins: the same gateway serves a
                    // wallet or a subscription, and the card frame follows the answer.
                    mode: account?.mode ?? (adapter === null ? 'unsupported' : ADAPTER_MODES[adapter]),
                    adapter: account?.adapter ?? adapter ?? 'none',
                    status: account?.status ?? 'unsupported',
                    ...account?.warning === undefined ? {} : { warning: account.warning },
                });
            }
            return entries;
        }
        /** Assemble the snapshot from the current accounting maps. */
        snapshot() {
            const rows = [];
            const aggregate = { calls: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
            for (const [id, bucket] of this.usage) {
                const totalTokens = bucket.inputTokens + bucket.outputTokens
                    + bucket.cacheReadTokens + bucket.cacheWriteTokens;
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
                });
                aggregate.calls += bucket.calls;
                aggregate.inputTokens += bucket.inputTokens;
                aggregate.outputTokens += bucket.outputTokens;
                aggregate.totalTokens += bucket.inputTokens + bucket.outputTokens;
            }
            return {
                capturedAt: Date.now(),
                providers: this.providerEntries(),
                rows,
                balances: this.balancesView(),
                aggregate,
            };
        }
        /** The manual balance table as a plain object. */
        balancesView() {
            return Object.fromEntries(this.manual);
        }
    };
})();
export { QuotaMonitorService };
/**
 * Rough spend estimate behind a manually entered allowance.
 * @param total - the manual allowance, or undefined when none was entered.
 * @param totalTokens - tokens observed this process.
 * @returns the estimate, or null without a manual figure.
 */
function manualBalanceEstimate(total, totalTokens) {
    if (total === undefined)
        return null;
    const spent = totalTokens / 1_000_000;
    return {
        total,
        spent,
        remaining: Math.max(0, total - spent),
        pct: total > 0 ? (spent / total) * 100 : 0,
    };
}
/** Trim trailing slashes off a stored base URL. */
function trimBaseURL(raw) {
    if (typeof raw !== 'string')
        return undefined;
    const trimmed = raw.trim().replace(/\/+$/, '');
    return trimmed === '' ? undefined : trimmed;
}
export default QuotaMonitorService;
//# sourceMappingURL=index.js.map