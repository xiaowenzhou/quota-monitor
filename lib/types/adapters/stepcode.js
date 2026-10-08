/**
 * The StepCode / AgentRouter desk account adapter.
 *
 * One guarded GET against `{origin}/desk/v1/stepcode/user/info` answers with an
 * account summary plus one row per budget pool. The endpoint is not a documented
 * public API, so every figure is read from an ordered candidate list: a renamed
 * field degrades one row instead of reporting a wrong number, and a section
 * disclosing only two of used/total/remaining yields the third.
 *
 * This is the protocol the StepCode quota tooling reads; `agent-router` remains
 * the terse reader shipped for the same path, and a deployment that wants the
 * pools, usage share, and billing period picks this adapter by name.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/stepcode
 */
import { QuotaRequestError, requestJson } from "../http.js";
import { arrayUnder, clampPercent, isRecord, objectUnder, pickNumber, pickString, round1, upcomingIso } from "../parse.js";
import { bearer, requireKey } from "./contract.js";
/** Path of the desk account endpoint, relative to the gateway origin. */
const ACCOUNT_PATH = '/desk/v1/stepcode/user/info';
/** Key spellings probed for one section's spend. */
const USED_KEYS = ['used', 'used_quota', 'usage', 'consumed'];
/** Key spellings probed for one section's allowance. */
const TOTAL_KEYS = ['total', 'total_quota', 'quota', 'limit', 'budget_limit', 'binding_quota_limit'];
/** Key spellings probed for one section's remainder. */
const REMAINING_KEYS = ['remaining', 'remaining_quota', 'remain_quota', 'balance', 'available'];
/** Key spellings probed for a budget pool's label. */
const POOL_NAME_KEYS = ['pool_name', 'name', 'channel_name', 'title', 'pool_uid', 'id'];
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
 * The StepCode desk account: an account summary, its budget pools, and the
 * billing period the summary is metered over.
 *
 * The desk API is served beside the inference API, so this adapter addresses
 * the base URL's origin rather than the base URL itself.
 */
export const stepcode = {
    id: 'stepcode',
    async read(context) {
        const key = await requireKey(context);
        const body = await requestJson(bearer(`${originOf(context)}${ACCOUNT_PATH}`, key, context));
        assertEnvelope(body);
        const now = context.now();
        const account = readAmounts(objectUnder(body, 'usage_summary'));
        const pools = [];
        for (const row of arrayUnder(body, 'budget_pool_usages') ?? []) {
            const amounts = readAmounts(row);
            if (amounts === undefined)
                continue;
            pools.push({
                name: pickString(row, POOL_NAME_KEYS) ?? `#${pools.length + 1}`,
                remaining: amounts.remaining,
                ...amounts.limit === undefined ? {} : { limit: amounts.limit },
                ...amounts.percentUsed === undefined ? {} : { percentUsed: amounts.percentUsed },
            });
        }
        if (account === undefined && pools.length === 0) {
            throw new QuotaRequestError('invalid-response', 'StepCode desk response has no usable figures');
        }
        // The summary's own billing period, when it states both a share and an end.
        const resetAt = upcomingIso(account?.periodEnd, now);
        const billing = account?.percentUsed === undefined || resetAt === undefined
            ? []
            : [{ kind: 'billing', percentUsed: account.percentUsed, resetAt }];
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
        };
    },
};
//# sourceMappingURL=stepcode.js.map