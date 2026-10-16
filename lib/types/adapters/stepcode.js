/**
 * The StepCode / AgentRouter desk account adapter.
 *
 * One guarded GET against `{origin}/desk/v1/stepcode/user/info` answers with an
 * account summary plus one row per budget pool, and a second against
 * `{origin}/desk/v2/stepcode/usage/model-tokens?days=N` answers with what that
 * same credential actually spent, per model and per day. Neither endpoint is a
 * documented public API, so every figure is read from an ordered candidate
 * list: a renamed field degrades one row instead of reporting a wrong number,
 * and a section disclosing only two of used/total/remaining yields the third.
 *
 * Both requests carry the credential in their own `Authorization` header, so
 * every figure this adapter returns belongs to exactly one key — which is the
 * only way to tell two keys behind one route apart, because a model request
 * names a route and never the key that served it.
 *
 * The usage request is the secondary one: a deployment whose key may read the
 * account but not the usage series still gets its allowance, with the token
 * detail absent rather than the whole reading failed.
 *
 * This is the protocol the StepCode quota tooling reads; `agent-router` remains
 * the terse reader shipped for the same path, and a deployment that wants the
 * pools, usage share, billing period, and per-key token history picks this
 * adapter by name.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/stepcode
 */
import { QuotaRequestError, requestJson } from "../http.js";
import { arrayUnder, clampPercent, epochMsOf, isRecord, objectUnder, pickNumber, pickString, round1, upcomingIso, } from "../parse.js";
import { bearer, gatewayUsageRow, requireKey } from "./contract.js";
/** Path of the desk account endpoint, relative to the gateway origin. */
const ACCOUNT_PATH = '/desk/v1/stepcode/user/info';
/** Path of the per-key usage endpoint, relative to the gateway origin. */
const USAGE_PATH = '/desk/v2/stepcode/usage/model-tokens';
/** History window asked for when configuration states none. */
const DEFAULT_USAGE_DAYS = 62;
/** Live desk API supports longer windows; bound the local request to one year. */
const MIN_USAGE_DAYS = 1;
const MAX_USAGE_DAYS = 366;
/** Key spellings probed for one section's spend. */
const USED_KEYS = ['used', 'used_quota', 'usage', 'consumed'];
/** Key spellings probed for one section's allowance. */
const TOTAL_KEYS = ['total', 'total_quota', 'quota', 'limit', 'budget_limit', 'binding_quota_limit'];
/** Key spellings probed for one section's remainder. */
const REMAINING_KEYS = ['remaining', 'remaining_quota', 'remain_quota', 'balance', 'available'];
/** Key spellings probed for a budget pool's label. */
const POOL_NAME_KEYS = ['pool_name', 'name', 'channel_name', 'title', 'pool_uid', 'id'];
/** Key spellings probed for each token bucket. */
const INPUT_KEYS = ['input_tokens', 'prompt_tokens'];
const OUTPUT_KEYS = ['output_tokens', 'completion_tokens'];
const REASONING_KEYS = ['reasoning_tokens'];
const CACHE_READ_KEYS = ['cache_read_tokens', 'cached_tokens'];
const CACHE_WRITE_KEYS = ['cache_creation_tokens', 'cache_write_tokens'];
/** Key spellings probed for each call counter. */
const CALL_KEYS = ['total_calls', 'calls', 'requests', 'request_count'];
const SUCCESS_KEYS = ['success_calls'];
const FAILED_KEYS = ['failed_calls'];
const STREAM_KEYS = ['stream_request_calls', 'stream_calls'];
/** The origin an adapter addresses, so a base URL carrying a path still resolves. */
function originOf(context) {
    const base = context.usageBaseURL ?? context.baseURL;
    if (base === undefined || base === '') {
        throw new QuotaRequestError('not-configured', 'provider has no configured base URL');
    }
    try {
        return new URL(base).origin;
    }
    catch {
        throw new QuotaRequestError('invalid-response', 'configured base URL is not absolute');
    }
}
/**
 * Clamp a requested history window to the range the usage endpoint documents.
 *
 * The endpoint clamps too, so asking outside the range is not an error; this
 * keeps the stored window equal to what was actually asked for.
 * @param value - the configured day count, when one was.
 * @returns a whole number of days within range.
 */
