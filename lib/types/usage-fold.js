/**
 * Folding session logs into per-day, per-`provider · model` token totals.
 *
 * Pure functions over event arrays: no IO, no clock reads beyond the injected
 * `now`. The Host service owns reading sessions and persisting the result.
 *
 * Only provider-reported `usage` is folded. A step whose adapter reported no
 * usage contributes nothing rather than an estimate, so every figure the
 * panel shows traces back to a provider's own accounting.
 * @module @deepseek-ai/dsh-extension-quota-monitor/usage-fold
 */
import { lastAssistantStreamChunk } from '@deepseek-ai/dsh-llm';
import { priceFor, QuotaCostAccumulator } from "./pricing.js";
/**
 * A zeroed provider accumulator.
 * @param provider - the route key.
 * @param prices - the price table, or undefined to derive nothing.
 * @returns the accumulator, dated before every real day.
 */
function emptyProvider(provider, prices) {
    return {
        provider,
        all: emptyScope(prices),
        today: emptyScope(prices),
        month: emptyScope(prices),
        models: new Set(),
        lastDay: '',
    };
}
/**
 * A zeroed scope.
 * @param prices - the price table, or undefined to derive nothing.
 * @returns the scope.
 */
function emptyScope(prices) {
    return { calls: 0, totals: emptyTotals(), cost: new QuotaCostAccumulator(prices) };
}
/**
 * Add one route-day's counters into a scope.
 * @param scope - the scope to add into.
 * @param provider - provider route key.
 * @param model - model id.
 * @param date - the day the counters belong to, deciding the rate that applies.
 * @param counts - the folded counters.
 */
function addToScope(scope, provider, model, date, counts) {
    scope.calls += counts.calls;
    addCounts(scope.totals, counts);
    scope.cost.add(provider, model, date, counts.calls, counts);
}
/** Separator for the composite `provider · model` key; never appears in either id. */
const KEY_SEP = '\u0000';
/**
 * The local calendar day of an epoch instant, as `YYYY-MM-DD`.
 *
 * Local rather than UTC: a user reading "today" means their own day, and a
 * UTC fold would move eight hours of usage into the wrong bucket for a CN
 * workday.
 * @param epochMs - the instant.
 * @returns the local calendar day.
 */
export function localDay(epochMs) {
    const date = new Date(epochMs);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}
/** A zeroed counter row. */
function emptyCounts() {
    return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}
/** Read a non-negative safe integer, or 0. */
function countOf(value) {
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : 0;
}
/**
 * Replay provider-reported usage, excluding the last fork-inherited prefix.
 *
 * Request headers identify the billed route; context records supply a fallback
 * for logs with no header. The latest sample replaces a settlement for the same
 * turn and step until a retry boundary opens a separate attempt. Reasoning is
 * already part of output and is never added again.
 *
 * Full replay also detects same-length rewrites and corrections across refreshes.
 * @param events - the complete raw session log, ascending by seq.
 * @param previous - cached result; replay deliberately does not trust its cursor.
 * @returns the corrected per-day and per-route counters.
 */
