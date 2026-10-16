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
import { randomUUID } from 'node:crypto';
import { keyDomainSpec } from "./key-domain.js";
import { chooseWithJev } from "./routing.js";
import { brandString } from '@deepseek-ai/dsh-brand';
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { adapterFor, credentialRefsFor, declarativeAdapter } from "./adapters/index.js";
import { detectSub2apiPanel } from "./adapters/sub2api.js";
import { Config, CREDENTIAL_REF_PATTERN, assertConsistent, resolveMonitor } from "./config.js";
import { buildExport } from "./export.js";
import { QuotaRequestError } from "./http.js";
import { ADAPTER_MODES, resolveProviderIdentity } from "./identity.js";
import { loadPriceTable } from "./price-import.js";
import { QuotaUsageStore } from "./usage-store.js";
export { Config } from "./config.js";
/** Delay before the first background round, so boot is not spent on network calls. */
const INITIAL_DELAY_MS = 2_000;
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
 * How much room one reading leaves, as a comparable share.
 *
 * A plan window states its own share, a balance with a disclosed total divides
 * out, and a bare balance is compared against the largest bare balance on the
 * route: `scale` carries that maximum, because two wallets are only comparable
 * by their own figures. Readings that state no figure at all score nothing and
 * are left out of the choice.
 * @param account - one credential's latest reading.
 * @param scale - largest bare balance among the readings being compared.
 * @returns the share in 0..1, or undefined when the reading states no figure.
 */