function clampDays(value) {
    if (value === undefined || !Number.isFinite(value))
        return DEFAULT_USAGE_DAYS;
    return Math.min(MAX_USAGE_DAYS, Math.max(MIN_USAGE_DAYS, Math.trunc(value)));
}
/**
 * Sum the four token buckets the endpoint meters separately.
 *
 * Reasoning tokens bill beside the output they accompany rather than inside it,
 * and the endpoint's own total excludes them; the derived total follows the
 * same rule so a section stating only buckets still reconciles with one stating
 * its own total.
 */
function bucketTotal(buckets) {
    return buckets.inputTokens + buckets.outputTokens + buckets.cacheReadTokens + buckets.cacheWriteTokens;
}
/**
 * Read one section's token buckets.
 *
 * A section stating no token figure at all is not a zero — the endpoint may
 * meter that row in calls only — so it yields nothing.
 * @param section - one account summary, pool row, model total, or day row.
 * @returns the buckets, or `undefined` when the section discloses no token figure.
 */
function readTokens(section) {
    if (!isRecord(section))
        return undefined;
    const input = pickNumber(section, INPUT_KEYS);
    const output = pickNumber(section, OUTPUT_KEYS);
    const total = pickNumber(section, ['total_tokens']);
    if (input === undefined && output === undefined && total === undefined)
        return undefined;
    const buckets = {
        inputTokens: input ?? 0,
        outputTokens: output ?? 0,
        reasoningTokens: pickNumber(section, REASONING_KEYS) ?? 0,
        cacheReadTokens: pickNumber(section, CACHE_READ_KEYS) ?? 0,
        cacheWriteTokens: pickNumber(section, CACHE_WRITE_KEYS) ?? 0,
    };
    return { ...buckets, totalTokens: total ?? bucketTotal(buckets) };
}
/**
 * Read one section's call counters.
 * @param section - one account summary, pool row, model total, or day row.
 * @returns the counters, or `undefined` when the section discloses none.
 */
function readCalls(section) {
    if (!isRecord(section))
        return undefined;
    const calls = pickNumber(section, CALL_KEYS);
    const success = pickNumber(section, SUCCESS_KEYS);
    const failed = pickNumber(section, FAILED_KEYS);
    if (calls === undefined && success === undefined && failed === undefined)
        return undefined;
    return {
        // A section stating only the outcomes still states how many calls there were.
        calls: calls ?? (success ?? 0) + (failed ?? 0),
        successCalls: success ?? 0,
        failedCalls: failed ?? 0,
        streamCalls: pickNumber(section, STREAM_KEYS) ?? 0,
    };
}
/**
 * Read one usage row's tokens and, when it states them, its call counters.
 * @param section - one model total or day row of the usage answer.
 * @returns the row's figures, or `undefined` when it discloses no tokens.
 */
function readRow(section) {
    const tokens = readTokens(section);
    if (tokens === undefined)
        return undefined;
    const calls = readCalls(section);
    return calls === undefined ? tokens : { ...tokens, ...calls };
}
/**
 * Fold a series of rows into one, summing every bucket.
 * @param rows - the rows to sum.
 * @returns the summed figures, or `undefined` for an empty series.
 */
function sumRows(rows) {
    if (rows.length === 0)
        return undefined;
    const total = {
        inputTokens: 0, outputTokens: 0, reasoningTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, totalTokens: 0,
    };
    let calls = 0;
    let successCalls = 0;
    let failedCalls = 0;
    let streamCalls = 0;
    let metered = false;
    for (const row of rows) {
        total.inputTokens += row.inputTokens;
        total.outputTokens += row.outputTokens;
        total.reasoningTokens += row.reasoningTokens;
        total.cacheReadTokens += row.cacheReadTokens;
        total.cacheWriteTokens += row.cacheWriteTokens;
        total.totalTokens += row.totalTokens;
        if (row.calls === undefined)
            continue;
        metered = true;
        calls += row.calls;
        successCalls += row.successCalls ?? 0;
        failedCalls += row.failedCalls ?? 0;
        streamCalls += row.streamCalls ?? 0;
    }
    return metered ? { ...total, calls, successCalls, failedCalls, streamCalls } : total;
}
/**
 * Read the usage answer's per-model and per-day series.
 *
 * The endpoint publishes both a fine per-day-per-model `rows` series and its
 * own `model_totals`/`daily_totals`/`grand_total` aggregates. The aggregates are
 * preferred where present, because they are what the endpoint itself considers
 * the answer; the fine series is only folded when an aggregate is missing, so a
 * deployment serving one shape or the other is read the same way.
 * @param data - the usage answer's `data` object.
 * @returns the series, with empty lists when the answer discloses none.
 */
