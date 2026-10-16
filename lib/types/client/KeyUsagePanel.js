import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The per-key usage page: one card per monitored credential, carrying the
 * allowance that key's own account endpoint reported and the token detail its
 * own usage endpoint reported. Opening a card shows that key's billing period,
 * token split, per-model share, and daily series.
 *
 * A model request names a provider route and never the key that served it, so
 * this page is the only place a per-key figure can come from: every number here
 * was read with that key's own credential. The page derives presentation only —
 * it never folds a key's traffic out of this process's own counters, which
 * cannot attribute a call to a key at all.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/KeyUsagePanel
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fmtAmount, fmtNumber, fmtPercent, fmtTime, fmtTokens, initialsOf } from "./format.js";
import css from './KeyUsage.module.css';
/**
 * Join class names, dropping the ones a CSS module lookup could not resolve.
 *
 * `noUncheckedIndexedAccess` types every `css.foo` as `string | undefined`, so a
 * bare lookup cannot be returned as a `string` and an interpolated one would
 * render the literal text `undefined` into the class attribute.
 * @param names - class names in source order.
 * @returns the resolved names, space separated.
 */
function cls(...names) {
    return names.filter(name => name !== undefined).join(' ');
}
/** Account status → the copy key stating it. */
const STATUS_KEYS = {
    'ok': 'status.ok',
    'not-configured': 'status.notConfigured',
    'unauthorized': 'status.unauthorized',
    'rate-limited': 'status.rateLimited',
    'unsupported': 'status.unsupported',
    'invalid-response': 'status.invalidResponse',
    'blocked': 'status.blocked',
    'unavailable': 'status.unavailable',
};
/** Plan-window kind → the copy key naming it. */
const WINDOW_KEYS = {
    'session': 'window.session',
    'five-hour': 'window.fiveHour',
    'daily': 'window.daily',
    'weekly': 'window.weekly',
    'monthly': 'window.monthly',
    'billing': 'window.billing',
    'quota': 'window.quota',
};
/**
 * The four metered buckets, in the order the split bar and its legend draw them.
 *
 * The segment class doubles as the legend swatch: both set nothing but the
 * background, so one list keeps the bar and its key from drifting apart.
 */
const SPLIT_SEGMENTS = [
    { field: 'inputTokens', label: 'usage.input', className: cls(css.segInput) },
    { field: 'outputTokens', label: 'usage.output', className: cls(css.segOutput) },
    { field: 'cacheWriteTokens', label: 'usage.cacheWrite', className: cls(css.segCacheWrite) },
    { field: 'cacheReadTokens', label: 'usage.cacheRead', className: cls(css.segCacheRead) },
];
/**
 * The credentials a route is read with.
 *
 * A route naming no credential still has one slot: its own profile key, which
 * is what the account endpoint answers about.
 * @param entry - the provider entry.
 * @returns one reference per slot, `undefined` for the route's own key.
 */
function refsOf(entry) {
    return entry.credentialRefs.length > 0 ? entry.credentialRefs : [undefined];
}
/**
 * A readable label for a credential reference that carries no user name.
 * @param ref - the credential reference.
 * @returns its distinctive part, trimmed for a card.
 */
function shortRef(ref) {
    const stripped = ref.startsWith('QUOTA_KEY_') ? ref.slice('QUOTA_KEY_'.length) : ref;
    return stripped.length > 14 ? `${stripped.slice(0, 14)}…` : stripped;
}
/**
 * The four token buckets behind one reading, from the usage window when that
 * endpoint answered and from the billing period otherwise.
 *
 * A section that metered nothing yields nothing, so a card states the absence
 * rather than drawing four zeros.
 * @param usage - the reading's per-key detail.
 * @returns the buckets, or `undefined` when no section disclosed them.
 */