function headroomOf(account, scale) {
    if (account.unlimited === true)
        return 1;
    if (account.remaining !== undefined && account.remaining <= 0)
        return 0;
    const windows = account.planWindows;
    if (windows !== undefined && windows.length > 0) {
        const worst = Math.max(...windows.map(window => window.percentUsed));
        return Math.max(0, Math.min(1, 1 - worst / 100));
    }
    const remaining = account.remaining;
    if (remaining === undefined)
        return undefined;
    const used = account.used;
    if (used !== undefined && used + remaining > 0)
        return remaining / (used + remaining);
    if (scale <= 0)
        return remaining > 0 ? 1 : 0;
    return Math.min(1, remaining / scale);
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
function accountKey(slot) {
    return slot.credentialRef === undefined ? slot.id : `${slot.id}\u0000${slot.credentialRef}`;
}
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
    let _readPendingAccounts_decorators;
    let _refreshAccounts_decorators;
    let _getUsage_decorators;
    let _exportUsage_decorators;
    let _setBalances_decorators;
    let _resetStats_decorators;
    let _manageKey_decorators;
    return class QuotaMonitorService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _getSnapshot_decorators = [Remote('getSnapshot')];
            _getAccount_decorators = [Remote('getAccount')];
            _readPendingAccounts_decorators = [Remote('readPendingAccounts')];
            _refreshAccounts_decorators = [Remote('refreshAccounts')];
            _getUsage_decorators = [Remote('getUsage')];
            _exportUsage_decorators = [Remote('exportUsage')];
            _setBalances_decorators = [Remote('setBalances')];
            _resetStats_decorators = [Remote('resetStats')];
            _manageKey_decorators = [Remote('manageKey')];
            __esDecorate(this, null, _getSnapshot_decorators, { kind: "method", name: "getSnapshot", static: false, private: false, access: { has: obj => "getSnapshot" in obj, get: obj => obj.getSnapshot }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getAccount_decorators, { kind: "method", name: "getAccount", static: false, private: false, access: { has: obj => "getAccount" in obj, get: obj => obj.getAccount }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _readPendingAccounts_decorators, { kind: "method", name: "readPendingAccounts", static: false, private: false, access: { has: obj => "readPendingAccounts" in obj, get: obj => obj.readPendingAccounts }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _refreshAccounts_decorators, { kind: "method", name: "refreshAccounts", static: false, private: false, access: { has: obj => "refreshAccounts" in obj, get: obj => obj.refreshAccounts }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _getUsage_decorators, { kind: "method", name: "getUsage", static: false, private: false, access: { has: obj => "getUsage" in obj, get: obj => obj.getUsage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _exportUsage_decorators, { kind: "method", name: "exportUsage", static: false, private: false, access: { has: obj => "exportUsage" in obj, get: obj => obj.exportUsage }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setBalances_decorators, { kind: "method", name: "setBalances", static: false, private: false, access: { has: obj => "setBalances" in obj, get: obj => obj.setBalances }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _resetStats_decorators, { kind: "method", name: "resetStats", static: false, private: false, access: { has: obj => "resetStats" in obj, get: obj => obj.resetStats }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _manageKey_decorators, { kind: "method", name: "manageKey", static: false, private: false, access: { has: obj => "manageKey" in obj, get: obj => obj.manageKey }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        config = __runInitializers(this, _instanceExtraInitializers);
        static inject = ['llm', 'settings', 'credentials', 'sessionQuery', 'storageDomain'];
        static Config = Config;
        usage = new Map();
        names = new Map();
        profiles = new Map();
        /**
         * Readings keyed by route and monitored credential ({@link accountKey}), so a
         * route watched through several keys keeps one reading per key.
         */
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
        /**
         * The credential the panel is showing, refreshed at the active interval.
         * Absent until the panel asks for a reading.
         */
        focused;
        /**
         * Credential routing state per route, one entry for each monitor naming an
         * `activeRef`. Absent for every other route, which the monitor only reads.
         */
        routers = new Map();
        managed = new Map();
        keyTable;
        cooldowns = new Map();
        decisions = new Map();
        locks = new Map();
        /** Serialize credential changes with requests that consume that credential. */
        async lockRoute(id) {
            const previous = this.locks.get(id) ?? Promise.resolve();
            let release = () => { };
            const current = new Promise(resolve => { release = resolve; });
            this.locks.set(id, current);
            await previous;
            return () => { release(); if (this.locks.get(id) === current)
                this.locks.delete(id); };
        }
        /**
         * @param ctx - Host context carrying the llm, settings, credentials, session
         * query, and storage seams.
         * @param config - validated plugin config.
         */
        constructor(ctx, config) {
            super(ctx, 'quotaMonitor');
            this.config = config;
            assertConsistent(config);
            for (const [id, entry] of Object.entries(config.monitors)) {
                if (entry.activeRef === undefined)
                    continue;
                this.routers.set(id, {
                    activeRef: entry.activeRef,
                    value: undefined,
                    credentialRef: undefined,
                    wired: undefined,
                    refused: false,
                });
            }
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
            const keys = await this.ctx.storageDomain.open(keyDomainSpec);
            this.keyTable = keys.table('providers');
            for (const [id, state] of this.keyTable.entries()) {
                this.managed.set(id, state);
                if (state.activeRef !== undefined)
                    this.routers.set(id, {
                        activeRef: state.activeRef, value: undefined, credentialRef: undefined, wired: undefined, refused: false,
                    });
            }
            this.ctx.effect(() => () => { void keys.close(); }, 'quota-monitor.keys');
            await this.identifyRoutedCredentials();
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
         * @param request - the provider route, the credential reference to read, and
         * whether to bypass the cached reading. An absent reference reads the route's
         * first monitored credential.
         * @returns the account, including a non-`ok` status when it cannot be read.
         */
        async getAccount(request) {
            const slot = this.slotFor(request);
            this.focused = slot;
            const cached = this.accounts.get(accountKey(slot));
            if (cached !== undefined && request.refresh !== true && !this.retryDue(cached))
                return cached;
            return this.readAccount(slot);
        }
        /** Bound retries of temporary upstream failures to the active refresh interval. */
        retryDue(account) {
            return this.transientFailure(account.status) && Date.now() - account.fetchedAt >= this.config.refresh.activeMs;
        }
        transientFailure(status) {
            return status === 'unavailable' || status === 'rate-limited' || status === 'invalid-response';
        }
        /**
         * Read missing credentials and retry expired temporary failures, then answer
         * with the resulting snapshot. Successful cached readings are reused.
         * @returns the snapshot carrying the readings.
         */
        async readPendingAccounts() {
            await this.readRouteAccounts(slot => {
                const cached = this.accounts.get(accountKey(slot));
                return cached === undefined || this.retryDue(cached);
            });
            return this.snapshot();
        }
        /**
         * Re-read every monitored credential of every known route.
         * @returns the snapshot carrying the new readings.
         */
        async refreshAccounts() {
            await this.readRouteAccounts();
            return this.snapshot();
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
        /** Write-only key management. Removing a slot detaches it without deleting the credential. */
        async manageKey(request) {
            this.refresh();
            if (!this.names.has(request.provider))
                throw new Error('Unknown provider');
            const unlock = await this.lockRoute(request.provider);
            try {
                const id = request.provider;
                const previous = this.managed.get(id);
                const state = previous === undefined ? {
                    refs: this.slotsOf(id).flatMap(slot => slot.credentialRef === undefined ? [] : [slot.credentialRef]),
                    labels: {}, mode: this.routers.has(id) ? 'quota' : 'manual',
                    ...this.routers.get(id) === undefined ? {} : { activeRef: this.routers.get(id).activeRef },
                } : { ...previous, refs: [...previous.refs], labels: { ...previous.labels } };
                const ref = request.credentialRef;
                const name = request.name?.trim().slice(0, 120);
                if (request.action === 'add') {
                    const source = ref ?? `QUOTA_KEY_${randomUUID().replaceAll('-', '_')}`;
                    if (!CREDENTIAL_REF_PATTERN.test(source))
                        throw new Error('Invalid credential reference');
                    if (source === state.activeRef || state.refs.includes(source))
                        throw new Error('Credential already monitored or reserved for routing');
                    if (request.key !== undefined) {
                        if (!request.key.trim())
                            throw new Error('Key must not be empty');
                        // Existing references are never overwritten by the add operation.
                        if (await this.resolveApiKey(source) !== undefined)
                            throw new Error('Credential reference already exists');
                        await this.ctx.credentials.set(brandString(source), request.key.trim());
                    }
                    else if (await this.resolveApiKey(source) === undefined)
                        throw new Error('Credential is not configured');
                    state.refs.push(source);
                    if (name)
                        state.labels[source] = name;
                }
                else if (request.action === 'routing') {
                    if (!['manual', 'quota', 'jev'].includes(request.mode ?? ''))
                        throw new Error('Invalid routing mode');
                    state.mode = request.mode;
                    if (state.mode === 'manual') {
                        const selectedRef = this.routers.get(id)?.credentialRef ?? state.selectedRef ?? state.refs[0];
                        if (selectedRef !== undefined)
                            state.selectedRef = selectedRef;
                    }
                    if (request.jevKey?.trim()) {
                        const jevRef = state.jevRef ?? `QUOTA_JEV_${randomUUID().replaceAll('-', '_')}`;
                        await this.ctx.credentials.set(brandString(jevRef), request.jevKey.trim());
                        state.jevRef = jevRef;
                    }
                    if (state.mode === 'jev' && (state.jevRef === undefined || await this.resolveApiKey(state.jevRef) === undefined)) {
                        throw new Error('Configure a Jev OpenRouter key first');
                    }
                }
                else {
                    if (ref === undefined || !state.refs.includes(ref))
                        throw new Error('Key is not monitored by this provider');
                    if (request.action === 'rename') {
                        if (name)
                            state.labels[ref] = name;
                        else
                            delete state.labels[ref];
                    }
                    else if (request.action === 'remove') {
                        if (state.refs.length < 2)
                            throw new Error('Keep at least one key');
                        if (this.routers.get(id)?.credentialRef === ref || this.profileOf(id).apiKeyEnv === ref)
                            throw new Error('Switch away from the active key first');
                        state.refs = state.refs.filter(item => item !== ref);
                        delete state.labels[ref];
                        this.accounts.delete(accountKey({ id, credentialRef: ref }));
                    }
                    else if (request.action === 'activate') {
                        if (await this.resolveApiKey(ref) === undefined)
                            throw new Error('Credential is not configured');
                        state.mode = 'manual';
                        state.selectedRef = ref;
                    }
                    else
                        throw new Error('Invalid key action');
                }
                await this.saveKeys(id, state);
                if (request.action === 'activate' || request.action === 'routing' && state.mode !== 'manual') {
                    await this.wireRouter(id, state);
                    await this.routeCredential(id);
                }
                return this.snapshot();
            }
            finally {
                unlock();
            }
        }
        async saveKeys(id, state) {
            if (this.keyTable === undefined)
                throw new Error('Key storage is not ready');
            await this.keyTable.put(id, state);
            this.managed.set(id, state);
        }
        /** Preserve the original key and wire a dedicated credential into the provider profile. */
        async wireRouter(id, state) {
            const descriptor = this.profiles.get(id);
            if (descriptor === undefined)
                throw new Error('This provider does not expose editable credential settings');
            const original = this.profileOf(id).apiKeyEnv;
            if (typeof original !== 'string' || !CREDENTIAL_REF_PATTERN.test(original))
                throw new Error('Provider must use a named API credential');
            const activeRef = state.activeRef ?? `QUOTA_ACTIVE_${randomUUID().replaceAll('-', '_')}`;
            if (state.refs.includes(activeRef))
                throw new Error('Routing credential must differ from monitored keys');
            if (original !== activeRef) {
                const value = await this.resolveApiKey(original);
                if (value === undefined)
                    throw new Error('Provider credential is unavailable');
                await this.ctx.credentials.set(brandString(activeRef), value);
                state.activeRef = activeRef;
                await this.saveKeys(id, state);
                const section = this.ctx.settings.describe().find(row => row.ns === descriptor.settingsNs);
                if (section === undefined)
                    throw new Error('Provider settings are unavailable');
                await this.ctx.settings.mutate(descriptor.settingsNs, [{ op: 'set', path: [...descriptor.settingsPath, 'apiKeyEnv'], value: activeRef }], section.revision);
            }
            this.routers.set(id, { activeRef, value: undefined, credentialRef: undefined, wired: undefined, refused: false });
        }
        /** Refold usage, then re-read every monitored credential. */
        async runBackgroundRound() {
            await this.reloadPrices(false);
            await this.usageStore.refresh();
            await this.readRouteAccounts();
        }
        /** Re-read only the credential the panel is showing. */
        async refreshFocusedAccount() {
            if (this.focused === undefined)
                return;
            await this.readAccount(this.focused);
        }
        /**
         * Read monitored credentials route by route.
         *
         * Routes proceed together while one route's credentials are read in order, so
         * a gateway monitoring several keys is not asked all of them at once.
         * @param pending - which slots to read; absent reads every monitored slot.
         */
        async readRouteAccounts(pending) {
            this.refresh();
            await Promise.all([...this.names.keys()].map(async (id) => {
                for (const slot of this.slotsOf(id)) {
                    if (pending !== undefined && !pending(slot))
                        continue;
                    await this.readAccount(slot);
                }
            }));
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
        slotsOf(id) {
            const configured = this.managed.get(id)?.refs ?? resolveMonitor(this.config, id)?.credentialRefs;
            if (configured !== undefined && configured.length > 0) {
                return configured.map(credentialRef => ({ id, credentialRef }));
            }
            const credentialRef = this.credentialRefOf(id);
            return [credentialRef === undefined ? { id } : { id, credentialRef }];
        }
        /** The credential reference one route's own account read uses, when one is named. */
        credentialRefOf(id) {
            const configured = resolveMonitor(this.config, id)?.credentialRef;
            if (configured !== undefined)
                return configured;
            const fromProfile = this.profileOf(id).apiKeyEnv;
            return typeof fromProfile === 'string' && CREDENTIAL_REF_PATTERN.test(fromProfile) ? fromProfile : undefined;
        }
        /**
         * Point one route's credential at the healthiest monitored key.
         *
         * Runs before the request that authenticates with it, and only when this
         * route routes at all: the value the process last saw is compared first, so a
         * steady route costs one credential resolution per request and no write.
         *
         * A route whose profile does not authenticate with the routing reference is
         * reported once and then left untouched — the choice would have no effect on
         * the request, and rotating a credential nothing reads is worse than saying
         * so. What is written is the value of one of the monitored keys, read from
         * the same seam the route would have read it from.
         * @param id - provider route key about to serve a request.
         */
        async routeCredential(id) {
            const router = this.routers.get(id);
            if (router === undefined || router.refused)
                return;
            if (router.wired === undefined) {
                // The profile is read from user settings, which the registry mirrors only
                // after a refresh; a route reached before that would otherwise look
                // unwired and lose routing for the process's life.
                this.refresh();
                const named = this.profileOf(id).apiKeyEnv;
                router.wired = named === router.activeRef;
                if (!router.wired) {
                    router.refused = true;
                    this.ctx.logger.error(`quota monitor: monitors.${id}.activeRef names ${router.activeRef}, but route ${id} authenticates with `
                        + `${typeof named === 'string' ? named : 'no named credential'}; leaving its credential untouched`);
                    return;
                }
            }
            const state = this.managed.get(id);
            if (state?.mode !== 'manual') {
                for (const slot of this.slotsOf(id)) {
                    const reading = this.accounts.get(accountKey(slot));
                    if ((state !== undefined || reading !== undefined)
                        && (reading === undefined || Date.now() - reading.fetchedAt > this.config.routing.maxAgeMs
                            || reading.planWindows?.some(window => window.resetAt !== undefined && Date.parse(window.resetAt) <= Date.now()))) {
                        await this.readAccount(slot);
                    }
                }
            }
            let chosen = state?.mode === 'manual'
                ? this.slotsOf(id).find(slot => slot.credentialRef === state.selectedRef)
                : this.healthiestSlot(id);
            this.decisions.set(id, state?.mode === 'manual' ? 'manual' : 'quota');
            if (state?.mode === 'jev') {
                const candidates = this.routeCandidates(id);
                const key = state.jevRef === undefined ? undefined : await this.resolveApiKey(state.jevRef);
                const ref = key === undefined ? undefined : await chooseWithJev(candidates, key, this.config.routing);
                if (ref !== undefined)
                    chosen = { id, credentialRef: ref };
                this.decisions.set(id, ref === undefined ? 'jev-fallback' : 'jev');
            }
            if (chosen?.credentialRef === undefined) {
                if (state !== undefined && state.mode !== 'manual')
                    throw new Error(`quota monitor: no healthy key available for ${id}`);
                return;
            }
            // A request whose credential value already is the chosen key's is not
            // rewritten: the write is durable and the read is what the route does next.
            const value = await this.resolveApiKey(chosen.credentialRef);
            if (value === undefined)
                return;
            const current = router.value ?? await this.resolveApiKey(router.activeRef);
            router.value = current;
            if (current === value) {
                router.credentialRef = chosen.credentialRef;
                return;
            }
            try {
                await this.ctx.credentials.set(brandString(router.activeRef), value);
            }
            catch (error) {
                router.refused = true;
                this.ctx.logger.error(`quota monitor: cannot route ${id} through ${router.activeRef}: ${String(error)}`);
                return;
            }
            router.value = value;
            router.credentialRef = chosen.credentialRef;
            this.ctx.logger.info(`quota monitor: ${id} now authenticates with ${chosen.credentialRef}`);
        }
        /**
         * The monitored credential of one route with the most room left.
         *
         * Readings that state no figure are not candidates, so a route with no
         * reading yet — and every key that could not be read — leaves the route
         * exactly as the deployment configured it rather than guessing.
         * @param id - provider route key.
         * @returns the chosen credential's slot, or undefined when none states a figure.
         */
        routeCandidates(id) {
            const readings = this.slotsOf(id).flatMap(slot => {
                const account = this.accounts.get(accountKey(slot));
                if (slot.credentialRef === undefined || account?.status !== 'ok'
                    || Date.now() - account.fetchedAt > this.config.routing.maxAgeMs
                    || (this.cooldowns.get(accountKey(slot)) ?? 0) > Date.now())
                    return [];
                return [{ ref: slot.credentialRef, account }];
            });
            const scale = Math.max(0, ...readings.map(item => item.account.remaining ?? 0));
            return readings.flatMap(({ ref, account }) => {
                const headroom = headroomOf(account, scale);
                if (headroom === undefined || headroom <= 0 || !Number.isFinite(headroom))
                    return [];
                const resetAt = account.planWindows?.map(window => window.resetAt).filter((value) => value !== undefined).sort()[0];
                return [{ ref, headroom, ...resetAt === undefined ? {} : { resetAt } }];
            }).sort((a, b) => b.headroom - a.headroom);
        }
        healthiestSlot(id) {
            const ref = this.routeCandidates(id)[0]?.ref;
            return ref === undefined ? undefined : { id, credentialRef: ref };
        }
        /**
         * Recognize which monitored credential a routing route already authenticates
         * with, so the panel can name it before the process has routed anything.
         *
         * A route set up before this process started holds one of the monitored keys
         * already; matching the values is the only way to name it, because the stored
         * value is opaque and the reference it came from was forgotten by then.
         */
        async identifyRoutedCredentials() {
            for (const [id, router] of this.routers) {
                const value = await this.resolveApiKey(router.activeRef);
                router.value = value;
                router.credentialRef = await this.matchingCredential(id, value);
            }
        }
        /**
         * The monitored credential of one route whose stored value is one value.
         * @param id - provider route key.
         * @param value - credential value to match, or undefined to match nothing.
         * @returns the credential reference, or undefined when none matches.
         */
        async matchingCredential(id, value) {
            if (value === undefined)
                return undefined;
            for (const slot of this.slotsOf(id)) {
                if (slot.credentialRef === undefined)
                    continue;
                if (await this.resolveApiKey(slot.credentialRef) === value)
                    return slot.credentialRef;
            }
            return undefined;
        }
        /**
         * The monitored credential one account request names.
         * @param request - provider route and optional credential reference.
         * @returns the slot, defaulting to the route's first monitored credential.
         */
        slotFor(request) {
            this.refresh();
            if (!this.names.has(request.provider))
                throw new Error('Provider is not currently registered');
            const slots = this.slotsOf(request.provider);
            const slot = request.credentialRef === undefined ? slots[0] : slots.find(item => item.credentialRef === request.credentialRef);
            if (slot === undefined)
                throw new Error('Key is not monitored by this provider');
            return slot;
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
        async readAccount(slot) {
            this.refresh();
            const { id, credentialRef } = slot;
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
                ...credentialRef === undefined ? {} : { credentialRef },
                fetchedAt,
            };
            const apiKey = await this.resolveApiKey(profile.apiKeyEnv);
            const context = {
                id,
                now: () => Date.now(),
                credential: reference => this.resolveApiKey(reference),
                usageDays: this.config.usage.days,
                ...baseURL === undefined ? {} : { baseURL },
                ...apiKey === undefined ? {} : { apiKey },
                ...entry?.usageBaseURL === undefined ? {} : { usageBaseURL: entry.usageBaseURL },
                ...credentialRef === undefined ? {} : { credentialRef },
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
                const previous = this.accounts.get(accountKey(slot));
                const history = this.transientFailure(status) && previous?.adapter === adapter.id && previous.keyUsage !== undefined
                    ? { keyUsage: previous.keyUsage, keyUsageFetchedAt: previous.keyUsageFetchedAt ?? previous.fetchedAt, ...previous.accountName === undefined ? {} : { accountName: previous.accountName } }
                    : {};
                return this.publish({
                    ...base,
                    ...history,
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
                ...reading.accountName === undefined ? {} : { accountName: reading.accountName },
                ...reading.remaining === undefined ? {} : { remaining: reading.remaining },
                ...reading.used === undefined ? {} : { used: reading.used },
                ...reading.limit === undefined ? {} : { limit: reading.limit },
                ...reading.currency === undefined ? {} : { currency: reading.currency },
                ...reading.unlimited === undefined ? {} : { unlimited: reading.unlimited },
                ...reading.plan === undefined ? {} : { plan: reading.plan },
                ...reading.planWindows === undefined ? {} : { planWindows: reading.planWindows },
                ...reading.budgetPools === undefined ? {} : { budgetPools: reading.budgetPools },
                ...reading.usage === undefined ? {} : { usage: reading.usage },
                ...reading.keyUsage === undefined ? {} : { keyUsage: reading.keyUsage },
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
        /** Cache one account reading under its route and credential and return it. */
        publish(account) {
            this.accounts.set(accountKey(account), account);
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
        /**
         * Count one streaming call per provider, forwarding chunks unchanged.
         *
         * A route that routes its credentials is pointed at the healthiest key first:
         * the adapter resolves the credential when it starts the request, which is
         * after this generator's first step and before its first chunk.
         */
        tapStream(options, next) {
            const id = options.provider || 'unknown';
            const bucket = this.bucketFor(id, this.names.get(id) ?? id);
            const service = this;
            return (async function* () {
                const unlock = service.routers.has(id) ? await service.lockRoute(id) : () => { };
                let servingRef;
                try {
                    if (options.signal?.aborted)
                        throw options.signal.reason;
                    if (service.routers.has(id))
                        await service.routeCredential(id);
                    servingRef = service.routers.get(id)?.credentialRef;
                    let counted = false;
                    for await (const chunk of next()) {
                        if (!counted) {
                            counted = true;
                            bucket.calls += 1;
                            bucket.lastCallAt = Date.now();
                            bucket.lastModel = options.model;
                        }
                        if (chunk.type === 'usage')
                            service.addUsage(bucket, chunk.usage);
                        yield chunk;
                    }
                }
                catch (error) {
                    bucket.errorCount += 1;
                    if (servingRef !== undefined && !options.signal?.aborted) {
                        service.cooldowns.set(accountKey({ id, credentialRef: servingRef }), Date.now() + service.config.routing.cooldownMs);
                    }
                    throw error;
                }
                finally {
                    unlock();
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
        /** Reconcile live routes and profiles; historical usage is deliberately retained. */
        refresh() {
            const llm = this.ctx.llm;
            this.names.clear();
            this.profiles.clear();
            for (const provider of llm.listProviders())
                this.noteProvider(provider);
            for (const entry of llm.listConfigurableProviders()) {
                this.profiles.set(entry.provider, entry);
            }
            if (this.focused !== undefined && !this.names.has(this.focused.id))
                this.focused = undefined;
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
            if (typeof reference !== 'string' || !CREDENTIAL_REF_PATTERN.test(reference))
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
            for (const [id, name] of this.names) {
                const monitor = resolveMonitor(this.config, id);
                const profile = this.profileOf(id);
                const baseURL = trimBaseURL(profile.baseURL) ?? DEFAULT_BASE_URLS[id];
                const identity = resolveProviderIdentity(id, baseURL, monitor?.adapter);
                const adapter = monitor?.declarative !== undefined ? 'declarative' : identity.adapter;
                const slots = this.slotsOf(id);
                const router = this.routers.get(id);
                // The route-level fields describe its first monitored credential, which
                // is the one a single-credential route has always reported.
                const account = slots[0] === undefined ? undefined : this.accounts.get(accountKey(slots[0]));
                const accounts = [];
                for (const slot of slots) {
                    const reading = this.accounts.get(accountKey(slot));
                    if (reading !== undefined)
                        accounts.push(reading);
                }
                entries.push({
                    id,
                    name,
                    // A read that declared its own mode wins: the same gateway serves a
                    // wallet or a subscription, and the card frame follows the answer.
                    mode: account?.mode ?? (adapter === null ? 'unsupported' : ADAPTER_MODES[adapter]),
                    adapter: account?.adapter ?? adapter ?? 'none',
                    status: account?.status ?? 'unsupported',
                    ...account?.warning === undefined ? {} : { warning: account.warning },
                    credentialRefs: slots.flatMap(slot => slot.credentialRef === undefined ? [] : [slot.credentialRef]),
                    ...(router?.credentialRef !== undefined ? { activeCredentialRef: router.credentialRef }
                        : router === undefined && typeof profile.apiKeyEnv === 'string' && slots.some(slot => slot.credentialRef === profile.apiKeyEnv)
                            ? { activeCredentialRef: profile.apiKeyEnv } : {}),
                    keyNames: this.managed.get(id)?.labels ?? {},
                    routing: {
                        mode: this.managed.get(id)?.mode ?? (router === undefined ? 'manual' : 'quota'),
                        wired: router !== undefined && profile.apiKeyEnv === router.activeRef && !router.refused,
                        ...router === undefined ? {} : { activeRef: router.activeRef },
                        jevConfigured: this.managed.get(id)?.jevRef !== undefined,
                        ...this.decisions.get(id) === undefined ? {} : { lastDecision: this.decisions.get(id) },
                    },
                    accounts,
                });
            }
            return entries;
        }
        /** Assemble the snapshot from the current accounting maps. */
        snapshot() {
            this.refresh();
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