export function foldSessionEvents(events, previous) {
    void previous;
    const days = new Map();
    let throughSeq = -1;
    let lastActiveAt = 0;
    let inheritedCut = -1;
    for (const event of events) {
        if (event.type === 'session/end-seed' && event.data.inherited === true)
            inheritedCut = event.seq;
    }
    let route;
    let hasHeader = false;
    let last;
    for (const event of events) {
        if (event.type === 'request/header') {
            route = { provider: event.data.header.config.provider, model: event.data.header.config.model };
            hasHeader = true;
        }
        else if (event.type === 'request/context' && !hasHeader) {
            route = { provider: event.data.provider, model: event.data.model };
        }
        if (event.seq <= inheritedCut)
            continue;
        // Retry is plugin-owned; inspect the event name without requiring that plugin.
        if (String(event.type) === 'llm/retry-started') {
            if (last !== undefined && 'turn' in event.data && 'step' in event.data
                && last.turn === event.data.turn && last.step === event.data.step)
                last = undefined;
            continue;
        }
        if (event.type !== 'assistant/message' && event.type !== 'assistant/attempt')
            continue;
        const usage = event.type === 'assistant/message' && event.data.usage !== undefined
            ? event.data.usage
            : lastAssistantStreamChunk(event.data.stream ?? [], 'usage')?.usage;
        if (usage === undefined)
            continue;
        const date = localDay(event.time);
        const key = `${route?.provider ?? 'unknown'}${KEY_SEP}${route?.model ?? 'unknown'}`;
        const next = {
            calls: 1,
            inputTokens: countOf(usage.inputTokens),
            outputTokens: countOf(usage.outputTokens),
            cacheReadTokens: countOf(usage.cacheReadTokens),
            cacheWriteTokens: countOf(usage.cacheWriteTokens),
        };
        const { turn, step } = event.data;
        if (last !== undefined && turn !== undefined && step !== undefined && last.turn === turn && last.step === step) {
            const oldDay = days.get(last.date);
            const old = oldDay?.get(last.key);
            if (old !== undefined) {
                old.calls -= 1;
                old.inputTokens -= last.counts.inputTokens;
                old.outputTokens -= last.counts.outputTokens;
                old.cacheReadTokens -= last.counts.cacheReadTokens;
                old.cacheWriteTokens -= last.counts.cacheWriteTokens;
                if (old.calls === 0)
                    oldDay?.delete(last.key);
                if (oldDay !== undefined && oldDay.size === 0)
                    days.delete(last.date);
            }
        }
        const byRoute = days.get(date) ?? new Map();
        days.set(date, byRoute);
        const counts = byRoute.get(key) ?? emptyCounts();
        byRoute.set(key, counts);
        counts.calls += 1;
        counts.inputTokens += next.inputTokens;
        counts.outputTokens += next.outputTokens;
        counts.cacheReadTokens += next.cacheReadTokens;
        counts.cacheWriteTokens += next.cacheWriteTokens;
        last = { turn, step, date, key, counts: next };
        throughSeq = event.seq;
        lastActiveAt = Math.max(lastActiveAt, event.time);
    }
    return {
        accountingVersion: 3,
        throughSeq,
        eventCount: events.length,
        days: Object.fromEntries(Array.from(days, ([date, byRoute]) => [date, Object.fromEntries(byRoute)])),
        ...lastActiveAt > 0 ? { lastActiveAt } : {},
    };
}
/** The wire figures one scope contributes to a provider row. */
function scopeFigures(scope) {
    const cost = scope.cost.view();
    const hitPercent = cacheHitPercent(scope.totals);
    return {
        calls: scope.calls,
        tokens: scope.totals.totalTokens,
        ...hitPercent === undefined ? {} : { cacheHitPercent: hitPercent },
        ...cost === undefined ? {} : { cost },
    };
}
/** A zeroed totals row. */
function emptyTotals() {
    return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0 };
}
/** Add one counter row into a totals row. */
function addCounts(totals, counts) {
    totals.inputTokens += counts.inputTokens;
    totals.outputTokens += counts.outputTokens;
    totals.cacheReadTokens += counts.cacheReadTokens;
    totals.cacheWriteTokens += counts.cacheWriteTokens;
    totals.totalTokens += counts.inputTokens + counts.outputTokens
        + counts.cacheReadTokens + counts.cacheWriteTokens;
}
/**
 * Cache-hit share of billed input, 0–100.
 *
 * Denominated by all three input buckets because those are exactly what a
 * request pays for; output is excluded since it is never served from cache.
 * @param totals - the totals to measure.
 * @returns the percentage, or `undefined` when no input was recorded.
 */