function splitOf(usage) {
    const source = usage?.window ?? usage?.period;
    if (source === undefined)
        return undefined;
    if (source.inputTokens === undefined && source.outputTokens === undefined && source.totalTokens === undefined) {
        return undefined;
    }
    const inputTokens = source.inputTokens ?? 0;
    const outputTokens = source.outputTokens ?? 0;
    const cacheReadTokens = source.cacheReadTokens ?? 0;
    const cacheWriteTokens = source.cacheWriteTokens ?? 0;
    return {
        inputTokens,
        outputTokens,
        reasoningTokens: source.reasoningTokens ?? 0,
        cacheReadTokens,
        cacheWriteTokens,
        // Reasoning is already counted inside output, so it is shown but not added.
        totalTokens: source.totalTokens ?? inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens,
    };
}
/**
 * A key's own price and cache mix for the billing period it is billed on.
 *
 * The spend figure and the token figure must come from the SAME window or the
 * two cannot be divided: over 30 days a key can burn ten times the tokens it
 * burned this month, so `rate` reads the period only and stays comparable with
 * the used amount beside it. A key that metered no period tokens yields
 * nothing, and a card then states the absence instead of a bogus rate.
 * @param account - one key's account reading.
 * @returns the amount per million tokens and the cache-read share, each optional.
 */
function rateOf(account) {
    const period = account?.keyUsage?.period;
    const tokens = period?.totalTokens ?? 0;
    if (tokens <= 0)
        return { rate: undefined, cacheShare: undefined };
    const used = period?.used ?? account?.used;
    return {
        rate: used === undefined ? undefined : used / (tokens / 1e6),
        cacheShare: period?.cacheReadTokens === undefined
            ? undefined
            : (period.cacheReadTokens / tokens) * 100,
    };
}
/**
 * Percent of a limit consumed, capped at 100.
 * @param used - amount consumed.
 * @param limit - the cap.
 * @returns the percentage, or `undefined` when either side is unknown.
 */
function percentOf(used, limit) {
    if (used === undefined || limit === undefined || limit <= 0)
        return undefined;
    return Math.min(100, (used / limit) * 100);
}
/** The header's mark: a key, matching the rail entry that opens this page. */
function KeyGlyph() {
    return _jsxs("svg", { className: css.brandGlyph, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [_jsx("circle", { cx: "7.5", cy: "16.5", r: "4" }), _jsx("path", { d: "M10.4 13.6 20 4" }), _jsx("path", { d: "M16.5 7.5 19 10" }), _jsx("path", { d: "M13.5 10.5 16 13" })] });
}
/**
 * The severity class of a key card's status dot.
 * @param account - the reading behind the card, if any.
 * @returns the dot's class names.
 */
function dotClass(account) {
    if (account === undefined)
        return cls(css.cardDot);
    if (account.status !== 'ok' || account.warning === 'critical')
        return cls(css.cardDot, css.cardDotBad);
    if (account.warning === 'warning')
        return cls(css.cardDot, css.cardDotWarn);
    return cls(css.cardDot, css.cardDotOk);
}
/**
 * The severity class of an allowance bar's fill.
 * @param warning - the reading's warning level.
 * @returns the fill's class names.
 */
