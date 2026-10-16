import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Per-model token usage and configured price rates for the selected provider.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ModelUsage
 */
import { useMemo, useState } from 'react';
import { fmtAmount, fmtCost, fmtNumber, fmtPercent } from "./format.js";
import css from './LocalStats.module.css';
const SCOPES = {
    today: 'usage.today',
    month: 'usage.month',
    all: 'usage.allTime',
};
/**
 * Render model counters by range, with partial spend and current rate labels.
 * @param props - Model summaries, provider names, and localized copy.
 * @returns The model usage table or an empty-state message.
 */
export function ModelUsage({ t, models, names }) {
    const [scope, setScope] = useState('month');
    const sorted = useMemo(() => [...models].sort((a, b) => b[scope].totalTokens - a[scope].totalTokens
        || a.provider.localeCompare(b.provider) || a.model.localeCompare(b.model)), [models, scope]);
    return _jsxs("div", { className: css.modelUsage, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('model.heading') }), _jsx("div", { className: css.selector, role: "group", "aria-label": t('model.range'), children: Object.keys(SCOPES).map(key => _jsx("button", { type: "button", className: `${css.selectorChip} ${scope === key ? css.selectorChipActive : ''}`, "aria-pressed": scope === key, onClick: () => setScope(key), children: t(SCOPES[key]) }, key)) })] }), _jsx("p", { className: css.sectionMeta, children: t('model.estimate') }), sorted.length === 0 ? _jsx("p", { className: css.empty, children: t('model.empty') }) : _jsx("div", { className: css.tableCard, children: _jsxs("table", { className: css.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: t('detail.model') }), _jsx("th", { scope: "col", children: t('detail.provider') }), _jsx("th", { scope: "col", className: css.numeric, children: t('model.calls') }), _jsx("th", { scope: "col", className: css.numeric, children: t('usage.input') }), _jsx("th", { scope: "col", className: css.numeric, children: t('usage.output') }), _jsx("th", { scope: "col", className: css.numeric, children: t('usage.cacheRead') }), _jsx("th", { scope: "col", className: css.numeric, children: t('usage.cacheWrite') }), _jsx("th", { scope: "col", className: css.numeric, children: t('usage.cacheHit') }), _jsx("th", { scope: "col", className: css.numeric, children: t('detail.cost') }), _jsx("th", { scope: "col", children: t('model.rates') })] }) }), _jsx("tbody", { children: sorted.map((row) => {
                                const figures = row[scope];
                                const rate = row.rate;
                                return _jsxs("tr", { children: [_jsx("th", { scope: "row", className: css.mono, children: row.model }), _jsxs("td", { children: [names[row.provider] ?? row.provider, names[row.provider] === undefined ? null : _jsx("span", { className: css.modelNote, children: row.provider })] }), _jsx("td", { className: css.numeric, children: fmtNumber(figures.calls) }), _jsx("td", { className: css.numeric, children: fmtNumber(figures.inputTokens) }), _jsx("td", { className: css.numeric, children: fmtNumber(figures.outputTokens) }), _jsx("td", { className: css.numeric, children: fmtNumber(figures.cacheReadTokens) }), _jsx("td", { className: css.numeric, children: fmtNumber(figures.cacheWriteTokens) }), _jsx("td", { className: css.numeric, children: fmtPercent(figures.cacheHitPercent) }), _jsxs("td", { className: css.numeric, children: [fmtCost(figures.cost), figures.cost === undefined
                                                    ? _jsx("span", { className: css.modelNote, children: t('model.unpriced') })
                                                    : figures.cost.unpricedCalls > 0
                                                        ? _jsx("span", { className: css.modelNote, children: t('cost.unpriced', { calls: fmtNumber(figures.cost.unpricedCalls) }) })
                                                        : null] }), _jsx("td", { children: rate === undefined ? t('model.noRates') : _jsxs(_Fragment, { children: [_jsx("span", { className: css.modelRate, children: t('model.rate.input', { amount: fmtAmount(rate.inputPerMillion, rate.currency) }) }), _jsx("span", { className: css.modelRate, children: t('model.rate.output', { amount: fmtAmount(rate.outputPerMillion, rate.currency) }) }), rate.cacheReadPerMillion === undefined ? null : _jsx("span", { className: css.modelRate, children: t('model.rate.cacheRead', { amount: fmtAmount(rate.cacheReadPerMillion, rate.currency) }) }), rate.cacheWritePerMillion === undefined ? null : _jsx("span", { className: css.modelRate, children: t('model.rate.cacheWrite', { amount: fmtAmount(rate.cacheWritePerMillion, rate.currency) }) }), rate.from === undefined ? null : _jsx("span", { className: css.modelNote, children: t('model.rate.from', { date: rate.from }) })] }) })] }, JSON.stringify([row.provider, row.model]));
                            }) })] }) })] });
}
//# sourceMappingURL=ModelUsage.js.map