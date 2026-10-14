/** Command Code subscription endpoints, verified against shxtmaker/dsh-token-quota.
 * No plan-price table: a monthly percentage requires a total disclosed by the API. */
import { QuotaRequestError, requestJson } from "../http.js";
import { isRecord, pickNumber, pickString, clampPercent, upcomingIso } from "../parse.js";
import { bearer, requireKey } from "./contract.js";
export const commandCode = {
    id: 'command-code',
    async read(context) {
        const key = await requireKey(context, context.credentialRef);
        const origin = new URL(context.usageBaseURL ?? context.baseURL ?? 'https://api.commandcode.ai').origin;
        const get = (path) => requestJson(bearer(`${origin}${path}`, key, context));
        const who = await get('/alpha/whoami');
        const org = isRecord(who) && isRecord(who.org) ? who.org : undefined;
        const user = isRecord(who) && isRecord(who.user) ? who.user : who;
        const orgId = pickString(org, ['id']);
        const query = orgId === undefined ? '' : `?orgId=${encodeURIComponent(orgId)}`;
        const body = await get(`/alpha/billing/credits${query}`);
        const credits = isRecord(body) && isRecord(body.credits) ? body.credits : undefined;
        const limits = isRecord(body) && isRecord(body.windowLimits) ? body.windowLimits : undefined;
        const windows = [];
        const now = context.now();
        for (const [field, kind] of [['fiveHour', 'five-hour'], ['weekly', 'weekly']]) {
            const row = limits?.[field];
            const cap = pickNumber(row, ['cap', 'limit']);
            const remaining = pickNumber(row, ['remaining']);
            const used = pickNumber(row, ['used']) ?? (cap !== undefined && remaining !== undefined ? Math.max(0, cap - remaining) : undefined);
            if (cap === undefined || cap <= 0 || used === undefined)
                continue;
            const percentUsed = clampPercent(used / cap * 100);
            if (percentUsed === undefined)
                continue;
            const resetAt = upcomingIso(isRecord(row) ? row.resetAt ?? row.reset : undefined, now);
            windows.push({ kind, percentUsed, remaining: Math.max(0, cap - used), ...resetAt ? { resetAt } : {} });
        }
        const remaining = pickNumber(credits, ['monthlyCredits']);
        const total = pickNumber(credits, ['monthlyLimit', 'monthlyCreditsLimit']);
        if (remaining !== undefined && total !== undefined && total > 0) {
            let resetAt;
            try {
                const subscription = await get(`/alpha/billing/subscriptions${query}`);
                const data = isRecord(subscription) ? subscription.data : undefined;
                resetAt = upcomingIso(isRecord(data) ? data.currentPeriodEnd : undefined, now);
            }
            catch (error) {
                if (!(error instanceof QuotaRequestError) || error.status !== 'unsupported')
                    throw error;
            }
            windows.push({ kind: 'monthly', percentUsed: Math.min(100, Math.max(0, (total - remaining) / total * 100)), remaining,
                ...resetAt ? { resetAt } : {} });
        }
        if (!windows.length && remaining === undefined)
            throw new QuotaRequestError('invalid-response', 'Command Code response has no usable quota');
        const accountName = pickString(user, ['name', 'email', 'id']) ?? pickString(org, ['name', 'id']);
        const planId = pickString(credits, ['planId']);
        return { plan: planId === 'individual-goat' ? 'GOAT' : planId ?? 'Command Code', planWindows: windows,
            ...remaining === undefined ? {} : { remaining, currency: 'USD' }, ...accountName ? { accountName } : {} };
    },
};
//# sourceMappingURL=command.js.map