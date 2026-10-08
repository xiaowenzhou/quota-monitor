/**
 * Balance-endpoint probing: one HTTPS GET per attempt plus the six response
 * grammars the monitor recognizes (DeepSeek official, new-api, Sub2API-style
 * dashboards, MiniMax coding-plan windows, Cline Pass plan limits, and
 * AgentRouter desk accounts).
 *
 * Probes run from the Host process with Node's own TLS stack — unlike the
 * dynamic-plugin predecessor, no Python sidecar is involved.
 * @module @deepseek-ai/dsh-extension-quota-monitor/probe
 */
/** Hard cap for one balance endpoint round trip. */
const PROBE_TIMEOUT_MS = 12_000;
/** new-api denominates its quota in units of 1/500000 dollar. */
const NEW_API_QUOTA_PER_DOLLAR = 500_000;
/** Keys probed (in order) for the remaining/total/used figures of a Sub2API-style dashboard. */
const REMAINING_KEYS = ['remaining', 'remain', 'remaining_quota', 'quota_remaining', 'balance', 'credits'];
const TOTAL_KEYS = ['total_quota', 'quota', 'total', 'limit'];
const USED_KEYS = ['used_quota', 'used', 'usage'];
/**
 * Cline Pass window ids mapped to the three rows the panel can label. Any
 * other `type` is skipped: the endpoint may add windows this build has no row
 * for, and dropping one is preferable to labelling it wrongly.
 */
const CLINE_WINDOW_KINDS = Object.freeze({
    five_hour: 'five-hour',
    weekly: 'weekly',
    monthly: 'monthly',
});
/** Keys probed (in order) for an AgentRouter account's remaining/limit/used figures. */
const POOL_REMAINING_KEYS = ['remaining', 'remaining_quota', 'remain_quota', 'balance', 'available'];
const POOL_LIMIT_KEYS = ['limit', 'total', 'total_quota', 'quota', 'budget', 'budget_limit'];
const POOL_USED_KEYS = ['used', 'used_quota', 'usage', 'consumed'];
/** Keys probed (in order) for a budget pool's display name. */
const POOL_NAME_KEYS = ['name', 'pool_name', 'budget_pool_name', 'title', 'id', 'pool_id'];
/**
 * GET one JSON document with a Bearer credential.
 * @param url - absolute HTTPS endpoint.
 * @param apiKey - provider credential sent as the bearer token.
 * @returns the parsed JSON object, or `undefined` on transport or parse failure.
 */
export async function fetchJson(url, apiKey) {
    try {
        const response = await fetch(url, {
            headers: { accept: 'application/json', authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        });
        const text = await response.text();
        const parsed = JSON.parse(text);
        return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    }
    catch {
        return undefined;
    }
}
/** Whether `value` carries a finite number under `key`. */
function numberOf(value, key) {
    const raw = value[key];
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
}
/** First finite number found for any of `keys`, searching nested objects breadth-first. */
function findNumber(value, keys, depth = 0) {
    if (typeof value !== 'object' || value === null || depth > 5)
        return undefined;
    for (const key of keys) {
        const direct = numberOf(value, key);
        if (direct !== undefined)
            return direct;
    }
    for (const child of Object.values(value)) {
        const nested = findNumber(child, keys, depth + 1);
        if (nested !== undefined)
            return nested;
    }
    return undefined;
}
/**
 * First finite number found for any of `keys` on `value` itself. AgentRouter
 * names these figures at the top of each section, so a nested search would
 * only let an unrelated inner object supply the row's headline number.
 */
function ownNumber(value, keys) {
    for (const key of keys) {
        const direct = numberOf(value, key);
        if (direct !== undefined)
            return direct;
    }
    return undefined;
}
/** Frozen success view with the common envelope fields filled. */
function success(balance, currency, source, extra) {
    return Object.freeze({
        ok: true,
        balance,
        currency,
        source,
        fetchedAt: Date.now(),
        pct: 0,
        ...extra,
    });
}
/**
 * Confine a disclosed percentage to 0–100. Endpoints report overage figures
 * above 100 and, after a refund or a clock skew, below 0; the panel draws a
 * bar from this number, so it is clamped once here rather than at each render.
 */
function clampPercent(value) {
    return Math.max(0, Math.min(100, value));
}
/** First non-empty string found under any of `keys`. */
function stringOf(value, keys) {
    for (const key of keys) {
        const raw = value[key];
        if (typeof raw === 'string' && raw.trim() !== '')
            return raw.trim();
    }
    return undefined;
}
/** The array under `key`, read from the body root or a `data` envelope. */
function arrayUnder(body, key) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    const direct = body[key];
    if (Array.isArray(direct))
        return direct;
    const data = body['data'];
    if (typeof data !== 'object' || data === null)
        return undefined;
    const nested = data[key];
    return Array.isArray(nested) ? nested : undefined;
}
/** The object under `key`, read from the body root or a `data` envelope. */
function objectUnder(body, key) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    const direct = body[key];
    if (typeof direct === 'object' && direct !== null && !Array.isArray(direct))
        return direct;
    const data = body['data'];
    if (typeof data !== 'object' || data === null)
        return undefined;
    const nested = data[key];
    return typeof nested === 'object' && nested !== null && !Array.isArray(nested) ? nested : undefined;
}
/**
 * DeepSeek official user balance: `{ balance_infos: [{ total_balance, currency }] }`.
 * @param body - parsed endpoint response.
 */
