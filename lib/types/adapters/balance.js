/**
 * Balance adapters: accounts that meter money or credits.
 *
 * Each adapter owns one provider's endpoint and response grammar. A gateway
 * that answers in an unrecognized shape raises `invalid-response` rather than
 * reporting a zero balance.
 * @module @deepseek-ai/dsh-extension-quota-monitor/adapters/balance
 */
import { QuotaRequestError, requestJson } from "../http.js";
import { arrayUnder, findNumber, isRecord, numberOf, objectUnder, pickNumber, pickString, clampPercent, round1, } from "../parse.js";
import { bearer, requireKey } from "./contract.js";
import { sub2api, sub2apiAuth } from "./sub2api.js";
import { stepcode } from "./stepcode.js";
/**
 * OrcaRouter's OpenAI-compatible billing fallback reports an unmetered
 * allowance with this sentinel in all three limit fields.
 */
const ORCA_UNLIMITED_SENTINEL = 100_000_000;
/** The origin (or configured override) an adapter addresses. */
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
 * DeepSeek official user balance: `{ balance_infos: [{ total_balance, currency }] }`.
 * A CNY entry is preferred because that is the account's settlement currency.
 */
export const deepseekBalance = {
    id: 'deepseek-balance',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const body = await requestJson(bearer(`${originOf(context)}/user/balance`, key, context));
        const raw = isRecord(body) ? body['balance_infos'] : undefined;
        const infos = Array.isArray(raw) ? raw : undefined;
        if (infos === undefined || infos.length === 0) {
            throw new QuotaRequestError('invalid-response', 'DeepSeek balance response carries no balance_infos');
        }
        const info = infos.find(entry => pickString(entry, ['currency']) === 'CNY') ?? infos[0];
        const total = pickNumber(info, ['total_balance']);
        if (total === undefined) {
            throw new QuotaRequestError('invalid-response', 'DeepSeek balance entry has no total_balance');
        }
        return {
            remaining: total,
            currency: pickString(info, ['currency']) ?? 'CNY',
        };
    },
};
/**
 * OpenRouter account credits: `/api/v1/credits`, remaining is
 * `total_credits - total_usage`.
 *
 * The endpoint requires a Management Key, so this adapter reads its own
 * credential reference rather than the inference key — `/api/v1/key` would
 * only describe one key's spending limit, which is not an account balance.
 */
export const openrouterBalance = {
    id: 'openrouter-balance',
    credentialRefs: ['OPENROUTER_MANAGEMENT_KEY'],
    async read(context) {
        const key = await requireKey(context, context.credentialRef ?? 'OPENROUTER_MANAGEMENT_KEY');
        const body = await requestJson(bearer(`${originOf(context)}/api/v1/credits`, key, context));
        const data = isRecord(body) && isRecord(body['data']) ? body['data'] : undefined;
        const limit = pickNumber(data, ['total_credits']);
        const used = pickNumber(data, ['total_usage']);
        if (limit === undefined || used === undefined) {
            throw new QuotaRequestError('invalid-response', 'OpenRouter credits response has no numeric totals');
        }
        return { remaining: limit - used, used, limit, currency: 'USD' };
    },
};
/** Moonshot / Kimi API balance: `/v1/users/me/balance`. */
export const moonshotBalance = {
    id: 'moonshot-balance',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const body = await requestJson(bearer(`${originOf(context)}/v1/users/me/balance`, key, context));
        const data = isRecord(body) && isRecord(body['data']) ? body['data'] : undefined;
        const available = pickNumber(data, ['available_balance']);
        if (available === undefined) {
            throw new QuotaRequestError('invalid-response', 'Moonshot balance response has no available_balance');
        }
        return {
            remaining: available,
            currency: pickString(data, ['currency']) ?? 'CNY',
        };
    },
};
/** Z.ai / GLM open-platform balance: `/api/paas/v4/balance`. */
export const zaiBalance = {
    id: 'zai-balance',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const body = await requestJson(bearer(`${originOf(context)}/api/paas/v4/balance`, key, context));
        const data = isRecord(body) && isRecord(body['data']) ? body['data'] : undefined;
        const total = pickNumber(data, ['total_balance', 'available_balance']);
        if (total === undefined) {
            throw new QuotaRequestError('invalid-response', 'Z.ai balance response has no numeric balance');
        }
        return {
            remaining: total,
            currency: pickString(data, ['currency']) ?? 'CNY',
        };
    },
};
/** Sum one OrcaRouter credit array, refusing a mixed-currency total. */
function creditTotal(value, currency, label) {
    if (value === undefined || value === null)
        return 0;
    if (!Array.isArray(value)) {
        throw new QuotaRequestError('invalid-response', `OrcaRouter ${label} credits are not a list`);
    }
    let total = 0;
    for (const entry of value) {
        const unit = pickString(entry, ['unit'])?.toUpperCase() ?? currency;
        if (unit !== currency) {
            throw new QuotaRequestError('invalid-response', `OrcaRouter ${label} credits mix currencies`);
        }
        const amount = pickNumber(entry, ['balance_usd', 'balance']);
        if (amount === undefined || amount < 0) {
            throw new QuotaRequestError('invalid-response', `OrcaRouter ${label} credits have no numeric balance`);
        }
        total += amount;
    }
    return total;
}
/** The `/v1`-prefixed billing path OrcaRouter serves, preserving a configured path prefix. */
function orcaBillingUrl(baseURL, path) {
    const base = new URL(baseURL);
    const pathname = base.pathname.replace(/\/+$/, '');
    const prefix = pathname === '' ? '/v1' : pathname.endsWith('/v1') ? pathname : `${pathname}/v1`;
    return new URL(`${prefix}${path}`, base.origin).href;
}
/**
 * OrcaRouter: the wallet endpoint first, then the documented
 * OpenAI-compatible billing pair for deployments that predate it.
 */
