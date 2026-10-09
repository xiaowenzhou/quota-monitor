/**
 * The usage store: folds every readable session log into the report the panel
 * reads, and keeps the per-session fold cached durably.
 *
 * One fold round at a time. A session is re-read only when its log grew, so a
 * steady-state round costs one listing plus the sessions that actually
 * changed. Failures are per session: an unreadable log leaves its cached
 * record intact and the round continues, because one damaged session must not
 * blank the whole report.
 * @module @deepseek-ai/dsh-extension-quota-monitor/usage-store
 */
import { buildUsageReport, emptyUsageReport, foldSessionEvents } from "./usage-fold.js";
import { stateOf, usageDomainSpec } from "./usage-domain.js";
/** How many sessions are read concurrently during one fold round. */
const READ_CONCURRENCY = 4;
/**
 * Folds session logs into the usage report and caches each session's fold.
 *
 * The store owns no timer: the service decides when a round runs.
 */
export class QuotaUsageStore {
    ctx;
    now;
    derive;
    folds = new Map();
    table;
    report;
    folding = false;
    foldedAt = 0;
    /** In-flight round, so concurrent requests share one pass. */
    round;
    /**
     * @param ctx - Host context carrying the sessionQuery and storageDomain seams.
     * @param now - clock reader, injected so tests drive day boundaries.
     * @param derive - prices and ceilings the report derives spend with.
     */
    constructor(ctx, now, derive = {}) {
        this.ctx = ctx;
        this.now = now;
        this.derive = derive;
        this.report = emptyUsageReport(now(), false);
    }
    /**
     * Build the report from the current folds.
     * @param foldedAt - epoch ms the fold last completed.
     * @param provider - report this route alone; absent reports every route.
     * @returns the assembled report.
     */
    build(foldedAt, provider) {
        return buildUsageReport(this.folds, {
            now: this.now(),
            foldedAt,
            folding: false,
            ...this.derive.prices === undefined ? {} : { prices: this.derive.prices },
            ...this.derive.budgets === undefined ? {} : { budgets: this.derive.budgets },
            ...provider === undefined ? {} : { provider },
        });
    }
    /**
     * Replace the price table the report derives spend with.
     *
     * Imported documents are re-read while the plugin runs, so the table is not
     * fixed at construction: the report is rebuilt here so the next read already
     * prices with the new rules.
     * @param table - the current table, or undefined when the deployment states no prices.
     */
    setPrices(table) {
        // Rebuilt rather than patched: `prices` is optional under
        // `exactOptionalPropertyTypes`, so a present-but-undefined key is not the
        // same value as an absent one.
        const { prices: _replaced, ...rest } = this.derive;
        this.derive = table === undefined ? rest : { ...rest, prices: table };
        this.report = this.build(this.foldedAt);
    }
    /**
     * Open the durable fold cache and seed the in-memory folds from it.
     *
     * Seeding makes the first report available without reading a single session
     * log, so a restart shows yesterday's figures immediately and refines them
     * when the first round lands.
     * @returns a disposer closing the domain.
     */
    async open() {
        const domain = await this.ctx.storageDomain.open(usageDomainSpec);
        this.table = domain.table('sessions');
        for (const [id, record] of this.table.entries())
            this.folds.set(id, stateOf(record));
        this.report = this.build(0);
        return () => {
            void domain.close();
        };
    }
    /**
     * The most recent report; never blocks on a fold.
     *
     * A filtered report is rebuilt from the in-memory folds on each read: it costs
     * one pass over route-day rows, and keeping every reader's selection cached
     * would outlive the selection that asked for it.
     * @param provider - report this route alone; absent reports every route.
     * @returns the report, with `folding` raised while a round runs.
     */
    current(provider) {
        if (provider !== undefined)
            return this.build(this.foldedAt, provider);
        return this.folding
            ? { ...this.report, folding: true }
            : this.report;
    }
    /**
     * Run one fold round, or join the one already running.
     * @param provider - report this route alone; absent reports every route.
     * @returns the report after the round completes.
     */
    async refresh(provider) {
        this.round ??= this.runRound().finally(() => {
            this.round = undefined;
        });
        await this.round;
        return this.current(provider);
    }
    /** Read every session, fold what changed, and rebuild the report. */
    async runRound() {
        this.folding = true;
        try {
            const records = await this.ctx.sessionQuery.listSessions();
            const ids = records.map(record => record.header.id);
            const live = new Set(ids);
            // A session deleted from the corpus must leave the report and the cache
            // together; otherwise its tokens would count forever.
            for (const id of [...this.folds.keys()]) {
                if (live.has(id))
                    continue;
                this.folds.delete(id);
                await this.forget(id);
            }
            for (let index = 0; index < ids.length; index += READ_CONCURRENCY) {
                await Promise.all(ids.slice(index, index + READ_CONCURRENCY).map(id => this.foldSession(id)));
            }
            this.foldedAt = this.now();
            this.report = this.build(this.foldedAt);
            return this.report;
        }
        finally {
            this.folding = false;
        }
    }
    /** Fold one session, leaving its cached state untouched when the read fails. */
    async foldSession(id) {
        let events;
        try {
            ({ events } = await this.ctx.sessionQuery.readSession(id));
        }
        catch (error) {
            // A session being written, or one whose log fails replay validation,
            // is skipped for this round rather than dropped from the report.
            this.ctx.logger.debug(`quota monitor: session "${id}" could not be read for usage folding: ${String(error)}`);
            return;
        }
        const previous = this.folds.get(id);
        if (previous !== undefined
            && events.length === previous.eventCount
            && previous.throughSeq >= 0)
            return;
        const next = foldSessionEvents(events, previous);
        this.folds.set(id, next);
        await this.store(id, next);
    }
    /** Persist one session's fold, tolerating a storage failure. */
    async store(id, state) {
        if (this.table === undefined)
            return;
        try {
            await this.table.put(id, state);
        }
        catch (error) {
            // The cache is an optimization: a failed write costs a refold next
            // round, never a wrong figure.
            this.ctx.logger.warn(`quota monitor: usage fold for "${id}" could not be persisted: ${String(error)}`);
        }
    }
    /** Drop one session's cached fold, tolerating a storage failure. */
    async forget(id) {
        if (this.table === undefined)
            return;
        try {
            await this.table.delete(id);
        }
        catch (error) {
            this.ctx.logger.warn(`quota monitor: usage fold for "${id}" could not be deleted: ${String(error)}`);
        }
    }
}
//# sourceMappingURL=usage-store.js.map