export function parseDeepSeekBalance(body) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    const rawInfos = body['balance_infos'];
    if (!Array.isArray(rawInfos))
        return undefined;
    const infos = rawInfos;
    if (infos.length === 0)
        return undefined;
    const first = infos[0];
    if (typeof first !== 'object' || first === null)
        return undefined;
    const total = numberOf(first, 'total_balance');
    if (total === undefined)
        return undefined;
    const currencyRaw = first['currency'];
    return success(total, typeof currencyRaw === 'string' && currencyRaw !== '' ? currencyRaw : 'CNY', 'DeepSeek 官方');
}
/**
 * new-api `/api/user/self`: `{ data: { quota } }` in 1/500000-dollar units.
 * @param body - parsed endpoint response.
 */
export function parseNewApiQuota(body) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    const data = body['data'];
    if (typeof data !== 'object' || data === null)
        return undefined;
    const quota = numberOf(data, 'quota');
    if (quota === undefined)
        return undefined;
    return success(quota / NEW_API_QUOTA_PER_DOLLAR, '$', 'new-api');
}
/**
 * Sub2API-style dashboard: remaining/total/used credits under assorted key
 * spellings. There is no universal endpoint, so absence returns `undefined`
 * and the caller reports an unrecognized-endpoint failure.
 * @param body - parsed endpoint response.
 */
export function parseSub2ApiQuota(body) {
    const remaining = findNumber(body, REMAINING_KEYS);
    const total = findNumber(body, TOTAL_KEYS);
    const used = findNumber(body, USED_KEYS);
    if (remaining === undefined && total === undefined)
        return undefined;
    const left = remaining ?? Math.max(0, (total ?? 0) - (used ?? 0));
    const pct = total !== undefined && total > 0 ? ((total - left) / total) * 100 : 0;
    return success(left, 'credits', 'Sub2API', { pct });
}
/**
 * MiniMax 5h rolling window: `{ model_remains: [...] }` (also nested under
 * `data`). The panel shows the tightest model's remaining percent and its
 * reset instant — that is the window the user actually budgets against.
 * @param body - parsed endpoint response.
 */
export function parseMiniMaxWindow(body) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    const direct = body['model_remains'];
    const nested = body['data'];
    const rows = Array.isArray(direct)
        ? direct
        : typeof nested === 'object' && nested !== null && Array.isArray(nested['model_remains'])
            ? nested['model_remains']
            : undefined;
    if (rows === undefined || rows.length === 0)
        return undefined;
    let remainingTokens = 0;
    let disclosedTokens = false;
    let tightest;
    let latestEnd;
    for (const row of rows) {
        if (typeof row !== 'object' || row === null)
            continue;
        const model = row;
        const remains = typeof model.remains_time === 'number' ? model.remains_time : Number(model.remains_time);
        if (Number.isFinite(remains)) {
            remainingTokens += remains;
            disclosedTokens = true;
        }
        const remainPct = typeof model.current_interval_remaining_percent === 'number'
            ? model.current_interval_remaining_percent
            : Number(model.current_interval_remaining_percent);
        const end = normalizeEpochMs(model.end_time);
        if (end !== undefined && (latestEnd === undefined || end > latestEnd))
            latestEnd = end;
        if (Number.isFinite(remainPct) && (tightest === undefined || remainPct < tightest.pct)) {
            tightest = { pct: remainPct, ...(end === undefined ? {} : { end }) };
        }
    }
    if (!disclosedTokens)
        return undefined;
    const resetAtMs = tightest?.end ?? latestEnd;
    const resetAt = resetAtMs !== undefined && Date.now() < resetAtMs ? new Date(resetAtMs).toISOString() : undefined;
    const remainPercent = tightest?.pct;
    const usedPct = remainPercent === undefined ? 0 : clampPercent(100 - remainPercent);
    return success(remainPercent ?? remainingTokens, remainPercent === undefined ? 'tokens' : '%', 'MiniMax 5h 窗口', {
        hasIntervalWindow: true,
        remainingTokens,
        ...(usedPct > 0 || remainPercent !== undefined ? { pct: usedPct } : {}),
        ...(remainPercent === undefined ? {} : { remainPercent }),
        ...(resetAt === undefined ? {} : { resetAt }),
    });
}
/** Interpret an epoch field that may arrive in seconds or milliseconds. */
function normalizeEpochMs(raw) {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value))
        return undefined;
    const ms = value > 1e12 ? value : value * 1000;
    return Number.isNaN(new Date(ms).getTime()) ? undefined : ms;
}
/**
 * A reset instant that is still ahead, as an ISO string. Accepts the ISO text
 * Cline Pass sends and the numeric epochs the other gateways use; an instant
 * already in the past is dropped, because a countdown to it shows nothing.
 */