export function cacheHitPercent(totals) {
    const billed = totals.inputTokens + totals.cacheReadTokens + totals.cacheWriteTokens;
    if (billed <= 0)
        return undefined;
    return Math.round((totals.cacheReadTokens / billed) * 1000) / 10;
}
/**
 * One budget window, measured against derived spend.
 *
 * A window whose spend rests on unpriced calls still reports the amount it
 * could derive, alongside how many calls it could not price, so a percentage is
 * never presented as complete when it is not.
 */
function budgetWindow(limit, cost, budgets) {
    if (limit === undefined || limit <= 0)
        return undefined;
    const spent = cost?.amount ?? 0;
    const unpricedCalls = cost?.unpricedCalls ?? 0;
    const percentUsed = Math.round((spent / limit) * 1000) / 10;
    const status = unpricedCalls > 0 && spent === 0
        ? 'unknown'
        : percentUsed >= budgets.criticalPercent
            ? 'critical'
            : percentUsed >= budgets.warningPercent
                ? 'warning'
                : 'normal';
    return { limit, spent, percentUsed, status, unpricedCalls };
}
/**
 * Merge every session's fold state into the report the panel reads.
 *
 * Sessions are keyed by id so the report can list them; the id is the only
 * session-identifying value that crosses into it, because a title is prompt
 * text and this report is not where prompt text belongs.
 * @param states - per-session id and fold state, in any order.
 * @param options - clock, fold status, prices, and ceilings.
 * @returns the assembled report.
 */