export const orcarouterBalance = {
    id: 'orcarouter-balance',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const base = context.usageBaseURL ?? context.baseURL;
        if (base === undefined || base === '') {
            throw new QuotaRequestError('not-configured', 'provider has no configured base URL');
        }
        try {
            const wallet = await requestJson(bearer(orcaBillingUrl(base, '/balance'), key, context));
            return readOrcaWallet(wallet);
        }
        catch (error) {
            // Only a missing route means this deployment predates the wallet
            // endpoint; every other failure is a real answer about the account.
            if (!(error instanceof QuotaRequestError) || error.status !== 'unsupported')
                throw error;
        }
        const subscription = await requestJson(bearer(orcaBillingUrl(base, '/dashboard/billing/subscription'), key, context));
        const usage = await requestJson(bearer(orcaBillingUrl(base, '/dashboard/billing/usage'), key, context));
        return readOrcaBilling(subscription, usage);
    },
};
/** Read the OrcaRouter wallet: paid plus free plus promo credits. */
function readOrcaWallet(body) {
    const currency = pickString(body, ['unit'])?.toUpperCase();
    if (currency === undefined) {
        throw new QuotaRequestError('invalid-response', 'OrcaRouter wallet response has no currency');
    }
    const paid = pickNumber(body, ['paid_balance']);
    if (paid === undefined || paid < 0) {
        throw new QuotaRequestError('invalid-response', 'OrcaRouter wallet response has no paid balance');
    }
    const record = isRecord(body) ? body : {};
    const remaining = paid
        + creditTotal(record['free_credit'], currency, 'free')
        + creditTotal(record['promo_credits'], currency, 'promo');
    return { remaining, currency };
}
/** Read the OpenAI-compatible billing pair; dashboard usage arrives in cents. */
function readOrcaBilling(subscription, usage) {
    const limit = pickNumber(subscription, ['hard_limit_usd', 'soft_limit_usd']);
    const usedCents = pickNumber(usage, ['total_usage']);
    if (limit === undefined || usedCents === undefined || limit < 0 || usedCents < 0) {
        throw new QuotaRequestError('invalid-response', 'OrcaRouter billing response has no numeric quota');
    }
    const used = usedCents / 100;
    const unlimited = limit === ORCA_UNLIMITED_SENTINEL
        && pickNumber(subscription, ['soft_limit_usd']) === limit
        && pickNumber(subscription, ['system_hard_limit_usd']) === limit;
    return {
        remaining: unlimited ? limit : limit - used,
        used,
        currency: 'USD',
        ...unlimited ? { unlimited: true } : { limit },
    };
}
/**
 * Quota units per currency unit assumed by a new-api deployment that serves no
 * `/api/status`, which is what every release before the field published used.
 */