function upcomingIso(raw) {
    const ms = typeof raw === 'string' ? new Date(raw).getTime() : normalizeEpochMs(raw);
    if (ms === undefined || !Number.isFinite(ms) || Date.now() >= ms)
        return undefined;
    return new Date(ms).toISOString();
}
/**
 * Cline Pass plan limits: `{ limits: [{ type, percentUsed, resetsAt }] }`
 * (also nested under `data`). `type` is one of `five_hour`, `weekly`, and
 * `monthly`; any other window is skipped. The envelope reports the tightest
 * window, which is the one that stops a session first.
 * @param body - parsed endpoint response.
 * @returns the probe view, or `undefined` when no recognized window is disclosed.
 */
export function parseClinePlanLimits(body) {
    const rows = arrayUnder(body, 'limits');
    if (rows === undefined)
        return undefined;
    const windows = [];
    for (const row of rows) {
        if (typeof row !== 'object' || row === null)
            continue;
        const type = row['type'];
        const kind = typeof type === 'string' ? CLINE_WINDOW_KINDS[type] : undefined;
        if (kind === undefined)
            continue;
        const percent = numberOf(row, 'percentUsed');
        if (percent === undefined)
            continue;
        const resetAt = upcomingIso(row['resetsAt']);
        windows.push({
            kind,
            percentUsed: clampPercent(percent),
            ...(resetAt === undefined ? {} : { resetAt }),
        });
    }
    windows.sort((left, right) => right.percentUsed - left.percentUsed);
    const [tightest] = windows;
    if (tightest === undefined)
        return undefined;
    const remainPercent = 100 - tightest.percentUsed;
    return success(remainPercent, '%', 'Cline Pass', {
        hasIntervalWindow: true,
        pct: tightest.percentUsed,
        remainPercent,
        planWindows: Object.freeze(windows),
        ...(tightest.resetAt === undefined ? {} : { resetAt: tightest.resetAt }),
    });
}
/**
 * AgentRouter desk account: `{ usage_summary: {...}, budget_pool_usages: [...] }`
 * (also nested under `data`). The endpoint discloses no unit, so the figures
 * are reported verbatim under the neutral `credits` label; the account row
 * carries the summary remainder and each pool keeps its own remainder.
 * @param body - parsed endpoint response.
 * @returns the probe view, or `undefined` when neither section carries a figure.
 */
export function parseAgentRouterAccount(body) {
    const summary = objectUnder(body, 'usage_summary');
    const pools = readBudgetPools(arrayUnder(body, 'budget_pool_usages'));
    const account = summary === undefined ? undefined : readAmounts(summary);
    if (account === undefined && pools.length === 0)
        return undefined;
    const remaining = account?.remaining ?? pools.reduce((total, pool) => total + pool.remaining, 0);
    return success(remaining, 'credits', 'AgentRouter', {
        ...(account?.percentUsed === undefined ? {} : { pct: account.percentUsed }),
        ...(pools.length === 0 ? {} : { budgetPools: Object.freeze(pools) }),
    });
}
/**
 * Read a remaining figure and, when an allowance is disclosed, its used share.
 * A section that discloses only a limit and a used figure yields the
 * difference, so a gateway reporting either side alone still produces a row.
 */
function readAmounts(section) {
    const remaining = ownNumber(section, POOL_REMAINING_KEYS);
    const limit = ownNumber(section, POOL_LIMIT_KEYS);
    const used = ownNumber(section, POOL_USED_KEYS);
    if (remaining === undefined && limit === undefined)
        return undefined;
    const left = remaining ?? Math.max(0, (limit ?? 0) - (used ?? 0));
    return {
        remaining: left,
        ...(limit === undefined ? {} : { limit }),
        ...(limit === undefined || limit <= 0 ? {} : { percentUsed: clampPercent(((limit - left) / limit) * 100) }),
    };
}
/** Project the `budget_pool_usages` rows that disclose a usable figure. */
function readBudgetPools(rows) {
    if (rows === undefined)
        return [];
    const pools = [];
    for (const row of rows) {
        if (typeof row !== 'object' || row === null)
            continue;
        const amounts = readAmounts(row);
        if (amounts === undefined)
            continue;
        pools.push({ name: stringOf(row, POOL_NAME_KEYS) ?? `#${pools.length + 1}`, ...amounts });
    }
    return pools;
}
//# sourceMappingURL=probe.js.map