function readSeries(data) {
    const points = [];
    for (const row of arrayUnder(data, 'rows') ?? []) {
        const figures = readRow(row);
        const date = pickString(row, ['date']);
        const model = pickString(row, ['model', 'model_name']);
        if (figures === undefined || date === undefined || model === undefined)
            continue;
        points.push({ date, model, ...figures });
    }
    const models = [];
    for (const row of arrayUnder(data, 'model_totals') ?? []) {
        const figures = readRow(row);
        const model = pickString(row, ['model', 'model_name']);
        if (figures === undefined || model === undefined)
            continue;
        models.push({ model, ...figures });
    }
    if (models.length === 0)
        models.push(...foldPoints(points, point => point.model, (model, rows) => ({ model, ...rows })));
    const daily = [];
    for (const row of arrayUnder(data, 'daily_totals') ?? []) {
        const figures = readRow(row);
        const date = pickString(row, ['date']);
        if (figures === undefined || date === undefined)
            continue;
        daily.push({ date, ...figures });
    }
    if (daily.length === 0)
        daily.push(...foldPoints(points, point => point.date, (date, rows) => ({ date, ...rows })));
    // The endpoint's own grand total is authoritative; without one, the summed
    // aggregates answer the same question.
    const grandSection = objectUnder(data, 'grand_total');
    const grand = grandSection === undefined ? undefined : readRow(grandSection);
    const window = grand === undefined ? sumRows(models) ?? sumRows(daily) : sumRows([grand]);
    return { models, daily, points, ...window === undefined ? {} : { window } };
}
/**
 * Fold a point series into one row per distinct key.
 * @param points - the per-day-per-model rows.
 * @param keyOf - the field to group by.
 * @param build - assembles one grouped row from its key and summed figures.
 * @returns one row per distinct key, in first-seen order.
 */
function foldPoints(points, keyOf, build) {
    const groups = new Map();
    for (const point of points) {
        const key = keyOf(point);
        const bucket = groups.get(key);
        if (bucket === undefined)
            groups.set(key, [point]);
        else
            bucket.push(point);
    }
    const rows = [];
    for (const [key, group] of groups) {
        const summed = sumRows(group);
        if (summed !== undefined)
            rows.push(build(key, summed));
    }
    return rows;
}
/**
 * Read the usage endpoint's answer into the per-key detail.
 *
 * A window with no readable series is not an answer worth carrying, so it
 * yields nothing and the card shows the allowance alone.
 * @param body - the parsed usage answer.
 * @param days - the window that was requested.
 * @returns the detail, or `undefined` when the answer carries no series.
 */
function readKeyUsage(body, days) {
    const data = objectUnder(body, 'data') ?? (isRecord(body) ? body : undefined);
    if (data === undefined)
        return undefined;
    const { models, daily, points, window } = readSeries(data);
    if (models.length === 0 && daily.length === 0 && window === undefined)
        return undefined;
    const startDate = pickString(data, ['start_date']);
    const endDate = pickString(data, ['end_date']);
    const answered = clampDays(pickNumber(data, ['window_days']) ?? days);
    return {
        days: answered,
        ...startDate === undefined ? {} : { startDate },
        ...endDate === undefined ? {} : { endDate },
        ...window === undefined ? {} : { window },
        models: Object.freeze(models),
        daily: Object.freeze(daily),
        points: Object.freeze(points),
    };
}
/**
 * Read one section's amounts.
 *
 * A section disclosing a remainder reports it; one disclosing an allowance and
 * a spend reports the difference. A section disclosing only a spend against no
 * allowance still reports that spend, because an unmetered plan is a real
 * answer and not a missing one.
 * @param section - the account summary or one pool row.
 * @returns the amounts, or `undefined` when the section discloses none.
 */