function fillClass(warning) {
    if (warning === 'critical')
        return cls(css.barFill, css.barFillCritical);
    if (warning === 'warning')
        return cls(css.barFill, css.barFillWarn);
    return cls(css.barFill);
}
/** One legend row of the token split. */
function LegendRow({ label, value, share, swatchClass }) {
    return _jsxs("li", { className: css.legendItem, children: [_jsx("span", { className: cls(css.legendSwatch, swatchClass), "aria-hidden": "true" }), _jsx("span", { className: css.legendLabel, children: label }), _jsx("span", { className: css.legendValue, children: value }), _jsx("span", { className: css.legendShare, children: share })] });
}
export function KeyUsagePanel({ t, quota, subscribeProviders }) {
    const [snapshot, setSnapshot] = useState();
    const [provider, setProvider] = useState();
    /** Credential reference of the key whose detail is open. */
    const [selectedRef, setSelectedRef] = useState();
    /** True once a card has been opened, so the route's own key can be named. */
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState();
    const [busy, setBusy] = useState(false);
    /** Generation counter: a later request makes an earlier answer stale. */
    const requests = useRef(0);
    useEffect(() => () => { requests.current++; }, []);
    const applySnapshot = useCallback((value) => {
        setSnapshot(value);
        setProvider(current => {
            if (current !== undefined && value.providers.some(entry => entry.id === current))
                return current;
            // Open on a route that actually monitors keys, so the page starts on the
            // subject it exists for rather than on an unrelated first route.
            return value.providers.find(entry => entry.credentialRefs.length > 0)?.id ?? value.providers[0]?.id;
        });
    }, []);
    /**
     * Open the page: read every monitored credential no round has taken yet and
     * adopt the snapshot that answers. One round trip states every key.
     */
    const loadPending = useCallback(async () => {
        const request = ++requests.current;
        const result = await quota.readPendingAccounts();
        if (!result.ok || request !== requests.current)
            return;
        applySnapshot(result.value);
    }, [quota, applySnapshot]);
    const loadSnapshot = useCallback(async () => {
        const request = ++requests.current;
        const result = await quota.getSnapshot();
        if (!result.ok || request !== requests.current)
            return;
        applySnapshot(result.value);
    }, [quota, applySnapshot]);
    useEffect(() => { void loadPending(); }, [loadPending]);
    useEffect(() => subscribeProviders?.(() => { void loadSnapshot(); }), [subscribeProviders, loadSnapshot]);
    const refresh = useCallback(async () => {
        setBusy(true);
        try {
            const request = ++requests.current;
            const result = await quota.refreshAccounts();
            if (result.ok && request === requests.current)
                applySnapshot(result.value);
        }
        finally {
            setBusy(false);
        }
    }, [quota, applySnapshot]);
    const providers = snapshot?.providers ?? [];
    const entry = useMemo(() => providers.find(candidate => candidate.id === provider), [providers, provider]);
    const rows = useMemo(() => {
        if (entry === undefined)
            return [];
        return refsOf(entry).map(ref => {
            const account = entry.accounts.find(candidate => candidate.credentialRef === ref);
            const name = (ref === undefined ? undefined : entry.keyNames?.[ref])
                ?? account?.keyName
                ?? account?.accountName
                ?? (ref === undefined ? t('keypage.identity.default') : shortRef(ref));
            return { ref, name, account, active: ref !== undefined && ref === entry.activeCredentialRef };
        });
    }, [entry, t]);
    const totals = useMemo(() => {
        let used = 0;
        let usedSeen = false;
        let calls = 0;
        let callsSeen = false;
        let tokens = 0;
        let tokensSeen = false;
        let periodTokens = 0;
        let periodSeen = false;
        let periodUsed = 0;
        let periodUsedSeen = false;
        let ok = 0;
        let currency;
        for (const row of rows) {
            const account = row.account;
            if (account?.status === 'ok')
                ok++;
            currency ??= account?.currency;
            if (account?.used !== undefined) {
                used += account.used;
                usedSeen = true;
            }
            const usage = account?.keyUsage;
            const rowCalls = usage?.window?.calls ?? usage?.period?.calls;
            if (rowCalls !== undefined) {
                calls += rowCalls;
                callsSeen = true;
            }
            const rowTokens = splitOf(usage)?.totalTokens;
            if (rowTokens !== undefined) {
                tokens += rowTokens;
                tokensSeen = true;
            }
            const rowPeriodTokens = usage?.period?.totalTokens;
            if (rowPeriodTokens !== undefined && rowPeriodTokens > 0) {
                periodTokens += rowPeriodTokens;
                periodSeen = true;
                // The rate below divides this key's tokens by this key's own money.
                const rowPeriodUsed = usage?.period?.used ?? account?.used;
                if (rowPeriodUsed !== undefined) {
                    periodUsed += rowPeriodUsed;
                    periodUsedSeen = true;
                }
            }
        }
        return {
            used, usedSeen, calls, callsSeen, tokens, tokensSeen,
            periodTokens, periodSeen, periodUsed, periodUsedSeen, ok, currency, count: rows.length,
        };
    }, [rows]);
    /** The window every key's series covers; the endpoint answers one per read. */
    const days = rows.find(row => row.account?.keyUsage !== undefined)?.account?.keyUsage?.days ?? 0;
    /**
     * The blended price of the very period the spend tile states, so both agree.
     *
     * It covers the keys that reported period tokens, which on a metered provider
     * is every key; a key that disclosed no period simply does not contribute.
     */
    const periodRate = totals.periodSeen && totals.periodUsedSeen && totals.periodTokens > 0
        ? totals.periodUsed / (totals.periodTokens / 1e6)
        : undefined;
    /**
     * The spend tile's second line: the period's own tokens, plus the price they
     * work out to. A provider that metered no period keeps the window note.
     */
    const spendNote = totals.periodSeen
        ? [
            t('keypage.tile.periodTokens', { tokens: fmtTokens(totals.periodTokens) }),
            periodRate === undefined
                ? ''
                : t('keypage.key.rateShort', { amount: fmtAmount(periodRate, totals.currency) }),
        ].filter(part => part !== '').join(' · ')
        : days > 0 ? t('keypage.tile.windowNote', { days: String(days) }) : '';
    const selected = useMemo(() => rows.find(row => row.ref === selectedRef), [rows, selectedRef]);
    const account = selected?.account;
    const usage = account?.keyUsage;
    const split = useMemo(() => splitOf(usage), [usage]);
    const daily = useMemo(() => [...usage?.daily ?? []].sort((left, right) => left.date < right.date ? -1 : left.date > right.date ? 1 : 0), [usage]);
    const maxDaily = useMemo(() => daily.reduce((peak, day) => Math.max(peak, day.totalTokens), 0), [daily]);
    const models = useMemo(() => [...usage?.models ?? []].sort((left, right) => right.totalTokens - left.totalTokens), [usage]);
    const maxModel = models[0]?.totalTokens ?? 0;
    const dayPoints = useMemo(() => (selectedDay === undefined
        ? []
        : [...usage?.points ?? []].filter(point => point.date === selectedDay))
        .sort((left, right) => right.totalTokens - left.totalTokens), [usage, selectedDay]);
    const openKey = useCallback((ref) => {
        setSelectedRef(ref);
        setDetailOpen(true);
        setSelectedDay(undefined);
    }, []);
    const closeDetail = useCallback(() => {
        setDetailOpen(false);
        setSelectedRef(undefined);
        setSelectedDay(undefined);
    }, []);
    const statusOf = useCallback((value) => t(STATUS_KEYS[value?.status ?? 'unsupported']), [t]);
    const reason = account?.reason;
    return _jsxs("div", { className: css.page, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { className: css.brand, children: [_jsx("span", { className: css.brandMark, children: _jsx(KeyGlyph, {}) }), _jsxs("div", { children: [_jsx("h1", { className: css.title, children: t('keypage.title') }), _jsx("p", { className: css.subtitle, children: t('keypage.subtitle') })] })] }), _jsx("div", { className: css.actions, children: _jsx("button", { type: "button", className: `${css.action} ${css.actionPrimary}`, onClick: () => void refresh(), disabled: busy, children: busy ? t('action.refreshing') : t('action.refresh') }) })] }), providers.length === 0
                ? _jsx("p", { className: css.empty, children: t('account.empty') })
                : _jsxs(_Fragment, { children: [_jsx("div", { className: css.scope, role: "group", "aria-label": t('keypage.scope'), children: providers.map(candidate => {
                                const tone = candidate.status !== 'ok'
                                    ? css.scopeDotBad
                                    : candidate.warning === undefined ? css.scopeDot : css.scopeDotWarn;
                                return _jsxs("button", { type: "button", className: `${css.scopeChip} ${candidate.id === provider ? css.scopeChipActive : ''}`, "aria-pressed": candidate.id === provider, onClick: () => {
                                        setProvider(candidate.id);
                                        closeDetail();
                                    }, children: [_jsx("span", { className: `${css.scopeDot} ${tone}`, "aria-hidden": "true" }), candidate.name, _jsx("span", { className: css.scopeCount, children: refsOf(candidate).length })] }, candidate.id);
                            }) }), _jsxs("div", { className: css.tiles, children: [_jsxs("div", { className: css.tile, children: [_jsx("span", { className: css.tileLabel, children: t('keypage.tile.used') }), _jsx("span", { className: css.tileValue, children: totals.usedSeen ? fmtAmount(totals.used, totals.currency) : '—' }), _jsx("span", { className: css.tileNote, children: spendNote })] }), _jsxs("div", { className: css.tile, children: [_jsx("span", { className: css.tileLabel, children: t('keypage.tile.calls') }), _jsx("span", { className: css.tileValue, children: totals.callsSeen ? fmtNumber(totals.calls) : '—' }), _jsx("span", { className: css.tileNote, children: days > 0 ? t('keypage.tile.windowNote', { days: String(days) }) : '' })] }), _jsxs("div", { className: css.tile, children: [_jsx("span", { className: css.tileLabel, children: t('keypage.tile.tokens') }), _jsx("span", { className: css.tileValue, children: totals.tokensSeen ? fmtTokens(totals.tokens) : '—' }), _jsx("span", { className: css.tileNote, children: days > 0 ? t('keypage.tile.windowNote', { days: String(days) }) : '' })] }), _jsxs("div", { className: css.tile, children: [_jsx("span", { className: css.tileLabel, children: t('keypage.tile.keys') }), _jsx("span", { className: css.tileValue, children: fmtNumber(totals.count) }), _jsx("span", { className: css.tileNote, children: t('keypage.tile.keysNote', { ok: String(totals.ok), bad: String(totals.count - totals.ok) }) })] })] }), _jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('keypage.keys.heading') }), _jsx("span", { className: css.sectionMeta, children: t('keypage.keys.hint') })] }), rows.length === 0
                                    ? _jsx("p", { className: css.empty, children: t('keypage.keys.empty') })
                                    : _jsx("div", { className: css.cards, children: rows.map(row => {
                                            const rowAccount = row.account;
                                            const rowUsage = rowAccount?.keyUsage;
                                            const rowSplit = splitOf(rowUsage);
                                            const rowCalls = rowUsage?.window?.calls ?? rowUsage?.period?.calls;
                                            const percent = percentOf(rowAccount?.used, rowAccount?.limit);
                                            const rowRate = rateOf(rowAccount);
                                            const isOpen = detailOpen && row.ref === selectedRef;
                                            return _jsxs("button", { type: "button", className: `${css.card} ${isOpen ? css.cardActive : ''}`, "aria-pressed": isOpen, onClick: () => openKey(row.ref), children: [_jsxs("span", { className: css.cardHead, children: [_jsx("span", { className: dotClass(rowAccount), "aria-hidden": "true" }), _jsx("span", { className: css.cardName, title: row.ref ?? row.name, children: row.name }), row.active
                                                                ? _jsx("span", { className: `${css.cardTag} ${css.cardTagActive}`, children: t('keys.active') })
                                                                : null] }), _jsx("span", { className: css.cardSub, children: rowAccount === undefined
                                                            ? t('keys.unread')
                                                            : [statusOf(rowAccount), rowAccount.accountName].filter(part => part !== undefined).join(' · ') }), _jsxs("span", { className: css.figures, children: [_jsxs("span", { className: css.figure, children: [_jsx("span", { className: css.figureLabel, children: t('account.remaining') }), _jsx("span", { className: css.figureValue, children: rowAccount?.status !== 'ok'
                                                                            ? '—'
                                                                            : rowAccount.unlimited === true
                                                                                ? t('account.unlimited')
                                                                                : fmtAmount(rowAccount.remaining, rowAccount.currency) })] }), _jsxs("span", { className: `${css.figure} ${css.figureRight}`, children: [_jsxs("span", { className: css.figureLabel, children: [t('account.used'), " / ", t('account.limit')] }), _jsxs("span", { className: `${css.figureValue} ${css.figureValueSmall}`, children: [fmtAmount(rowAccount?.used, rowAccount?.currency), ' / ', fmtAmount(rowAccount?.limit, rowAccount?.currency)] })] })] }), _jsx("span", { className: css.bar, children: _jsx("span", { className: fillClass(rowAccount?.warning), style: { width: `${percent ?? 0}%` } }) }), _jsxs("span", { className: css.meta, children: [_jsx("span", { className: css.metaItem, children: t('keypage.key.percent', { percent: fmtPercent(percent) }) }), _jsx("span", { className: css.metaItem, children: rowCalls === undefined ? '—' : t('usage.calls', { calls: fmtNumber(rowCalls) }) }), _jsx("span", { className: css.metaItem, children: t('keypage.key.windowTokens', {
                                                                    days: String(rowUsage?.days ?? days),
                                                                    tokens: fmtTokens(rowSplit?.totalTokens),
                                                                }) }), rowRate.rate === undefined
                                                                ? null
                                                                : _jsx("span", { className: css.metaItem, children: t('keypage.key.rate', { amount: fmtAmount(rowRate.rate, rowAccount?.currency) }) }), rowRate.cacheShare === undefined
                                                                ? null
                                                                : _jsx("span", { className: css.metaItem, children: t('keypage.key.cacheShare', { percent: fmtPercent(rowRate.cacheShare) }) })] }), rowSplit === undefined
                                                        ? _jsx("span", { className: css.note, children: t('keypage.key.noUsage') })
                                                        : null] }, row.ref ?? '\u0000route');
                                        }) })] }), detailOpen && selected !== undefined && account !== undefined
                            ? _jsxs("section", { className: css.detail, children: [_jsxs("div", { className: css.detailHead, children: [_jsxs("div", { className: css.detailIdentity, children: [_jsx("span", { className: css.avatar, "aria-hidden": "true", children: initialsOf(selected.name) }), _jsxs("div", { children: [_jsx("h2", { className: css.detailName, children: selected.name }), _jsx("p", { className: css.detailSub, children: [entry?.name, account.accountName, account.adapter]
                                                                    .filter(part => part !== undefined)
                                                                    .join(' · ') })] })] }), _jsxs("div", { className: css.actions, children: [_jsx("span", { className: css.cardTag, children: statusOf(account) }), _jsx("button", { type: "button", className: css.action, onClick: closeDetail, children: t('keypage.detail.close') })] })] }), account.status !== 'ok'
                                        ? _jsxs(_Fragment, { children: [_jsxs("p", { className: `${css.note} ${css.noteBad}`, children: [statusOf(account), reason === undefined ? '' : ` — ${reason}`] }), (account.missingCredentials ?? []).length === 0
                                                    ? null
                                                    : _jsx("p", { className: css.note, children: t('status.missingCredentials', { names: (account.missingCredentials ?? []).join(', ') }) })] })
                                        : _jsxs("div", { className: css.detailGrid, children: [_jsxs("div", { className: css.block, children: [_jsx("h3", { className: css.blockTitle, children: t('keypage.detail.allowance') }), _jsxs("div", { className: css.figures, children: [_jsxs("div", { className: css.figure, children: [_jsx("span", { className: css.figureLabel, children: t('account.remaining') }), _jsx("span", { className: css.figureValue, children: account.unlimited === true
                                                                                ? t('account.unlimited')
                                                                                : fmtAmount(account.remaining, account.currency) })] }), _jsxs("div", { className: `${css.figure} ${css.figureRight}`, children: [_jsxs("span", { className: css.figureLabel, children: [t('account.used'), " / ", t('account.limit')] }), _jsxs("span", { className: `${css.figureValue} ${css.figureValueSmall}`, children: [fmtAmount(account.used, account.currency), ' / ', fmtAmount(account.limit, account.currency)] })] })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: fillClass(account.warning), style: { width: `${percentOf(account.used, account.limit) ?? 0}%` } }) }), (account.budgetPools ?? []).length === 0
                                                            ? null
                                                            : _jsx("div", { className: css.poolList, children: (account.budgetPools ?? []).map(pool => _jsxs("div", { className: css.poolRow, children: [_jsxs("div", { className: css.poolTop, children: [_jsx("span", { className: css.poolName, children: pool.name }), _jsx("span", { className: css.poolFigures, children: pool.limit === undefined
                                                                                        ? fmtAmount(pool.remaining, account.currency)
                                                                                        : t('keypage.detail.poolFigures', {
                                                                                            amount: fmtAmount(pool.remaining, account.currency),
                                                                                            limit: fmtAmount(pool.limit, account.currency),
                                                                                        }) })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: css.barFill, style: { width: `${pool.percentUsed ?? 0}%` } }) })] }, pool.name)) }), (account.planWindows ?? []).map(planWindow => _jsxs("div", { className: css.poolRow, children: [_jsxs("div", { className: css.poolTop, children: [_jsx("span", { className: css.poolName, children: t(WINDOW_KEYS[planWindow.kind]) }), _jsx("span", { className: css.poolFigures, children: fmtPercent(planWindow.percentUsed) })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: css.barFill, style: { width: `${planWindow.percentUsed}%` } }) })] }, planWindow.kind)), _jsx("p", { className: css.note, children: t('account.source', { adapter: account.adapter }) })] }), _jsxs("div", { className: css.block, children: [_jsx("h3", { className: css.blockTitle, children: usage === undefined
                                                                ? t('keypage.detail.tokens')
                                                                : `${t('keypage.detail.tokens')} · ${t('keypage.tile.windowNote', { days: String(usage.days) })}` }), split === undefined
                                                            ? _jsx("p", { className: css.note, children: t('keypage.detail.usageUnavailable') })
                                                            : _jsxs(_Fragment, { children: [_jsx("div", { className: css.split, children: SPLIT_SEGMENTS.map(segment => {
                                                                            const value = split[segment.field];
                                                                            return value <= 0 ? null : _jsx("div", { className: `${css.seg} ${segment.className}`, style: { width: `${split.totalTokens > 0 ? (value / split.totalTokens) * 100 : 0}%` }, title: `${t(segment.label)} ${fmtTokens(value)}` }, segment.field);
                                                                        }) }), _jsxs("ul", { className: css.legend, children: [SPLIT_SEGMENTS.map(segment => {
                                                                                const value = split[segment.field];
                                                                                return _jsx(LegendRow, { label: t(segment.label), value: fmtTokens(value), share: fmtPercent(split.totalTokens > 0 ? (value / split.totalTokens) * 100 : 0), swatchClass: segment.className }, segment.field);
                                                                            }), _jsx(LegendRow, { label: t('keypage.total'), value: fmtTokens(split.totalTokens), share: "" })] }), split.reasoningTokens <= 0
                                                                        ? null
                                                                        : _jsx("p", { className: css.note, children: t('keypage.detail.reasoning', { value: fmtTokens(split.reasoningTokens) }) })] })] }), _jsxs("div", { className: css.block, children: [_jsx("h3", { className: css.blockTitle, children: t('keypage.detail.period') }), usage?.period === undefined
                                                            ? _jsx("p", { className: css.note, children: t('keypage.detail.usageUnavailable') })
                                                            : _jsxs("div", { className: css.poolList, children: [_jsxs("div", { className: css.poolTop, children: [_jsx("span", { className: css.poolName, children: usage.period.periodKey ?? t('window.billing') }), _jsx("span", { className: css.poolFigures, children: usage.period.startAt === undefined || usage.period.endAt === undefined
                                                                                    ? ''
                                                                                    : t('keypage.detail.periodRange', {
                                                                                        start: usage.period.startAt.slice(0, 10),
                                                                                        end: usage.period.endAt.slice(0, 10),
                                                                                    }) })] }), _jsxs("div", { className: css.meta, children: [_jsxs("span", { className: css.metaItem, children: [t('keypage.tile.tokens'), _jsx("span", { className: css.metaValue, children: fmtTokens(usage.period.totalTokens) })] }), _jsxs("span", { className: css.metaItem, children: [t('keypage.detail.calls'), _jsx("span", { className: css.metaValue, children: fmtNumber(usage.period.calls) })] }), _jsx("span", { className: css.metaItem, children: t('keypage.detail.outcomes', {
                                                                                    success: fmtNumber(usage.period.successCalls),
                                                                                    failed: fmtNumber(usage.period.failedCalls),
                                                                                }) })] }), _jsx("p", { className: css.note, children: t('keypage.detail.updated', {
                                                                            time: fmtTime(usage.period.updatedAt ?? account.fetchedAt),
                                                                        }) })] })] }), _jsxs("div", { className: css.block, children: [_jsx("h3", { className: css.blockTitle, children: t('keypage.detail.models', { days: String(usage?.days ?? days) }) }), models.length === 0
                                                            ? _jsx("p", { className: css.note, children: t('keypage.detail.modelsEmpty') })
                                                            : _jsx("div", { className: css.modelList, children: models.map(model => _jsxs("div", { className: css.modelRow, children: [_jsxs("div", { className: css.modelTrack, children: [_jsx("span", { className: css.modelLabel, title: model.model, children: model.model }), _jsx("div", { className: css.bar, children: _jsx("div", { className: css.modelFill, style: { width: `${maxModel > 0 ? (model.totalTokens / maxModel) * 100 : 0}%` } }) })] }), _jsxs("span", { className: css.modelValue, children: [fmtTokens(model.totalTokens), " \u00B7 ", fmtNumber(model.calls)] })] }, model.model)) })] }), _jsxs("div", { className: css.block, children: [_jsx("h3", { className: css.blockTitle, children: t('keypage.detail.daily', { days: String(usage?.days ?? days) }) }), daily.length === 0
                                                            ? _jsx("p", { className: css.note, children: t('keypage.detail.dailyEmpty') })
                                                            : _jsxs(_Fragment, { children: [_jsx("div", { className: css.daily, children: daily.map(day => {
                                                                            const active = day.date === selectedDay;
                                                                            return _jsx("button", { type: "button", className: css.dailySlot, disabled: day.totalTokens <= 0, title: t('heatmap.day', {
                                                                                    date: day.date,
                                                                                    tokens: fmtTokens(day.totalTokens),
                                                                                    calls: fmtNumber(day.calls),
                                                                                }), onClick: () => setSelectedDay(current => current === day.date ? undefined : day.date), children: _jsx("span", { className: `${css.dailyBar} ${day.totalTokens <= 0 ? css.dailyBarIdle : active ? css.dailyBarActive : ''}`, style: { height: `${maxDaily > 0 ? Math.max(2, (day.totalTokens / maxDaily) * 100) : 2}%` } }) }, day.date);
                                                                        }) }), _jsxs("div", { className: css.dailyAxis, children: [_jsx("span", { children: daily[0]?.date }), _jsx("span", { children: t('keypage.detail.dailyHint') }), _jsx("span", { children: daily[daily.length - 1]?.date })] })] })] }), selectedDay === undefined
                                                    ? null
                                                    : _jsxs("div", { className: css.block, children: [_jsx("h3", { className: css.blockTitle, children: t('keypage.day.heading', { date: selectedDay }) }), dayPoints.length === 0
                                                                ? _jsx("p", { className: css.note, children: t('keypage.day.empty') })
                                                                : _jsx("div", { className: css.tableCard, children: _jsxs("table", { className: css.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: t('keypage.day.model') }), _jsx("th", { className: css.numeric, children: t('keypage.day.tokens') }), _jsx("th", { className: css.numeric, children: t('keypage.day.calls') })] }) }), _jsx("tbody", { children: dayPoints.map(point => _jsxs("tr", { children: [_jsx("td", { className: css.mono, title: point.model, children: point.model }), _jsx("td", { className: css.numeric, children: fmtTokens(point.totalTokens) }), _jsx("td", { className: css.numeric, children: fmtNumber(point.calls) })] }, point.model)) })] }) })] })] })] })
                            : null] })] });
}
//# sourceMappingURL=KeyUsagePanel.js.map