const NEW_API_LEGACY_QUOTA_PER_UNIT = 500_000;
/**
 * How this deployment denominates quota, read from its own status document.
 *
 * A deployment that serves no status route keeps the legacy assumption. A
 * deployment that displays a currency this build cannot convert is reported as
 * unsupported rather than shown under the wrong unit.
 */
async function newApiQuotaUnit(origin, context) {
    let body;
    try {
        body = await requestJson({
            url: `${origin}/api/status`,
            auth: 'none',
            ...context.fetchImpl === undefined ? {} : { fetchImpl: context.fetchImpl },
        });
    }
    catch (error) {
        if (!(error instanceof QuotaRequestError) || error.status !== 'unsupported')
            throw error;
        return { perUnit: NEW_API_LEGACY_QUOTA_PER_UNIT, currency: 'USD', rate: 1 };
    }
    const data = isRecord(body) && isRecord(body['data']) ? body['data'] : body;
    const declared = pickNumber(data, ['quota_per_unit']);
    const perUnit = declared !== undefined && declared > 0 ? declared : NEW_API_LEGACY_QUOTA_PER_UNIT;
    const display = (pickString(data, ['quota_display_type']) ?? 'USD').toUpperCase();
    if (display === 'USD')
        return { perUnit, currency: 'USD', rate: 1 };
    if (display !== 'CNY') {
        throw new QuotaRequestError('unsupported', `new-api displays quota in unsupported unit ${display}`);
    }
    const rate = pickNumber(data, ['usd_exchange_rate']);
    if (rate === undefined || rate <= 0) {
        throw new QuotaRequestError('invalid-response', 'new-api reports CNY display without an exchange rate');
    }
    return { perUnit, currency: 'CNY', rate };
}
/**
 * new-api: the per-token usage endpoint first, then the legacy self endpoint,
 * with the deployment's own quota denomination applied to both.
 */
export const newApi = {
    id: 'new-api',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const origin = originOf(context);
        const [body, unit] = await Promise.all([
            (async () => {
                try {
                    return await requestJson(bearer(`${origin}/api/usage/token/`, key, context));
                }
                catch (error) {
                    if (!(error instanceof QuotaRequestError) || error.status !== 'unsupported')
                        throw error;
                    return await requestJson(bearer(`${origin}/api/user/self`, key, context));
                }
            })(),
            newApiQuotaUnit(origin, context),
        ]);
        const data = isRecord(body) && isRecord(body['data']) ? body['data'] : body;
        const amount = (raw) => (raw / unit.perUnit) * unit.rate;
        const unlimited = isRecord(data) ? data['unlimited_quota'] : undefined;
        if (unlimited === true || unlimited === 1 || unlimited === 'true' || unlimited === '1') {
            return { unlimited: true, remaining: 0, currency: unit.currency };
        }
        const quota = pickNumber(data, ['quota', 'remain_quota', 'remaining_quota', 'total_available']);
        if (quota === undefined) {
            throw new QuotaRequestError('invalid-response', 'new-api response has no quota figure');
        }
        const used = pickNumber(data, ['used_quota', 'total_used']);
        const granted = pickNumber(data, ['total_granted']);
        const plan = pickString(data, ['name', 'group']);
        return {
            remaining: amount(quota),
            currency: unit.currency,
            ...used === undefined ? {} : { used: amount(used) },
            ...granted === undefined ? {} : { limit: amount(granted) },
            ...plan === undefined ? {} : { plan },
        };
    },
};
/** Keys probed for a dashboard's remaining/total/used figures. */
const REMAINING_KEYS = ['remaining', 'remain', 'remaining_quota', 'quota_remaining', 'balance', 'credits'];
const TOTAL_KEYS = ['total_quota', 'quota', 'total', 'limit'];
const USED_KEYS = ['used_quota', 'used', 'usage'];
/** Read a dashboard body, or `undefined` when it discloses no usable figure. */
function readDashboard(body) {
    const remaining = findNumber(body, REMAINING_KEYS);
    const limit = findNumber(body, TOTAL_KEYS);
    const used = findNumber(body, USED_KEYS);
    if (remaining === undefined && limit === undefined)
        return undefined;
    const left = remaining ?? Math.max(0, (limit ?? 0) - (used ?? 0));
    return {
        remaining: left,
        currency: pickString(body, ['unit', 'currency']) ?? 'credits',
        ...used === undefined ? {} : { used },
        ...limit === undefined ? {} : { limit },
    };
}
/** Keys probed for an AgentRouter section's remaining/limit/used figures. */
const POOL_REMAINING_KEYS = ['remaining', 'remaining_quota', 'remain_quota', 'balance', 'available'];
const POOL_LIMIT_KEYS = ['limit', 'total', 'total_quota', 'quota', 'budget', 'budget_limit'];
const POOL_USED_KEYS = ['used', 'used_quota', 'usage', 'consumed'];
const POOL_NAME_KEYS = ['name', 'pool_name', 'budget_pool_name', 'title', 'id', 'pool_id'];
/**
 * Read a section's remaining figure and, when an allowance is disclosed, its
 * used share. A section disclosing only a limit and a used figure yields the
 * difference, so either side alone still produces a row.
 */