function readAmounts(section) {
    if (!isRecord(section))
        return undefined;
    const used = pickNumber(section, USED_KEYS);
    const limit = pickNumber(section, TOTAL_KEYS);
    const remaining = pickNumber(section, REMAINING_KEYS);
    if (used === undefined && limit === undefined && remaining === undefined)
        return undefined;
    const unlimited = section['unlimited'] === true || section['binding_unlimited'] === true;
    const left = remaining ?? (limit !== undefined && used !== undefined ? Math.max(0, limit - used) : undefined);
    if (left === undefined)
        return undefined;
    const spent = used ?? (limit !== undefined && remaining !== undefined ? Math.max(0, limit - remaining) : undefined);
    // The endpoint's own share is authoritative when it meters spend and
    // allowance on different clocks.
    const disclosed = clampPercent(pickNumber(section, ['usage_percent']));
    const percentUsed = disclosed ?? (limit !== undefined && limit > 0 && spent !== undefined
        ? clampPercent((spent / limit) * 100)
        : undefined);
    const currency = pickString(section, ['cost_currency', 'currency', 'unit']);
    const periodEnd = pickString(section, ['period_end']);
    return {
        remaining: left,
        ...spent === undefined ? {} : { used: spent },
        ...limit === undefined ? {} : { limit },
        ...percentUsed === undefined ? {} : { percentUsed: round1(percentUsed) },
        ...unlimited ? { unlimited: true } : {},
        ...currency === undefined ? {} : { currency },
        ...periodEnd === undefined ? {} : { periodEnd },
    };
}
/**
 * The envelope's own status code, when it carries one.
 *
 * A 200 wrapping an error code is still an error, so this is checked before any
 * figure is read.
 * @param body - the parsed answer.
 * @throws {QuotaRequestError} when the envelope reports a failure.
 */
function assertEnvelope(body) {
    const code = pickNumber(body, ['code']);
    if (code === undefined || code === 200 || code === 0)
        return;
    const message = pickString(body, ['msg', 'message']) ?? `account endpoint reported code ${code}`;
    throw new QuotaRequestError(code === 401 || code === 403 ? 'unauthorized' : 'invalid-response', message);
}
/**
 * Read the billing period an account summary meters.
 *
 * The summary states its token and call figures on the same clock as the
 * allowance, so they belong to the period rather than to the usage window the
 * second endpoint answers over.
 * @param section - the account summary.
 * @param amounts - the amounts already read from the same section.
 * @returns the period, or `undefined` when the section discloses nothing.
 */
function readPeriod(section, amounts) {
    const tokens = readTokens(section);
    const calls = readCalls(section);
    if (tokens === undefined && calls === undefined && amounts === undefined)
        return undefined;
    const periodKey = pickString(section, ['period_key']);
    const startAt = pickString(section, ['period_start']);
    const endAt = pickString(section, ['period_end']);
    const updatedAt = epochMsOf(isRecord(section) ? section['last_updated_at'] : undefined);
    return {
        ...tokens === undefined ? {} : tokens,
        ...calls === undefined ? {} : calls,
        ...periodKey === undefined ? {} : { periodKey },
        ...startAt === undefined ? {} : { startAt },
        ...endAt === undefined ? {} : { endAt },
        ...updatedAt === undefined ? {} : { updatedAt },
        ...amounts?.used === undefined ? {} : { used: amounts.used },
        ...amounts?.limit === undefined ? {} : { limit: amounts.limit },
        ...amounts === undefined ? {} : { remaining: amounts.remaining },
        ...amounts?.percentUsed === undefined ? {} : { percentUsed: amounts.percentUsed },
        ...amounts?.currency === undefined ? {} : { currency: amounts.currency },
    };
}
/**
 * Ask the usage endpoint what this credential spent.
 *
 * The account answer is the reason the adapter ran, so a usage endpoint that
 * refuses, times out, or answers with an error envelope costs the token detail
 * and never the allowance: this yields nothing, and the card states the balance
 * alone rather than a failed reading.
 * @param origin - the gateway origin both desk endpoints are served from.
 * @param key - the credential, sent only in this request's own header.
 * @param days - the requested history window.
 * @param context - the adapter context carrying transport controls.
 * @returns the detail, or `undefined` when the endpoint disclosed none.
 */
