import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { fmtCost, fmtPercent, fmtTime, fmtTokens } from "./format.js";
import css from './UsagePanel.module.css';
/** Dictionary key naming each budget state. */
const BUDGET_STATUS_KEYS = Object.freeze({
    normal: 'budget.status.normal',
    warning: 'budget.status.warning',
    critical: 'budget.status.critical',
    unknown: 'budget.status.unknown',
});
/** Severity class for a budget window. */
function budgetTone(status) {
    if (status === 'critical')
        return css.critical ?? '';
    return status === 'warning' ? css.warning ?? '' : '';
}
/** One totals tile: its headline figure, its derived spend, and its split. */
function TotalsCard({ t, label, totals, cost }) {
    return _jsxs("div", { className: css.totalCard, children: [_jsx("span", { className: css.totalLabel, children: label }), _jsx("span", { className: css.totalValue, children: fmtTokens(totals?.totalTokens) }), cost === undefined
                ? null
                : _jsx("span", { className: css.totalCost, children: fmtCost(cost) }), cost === undefined || cost.unpricedCalls === 0
                ? null
                : _jsx("span", { className: css.totalNote, children: t('cost.unpriced', { calls: String(cost.unpricedCalls) }) }), _jsxs("dl", { className: css.totalSplit, children: [_jsxs("div", { className: css.splitRow, children: [_jsx("dt", { children: t('usage.input') }), _jsx("dd", { children: fmtTokens(totals?.inputTokens) })] }), _jsxs("div", { className: css.splitRow, children: [_jsx("dt", { children: t('usage.output') }), _jsx("dd", { children: fmtTokens(totals?.outputTokens) })] }), _jsxs("div", { className: css.splitRow, children: [_jsx("dt", { children: t('usage.cacheRead') }), _jsx("dd", { children: fmtTokens(totals?.cacheReadTokens) })] }), _jsxs("div", { className: css.splitRow, children: [_jsx("dt", { children: t('usage.cacheWrite') }), _jsx("dd", { children: fmtTokens(totals?.cacheWriteTokens) })] })] })] });
}
/** One budget window: its ceiling, its spend, and a bar of the used share. */
function BudgetCard({ t, label, currency, window: entry }) {
    const spent = {
        amount: entry.spent,
        currency,
        unpricedCalls: entry.unpricedCalls,
    };
    const limit = { amount: entry.limit, currency, unpricedCalls: 0 };
    return _jsxs("div", { className: css.budgetCard, children: [_jsxs("div", { className: css.budgetHead, children: [_jsx("span", { className: css.budgetName, children: label }), _jsx("span", { className: `${css.budgetValue} ${budgetTone(entry.status)}`, children: t('budget.spentOfLimit', { spent: fmtCost(spent), limit: fmtCost(limit) }) })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: `${css.barFill} ${budgetTone(entry.status)}`, style: { width: `${Math.min(100, entry.percentUsed)}%` } }) }), _jsxs("span", { className: css.windowMeta, children: [t(BUDGET_STATUS_KEYS[entry.status]), ' · ', fmtPercent(entry.percentUsed), entry.unpricedCalls === 0
                        ? ''
                        : ` · ${t('cost.unpriced', { calls: String(entry.unpricedCalls) })}`] })] });
}
export function TotalsRow({ t, usage }) {
    const budgets = usage?.budgets;
    return _jsxs("div", { className: css.totals, children: [_jsxs("div", { className: css.totalGrid, children: [_jsx(TotalsCard, { t: t, label: t('usage.today'), totals: usage?.todayTotals, cost: usage?.todayCost }), _jsx(TotalsCard, { t: t, label: t('usage.month'), totals: usage?.monthTotals, cost: usage?.monthCost }), _jsx(TotalsCard, { t: t, label: t('usage.allTime'), totals: usage?.allTimeTotals, cost: usage?.allTimeCost })] }), budgets === undefined ? null : _jsxs("div", { className: css.budgetGrid, children: [budgets.daily === undefined ? null : _jsx(BudgetCard, { t: t, label: t('budget.daily'), currency: budgets.currency, window: budgets.daily }), budgets.monthly === undefined ? null : _jsx(BudgetCard, { t: t, label: t('budget.monthly'), currency: budgets.currency, window: budgets.monthly })] }), _jsx("p", { className: css.totalsMeta, children: usage === undefined
                    ? t('usage.empty')
                    : usage.folding
                        ? t('usage.folding')
                        : _jsxs(_Fragment, { children: [t('usage.cacheHitToday', { percent: fmtPercent(usage.todayCacheHitPercent) }), ' · ', t('usage.sessions', { count: String(usage.sessionCount) }), usage.foldedAt > 0 ? ` · ${t('usage.foldedAt', { time: fmtTime(usage.foldedAt) })}` : '', usage.allTimeCost === undefined ? ` · ${t('cost.unconfigured')}` : ''] }) })] });
}
//# sourceMappingURL=TotalsRow.js.map