function readAmounts(section) {
    const remaining = pickNumber(section, POOL_REMAINING_KEYS);
    const limit = pickNumber(section, POOL_LIMIT_KEYS);
    const used = pickNumber(section, POOL_USED_KEYS);
    if (remaining === undefined && limit === undefined)
        return undefined;
    const left = remaining ?? Math.max(0, (limit ?? 0) - (used ?? 0));
    return {
        remaining: left,
        ...limit === undefined ? {} : { limit },
        ...limit === undefined || limit <= 0
            ? {}
            : { percentUsed: round1(clampPercent(((limit - left) / limit) * 100) ?? 0) },
    };
}
/**
 * AgentRouter desk account: an account summary plus one row per budget pool.
 *
 * The desk API is served beside the inference API, so this adapter addresses
 * the base URL's origin rather than the base URL itself. The endpoint
 * discloses no unit, so its figures keep the neutral `credits` label.
 */
export const agentRouter = {
    id: 'agent-router',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const url = `${originOf(context)}/desk/v1/stepcode/user/info`;
        const body = await requestJson(bearer(url, key, context));
        const summary = objectUnder(body, 'usage_summary');
        const pools = [];
        for (const row of arrayUnder(body, 'budget_pool_usages') ?? []) {
            const amounts = readAmounts(row);
            if (amounts === undefined)
                continue;
            pools.push({ name: pickString(row, POOL_NAME_KEYS) ?? `#${pools.length + 1}`, ...amounts });
        }
        const account = readAmounts(summary);
        if (account === undefined && pools.length === 0) {
            throw new QuotaRequestError('invalid-response', 'AgentRouter account response has no usable figures');
        }
        const remaining = account?.remaining ?? pools.reduce((total, pool) => total + pool.remaining, 0);
        return {
            remaining,
            currency: 'credits',
            ...account?.limit === undefined ? {} : { limit: account.limit },
            ...pools.length === 0 ? {} : { budgetPools: Object.freeze(pools) },
        };
    },
};
/**
 * The CC Switch-style general template: `GET {baseURL}/user/balance` with the
 * provider's own inference key, reading `body.balance`.
 */
export const general = {
    id: 'general',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const body = await requestJson(bearer(`${originOf(context)}/user/balance`, key, context));
        const reading = readDashboard(body) ?? readDashboard(isRecord(body) ? body['data'] : undefined);
        if (reading === undefined) {
            throw new QuotaRequestError('invalid-response', 'general balance response carries no balance figure');
        }
        return reading;
    },
};
/** Every balance adapter, keyed for registry assembly. */
export const BALANCE_ADAPTERS = Object.freeze([
    deepseekBalance,
    openrouterBalance,
    moonshotBalance,
    zaiBalance,
    orcarouterBalance,
    newApi,
    sub2api,
    sub2apiAuth,
    agentRouter,
    stepcode,
    general,
]);
/** Re-exported for the declarative adapter, which shares the numeric coercion. */
export { numberOf };
//# sourceMappingURL=balance.js.map