export function buildUsageReport(states, options) {
    const { now, foldedAt, folding, prices, budgets, provider: only } = options;
    const byDay = new Map();
    const byProvider = new Map();
    const byModel = new Map();
    const sessions = [];
    let sessionCount = 0;
    for (const [id, state] of states) {
        sessionCount += 1;
        const session = emptyTotals();
        const routes = new Set();
        const sessionCost = new QuotaCostAccumulator(prices);
        let calls = 0;
        for (const [date, perRoute] of Object.entries(state.days)) {
            for (const [key, counts] of Object.entries(perRoute)) {
                const [provider = 'unknown', model = 'unknown'] = key.split(KEY_SEP);
                // A filtered report drops the other routes here, so every figure below
                // — the day, the session, and the totals — describes one route alone.
                if (only !== undefined && provider !== only)
                    continue;
                const day = byDay.get(date)
                    ?? { date, calls: 0, models: new Map() };
                byDay.set(date, day);
                const row = day.models.get(key) ?? {
                    provider,
                    model,
                    calls: 0,
                    inputTokens: 0,
                    outputTokens: 0,
                    cacheReadTokens: 0,
                    cacheWriteTokens: 0,
                };
                day.models.set(key, row);
                row.calls += counts.calls;
                row.inputTokens += counts.inputTokens;
                row.outputTokens += counts.outputTokens;
                row.cacheReadTokens += counts.cacheReadTokens;
                row.cacheWriteTokens += counts.cacheWriteTokens;
                day.calls += counts.calls;
                addCounts(session, counts);
                routes.add(`${provider}/${model}`);
                sessionCost.add(provider, model, date, counts.calls, counts);
                calls += counts.calls;
            }
        }
        if (session.totalTokens <= 0)
            continue;
        const cost = sessionCost.view();
        sessions.push({
            id,
            calls,
            ...session,
            routes: Object.freeze([...routes].sort((left, right) => left.localeCompare(right))),
            lastActiveAt: state.lastActiveAt ?? 0,
            ...cost === undefined ? {} : { cost },
        });
    }
    const today = localDay(now);
    const monthPrefix = today.slice(0, 7);
    const todayTotals = emptyTotals();
    const monthTotals = emptyTotals();
    const allTimeTotals = emptyTotals();
    const todayCost = new QuotaCostAccumulator(prices);
    const monthCost = new QuotaCostAccumulator(prices);
    const allTimeCost = new QuotaCostAccumulator(prices);
    const days = [];
    for (const day of [...byDay.values()].sort((left, right) => left.date.localeCompare(right.date))) {
        const dayTotals = emptyTotals();
        const dayCost = new QuotaCostAccumulator(prices);
        const models = [];
        for (const row of day.models.values()) {
            const counts = row;
            addCounts(dayTotals, counts);
            addCounts(allTimeTotals, counts);
            allTimeCost.add(row.provider, row.model, day.date, row.calls, counts);
            dayCost.add(row.provider, row.model, day.date, row.calls, counts);
            if (day.date === today) {
                addCounts(todayTotals, counts);
                todayCost.add(row.provider, row.model, day.date, row.calls, counts);
            }
            if (day.date.startsWith(monthPrefix)) {
                addCounts(monthTotals, counts);
                monthCost.add(row.provider, row.model, day.date, row.calls, counts);
            }
            const rowCost = new QuotaCostAccumulator(prices);
            rowCost.add(row.provider, row.model, day.date, row.calls, counts);
            const cost = rowCost.view();
            // The same counters fan out into the route view the panel breaks its
            // totals down by; one pass, so the two never disagree.
            const provider = byProvider.get(row.provider) ?? emptyProvider(row.provider, prices);
            byProvider.set(row.provider, provider);
            addToScope(provider.all, row.provider, row.model, day.date, counts);
            provider.models.add(row.model);
            if (day.date > provider.lastDay)
                provider.lastDay = day.date;
            if (day.date === today)
                addToScope(provider.today, row.provider, row.model, day.date, counts);
            if (day.date.startsWith(monthPrefix)) {
                addToScope(provider.month, row.provider, row.model, day.date, counts);
            }
            const modelKey = row.provider + KEY_SEP + row.model;
            const modelSummary = byModel.get(modelKey) ?? {
                provider: row.provider, model: row.model,
                all: emptyScope(prices), today: emptyScope(prices), month: emptyScope(prices),
            };
            byModel.set(modelKey, modelSummary);
            addToScope(modelSummary.all, row.provider, row.model, day.date, counts);
            if (day.date === today)
                addToScope(modelSummary.today, row.provider, row.model, day.date, counts);
            if (day.date.startsWith(monthPrefix))
                addToScope(modelSummary.month, row.provider, row.model, day.date, counts);
            models.push({
                provider: row.provider,
                model: row.model,
                calls: row.calls,
                inputTokens: row.inputTokens,
                outputTokens: row.outputTokens,
                cacheReadTokens: row.cacheReadTokens,
                cacheWriteTokens: row.cacheWriteTokens,
                totalTokens: row.inputTokens + row.outputTokens + row.cacheReadTokens + row.cacheWriteTokens,
                ...cost === undefined ? {} : { cost },
            });
        }
        models.sort((left, right) => right.totalTokens - left.totalTokens);
        const cost = dayCost.view();
        days.push({
            date: day.date,
            calls: day.calls,
            ...dayTotals,
            ...cost === undefined ? {} : { cost },
            models: Object.freeze(models),
        });
    }
    sessions.sort((left, right) => right.lastActiveAt - left.lastActiveAt || right.totalTokens - left.totalTokens);
    const providers = [];
    for (const entry of byProvider.values()) {
        const all = scopeFigures(entry.all);
        const todayFigures = scopeFigures(entry.today);
        const monthFigures = scopeFigures(entry.month);
        providers.push({
            provider: entry.provider,
            calls: all.calls,
            ...entry.all.totals,
            ...all.cacheHitPercent === undefined ? {} : { cacheHitPercent: all.cacheHitPercent },
            ...all.cost === undefined ? {} : { cost: all.cost },
            todayCalls: todayFigures.calls,
            todayTokens: todayFigures.tokens,
            ...todayFigures.cacheHitPercent === undefined ? {} : { todayCacheHitPercent: todayFigures.cacheHitPercent },
            ...todayFigures.cost === undefined ? {} : { todayCost: todayFigures.cost },
            monthCalls: monthFigures.calls,
            monthTokens: monthFigures.tokens,
            ...monthFigures.cacheHitPercent === undefined ? {} : { monthCacheHitPercent: monthFigures.cacheHitPercent },
            ...monthFigures.cost === undefined ? {} : { monthCost: monthFigures.cost },
            models: entry.models.size,
            lastDay: entry.lastDay,
        });
    }
    providers.sort((left, right) => right.totalTokens - left.totalTokens
        || right.calls - left.calls
        || left.provider.localeCompare(right.provider));
    const modelSummaries = [...byModel.values()].map((entry) => {
        const rule = prices === undefined ? undefined : priceFor(prices, entry.provider, entry.model, today);
        return {
            provider: entry.provider, model: entry.model,
            all: modelScope(entry.all), today: modelScope(entry.today), month: modelScope(entry.month),
            ...rule === undefined || prices === undefined ? {} : {
                rate: {
                    currency: prices.currency,
                    inputPerMillion: rule.inputPerMillion, outputPerMillion: rule.outputPerMillion,
                    cacheReadPerMillion: rule.cacheReadPerMillion ?? rule.inputPerMillion,
                    cacheWritePerMillion: rule.cacheWritePerMillion ?? rule.inputPerMillion,
                    ...rule.from === undefined ? {} : { from: rule.from },
                },
            },
        };
    });
    modelSummaries.sort((left, right) => right.all.totalTokens - left.all.totalTokens
        || left.provider.localeCompare(right.provider) || left.model.localeCompare(right.model));
    const hitPercent = cacheHitPercent(todayTotals);
    const today$ = todayCost.view();
    const month$ = monthCost.view();
    const allTime$ = allTimeCost.view();
    return {
        today,
        todayTotals,
        monthTotals,
        allTimeTotals,
        ...hitPercent === undefined ? {} : { todayCacheHitPercent: hitPercent },
        ...today$ === undefined ? {} : { todayCost: today$ },
        ...month$ === undefined ? {} : { monthCost: month$ },
        ...allTime$ === undefined ? {} : { allTimeCost: allTime$ },
        ...budgetsOf(budgets, prices, today$, month$),
        models: Object.freeze(modelSummaries),
        providers: Object.freeze(providers),
        days: Object.freeze(days),
        sessions: Object.freeze(sessions),
        sessionCount,
        foldedAt,
        folding,
    };
}
/** Materialize the four token buckets, estimated cost and input cache ratio. */
function modelScope(scope) {
    const cost = scope.cost.view();
    const hit = cacheHitPercent(scope.totals);
    return { ...scope.totals, calls: scope.calls,
        ...cost === undefined ? {} : { cost },
        ...hit === undefined ? {} : { cacheHitPercent: hit },
    };
}
/**
 * The budget section, present only when a ceiling is configured.
 *
 * Ceilings are denominated in the price table's own currency, so the section
 * carries that currency rather than one of its own.
 */
function budgetsOf(budgets, prices, todayCost, monthCost) {
    if (budgets === undefined || prices === undefined)
        return {};
    const daily = budgetWindow(budgets.daily, todayCost, budgets);
    const monthly = budgetWindow(budgets.monthly, monthCost, budgets);
    if (daily === undefined && monthly === undefined)
        return {};
    return {
        budgets: {
            currency: prices.currency,
            ...daily === undefined ? {} : { daily },
            ...monthly === undefined ? {} : { monthly },
        },
    };
}
/**
 * An empty report, served before the first fold completes.
 * @param now - current epoch milliseconds.
 * @param folding - whether the first fold round is already running.
 * @returns a report with zeroed totals and no days.
 */
export function emptyUsageReport(now, folding) {
    return buildUsageReport([], { now, foldedAt: 0, folding });
}
//# sourceMappingURL=usage-fold.js.map