async function readUsage(origin, key, days, context) {
    const window = clampDays(days);
    try {
        const body = await requestJson(bearer(`${origin}${USAGE_PATH}?days=${window}`, key, context));
        const code = pickNumber(body, ['code']);
        if (code !== undefined && code !== 200 && code !== 0)
            return undefined;
        return readKeyUsage(body, window);
    }
    catch {
        return undefined;
    }
}
/**
 * The StepCode desk account: an account summary, its budget pools, the billing
 * period the summary is metered over, and what the credential actually spent
 * over the requested window.
 *
 * The desk API is served beside the inference API, so this adapter addresses
 * the base URL's origin rather than the base URL itself.
 */
export const stepcode = {
    id: 'stepcode',
    async read(context) {
        const key = await requireKey(context);
        const origin = originOf(context);
        const body = await requestJson(bearer(`${origin}${ACCOUNT_PATH}`, key, context));
        assertEnvelope(body);
        const now = context.now();
        const summary = objectUnder(body, 'usage_summary');
        const account = readAmounts(summary);
        const pools = [];
        const usage = [];
        for (const row of arrayUnder(body, 'budget_pool_usages') ?? []) {
            const name = pickString(row, POOL_NAME_KEYS) ?? `#${pools.length + 1}`;
            const amounts = readAmounts(row);
            if (amounts !== undefined) {
                pools.push({
                    name,
                    remaining: amounts.remaining,
                    ...amounts.limit === undefined ? {} : { limit: amounts.limit },
                    ...amounts.percentUsed === undefined ? {} : { percentUsed: amounts.percentUsed },
                });
            }
            // A pool reports its tokens beside its allowance, so a pool whose
            // remainder is unreadable still contributes the usage it disclosed.
            const usageRow = gatewayUsageRow('pool', name, row);
            if (usageRow !== undefined)
                usage.push(usageRow);
        }
        if (account === undefined && pools.length === 0) {
            throw new QuotaRequestError('invalid-response', 'StepCode desk response has no usable figures');
        }
        // The summary's own billing period, when it states both a share and an end.
        const resetAt = upcomingIso(account?.periodEnd, now);
        const billing = account?.percentUsed === undefined || resetAt === undefined
            ? []
            : [{ kind: 'billing', percentUsed: account.percentUsed, resetAt }];
        const period = readPeriod(summary, account);
        const detail = await readUsage(origin, key, context.usageDays ?? DEFAULT_USAGE_DAYS, context);
        // The period comes from the account answer and the series from the usage
        // answer, so the two are merged here rather than in either reader.
        const keyUsage = detail === undefined
            ? period === undefined ? undefined : {
                days: clampDays(context.usageDays),
                period,
                models: Object.freeze([]),
                daily: Object.freeze([]),
                points: Object.freeze([]),
            }
            : period === undefined ? detail : { ...detail, period };
        return {
            mode: 'balance',
            remaining: account?.remaining ?? pools.reduce((total, pool) => total + pool.remaining, 0),
            ...account?.used === undefined ? {} : { used: account.used },
            ...account?.limit === undefined ? {} : { limit: account.limit },
            // The desk endpoint discloses no unit on most deployments; StepCode
            // meters CNY, which is the default its own tooling reads with.
            currency: account?.currency ?? 'CNY',
            ...account?.unlimited === true ? { unlimited: true } : {},
            ...billing.length === 0 ? {} : { planWindows: Object.freeze(billing) },
            ...pools.length === 0 ? {} : { budgetPools: Object.freeze(pools) },
            ...usage.length === 0 ? {} : { usage: Object.freeze(usage) },
            ...keyUsage === undefined ? {} : { keyUsage },
        };
    },
};
//# sourceMappingURL=stepcode.js.map