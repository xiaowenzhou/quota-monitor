import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The provider breakdown: folded token totals per provider route.
 *
 * The panel's statistics follow one selected route, so this section is how that
 * route is chosen — a row selects it — and it states what the choice costs: a
 * compact view of the selected route against every route's total, or the whole
 * list once the reader asks for it. The range chips pick which scope the rows
 * state, and the rows are ordered by that scope's tokens.
 *
 * The report carries route keys only, so a route the snapshot knows is labelled
 * with its display name and an unknown one falls back to the key itself.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ProviderUsage
 */
import { useMemo, useState } from 'react';
import { fmtCost, fmtNumber, fmtPercent, fmtTokens } from "./format.js";
import css from './UsagePanel.module.css';
/** Dictionary keys for the scope chips, in the order they render. */
const SCOPE_KEYS = Object.freeze({
    today: 'usage.today',
    month: 'usage.month',
    allTime: 'usage.allTime',
});
/** Dictionary keys for the share line, which names the range it is a share of. */
const SHARE_KEYS = Object.freeze({
    today: 'provider.share.today',
    month: 'provider.share.month',
    allTime: 'provider.share.allTime',
});
/**
 * One route's figures for the selected range.
 * @param row - the route's folded usage.
 * @param scope - the selected range.
 * @returns the figures the row states.
 */
function figuresOf(row, scope) {
    if (scope === 'today') {
        return {
            tokens: row.todayTokens,
            calls: row.todayCalls,
            cacheHitPercent: row.todayCacheHitPercent,
            cost: row.todayCost,
        };
    }
    if (scope === 'month') {
        return {
            tokens: row.monthTokens,
            calls: row.monthCalls,
            cacheHitPercent: row.monthCacheHitPercent,
            cost: row.monthCost,
        };
    }
    return {
        tokens: row.totalTokens,
        calls: row.calls,
        cacheHitPercent: row.cacheHitPercent,
        cost: row.cost,
    };
}
/**
 * One route's row: its figures for the selected range, its share of that range,
 * and the lifetime facts that belong to no single range. Selecting it makes it
 * the route the rest of the panel describes.
 * @param props - the row and the state it renders against.
 * @returns the row element.
 */
function ProviderRow({ t, row, names, scope, denominator, selected, onSelect }) {
    const name = names[row.provider];
    const figures = figuresOf(row, scope);
    const share = denominator <= 0 ? 0 : Math.round((figures.tokens / denominator) * 1000) / 10;
    const meta = [
        t('provider.meta', {
            calls: fmtNumber(figures.calls),
            models: fmtNumber(row.models),
        }),
        figures.cacheHitPercent === undefined
            ? undefined
            : t('provider.cache', { percent: fmtPercent(figures.cacheHitPercent) }),
        t('provider.lastDay', { date: row.lastDay }),
    ].filter(part => part !== undefined);
    return _jsxs("button", { type: "button", className: `${css.providerRow} ${selected ? css.providerRowActive : ''}`, "aria-pressed": selected, onClick: () => onSelect(row.provider), children: [_jsxs("span", { className: css.providerHead, children: [_jsx("span", { className: css.providerName, children: name ?? row.provider }), name === undefined ? null : _jsx("span", { className: css.providerId, children: row.provider }), _jsx("span", { className: css.providerTokens, children: fmtTokens(figures.tokens) })] }), _jsx("span", { className: css.bar, children: _jsx("span", { className: css.barFill, style: { width: `${Math.min(100, share)}%` } }) }), _jsxs("span", { className: css.providerFoot, children: [_jsx("span", { className: css.providerShare, children: t(SHARE_KEYS[scope], { percent: fmtPercent(share) }) }), figures.cost === undefined ? null : _jsx("span", { className: css.providerCost, children: fmtCost(figures.cost) })] }), _jsx("span", { className: css.providerMeta, children: meta.join(' · ') })] });
}
export function ProviderUsage({ t, providers, names, selected, onSelect, allTimeTokens, todayTokens, monthTokens, }) {
    const [scope, setScope] = useState('month');
    const [expanded, setExpanded] = useState(false);
    const denominator = scope === 'today' ? todayTokens : scope === 'month' ? monthTokens : allTimeTokens;
    // Ordering follows the range on screen: the Host sorted by all time, and a
    // quiet day should still lead with the route that spent the most of it.
    const sorted = useMemo(() => [...providers].sort((left, right) => figuresOf(right, scope).tokens - figuresOf(left, scope).tokens), [providers, scope]);
    if (providers.length === 0)
        return _jsx("p", { className: css.empty, children: t('provider.empty') });
    const chosen = sorted.find(row => row.provider === selected);
    // A route with no usage in the selected range does not get a row: listing it
    // would present a route that only ever ran months ago as if it were spending
    // now. The focused route is always shown, so the section never hides the
    // choice it describes.
    const active = sorted.filter(row => figuresOf(row, scope).tokens > 0);
    const rows = expanded ? active : [chosen ?? active[0] ?? sorted[0]];
    return _jsxs("div", { className: css.providerList, children: [_jsxs("div", { className: css.providerTools, children: [_jsx("div", { className: css.selector, role: "group", "aria-label": t('provider.heading'), children: Object.keys(SCOPE_KEYS).map(key => _jsx("button", { type: "button", className: `${css.selectorChip} ${key === scope ? css.selectorChipActive : ''}`, "aria-pressed": key === scope, onClick: () => setScope(key), children: t(SCOPE_KEYS[key]) }, key)) }), providers.length === 1
                        ? null
                        : _jsx("button", { type: "button", className: css.providerToggle, "aria-expanded": expanded, onClick: () => setExpanded(current => !current), children: expanded ? t('provider.showSelected') : t('provider.showAll', { count: String(providers.length) }) })] }), rows.map(row => _jsx(ProviderRow, { t: t, row: row, names: names, scope: scope, denominator: denominator, selected: row.provider === selected, onSelect: onSelect }, row.provider)), sorted.length > active.length
                ? _jsx("p", { className: css.sectionMeta, children: t('provider.idle', { count: String(sorted.length - active.length) }) })
                : null] });
}
//# sourceMappingURL=ProviderUsage.js.map