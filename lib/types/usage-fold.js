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
import { QuotaCostAccumulator } from "./pricing.js";
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
/** Read a non-negative finite integer, or 0. */
function countOf(value) {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}
/**
 * Fold one session's events into a per-day, per-route counter map.
 *
 * Resumes from `previous` when the log only grew; a shorter log, or one whose
 * prefix was rewritten, is refolded from the start because its earlier seqs
 * no longer identify the same events.
 * @param events - the session's raw log events, ascending by seq.
 * @param previous - the fold state from an earlier round, when one exists.
 * @returns the updated fold state.
 */
export function foldSessionEvents(events, previous) {
    const resumable = previous !== undefined && events.length >= previous.eventCount;
    const days = resumable
        ? structuredClone(previous.days)
        : {};
    let throughSeq = resumable ? previous.throughSeq : -1;
    let lastActiveAt = resumable ? previous.lastActiveAt ?? 0 : 0;
    // The route is logged once per change, so a step inherits the last one seen
    // — including from events before the resume point, which is why the scan
    // always starts at the beginning and only the accumulation is skipped.
    let route;
    for (const event of events) {
        if (event.type === 'request/context') {
            const data = event.data;
            if (typeof data.provider === 'string' && typeof data.model === 'string') {
                route = { provider: data.provider, model: data.model };
            }
            continue;
        }
        if (event.type !== 'assistant/message')
            continue;
        if (resumable && event.seq <= previous.throughSeq)
            continue;
        const { usage } = event.data;
        if (usage === undefined)
            continue;
        const date = localDay(event.time);
        const key = `${route?.provider ?? 'unknown'}${KEY_SEP}${route?.model ?? 'unknown'}`;
        const byRoute = days[date] ?? (days[date] = {});
        const counts = byRoute[key] ?? (byRoute[key] = emptyCounts());
        counts.calls += 1;
        counts.inputTokens += countOf(usage.inputTokens);
        counts.outputTokens += countOf(usage.outputTokens);
        counts.cacheReadTokens += countOf(usage.cacheReadTokens);
        counts.cacheWriteTokens += countOf(usage.cacheWriteTokens);
        throughSeq = Math.max(throughSeq, event.seq);
        lastActiveAt = Math.max(lastActiveAt, event.time);
    }
    return {
        throughSeq,
        eventCount: events.length,
        days,
        ...lastActiveAt > 0 ? { lastActiveAt } : {},
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
    const { now, foldedAt, folding, prices, budgets } = options;
    const byDay = new Map();
    const sessions = [];
    let sessionCount = 0;
    for (const [id, state] of states) {
        sessionCount += 1;
        const session = emptyTotals();
        const routes = new Set();
        const sessionCost = new QuotaCostAccumulator(prices);
        let calls = 0;
        for (const [date, perRoute] of Object.entries(state.days)) {
            const day = byDay.get(date)
                ?? { date, calls: 0, models: new Map() };
            byDay.set(date, day);
            for (const [key, counts] of Object.entries(perRoute)) {
                const [provider = 'unknown', model = 'unknown'] = key.split(KEY_SEP);
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
        days: Object.freeze(days),
        sessions: Object.freeze(sessions),
        sessionCount,
        foldedAt,
        folding,
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