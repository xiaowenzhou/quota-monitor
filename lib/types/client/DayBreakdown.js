import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { fmtCost, fmtNumber, fmtTokens } from "./format.js";
import css from './UsagePanel.module.css';
export function DayBreakdown({ t, date, day }) {
    if (date === undefined)
        return _jsx("p", { className: css.empty, children: t('detail.hint') });
    const priced = day?.cost !== undefined;
    return _jsxs("div", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('detail.heading', { date }) }), day?.cost === undefined
                        ? null
                        : _jsx("p", { className: css.sectionMeta, children: fmtCost(day.cost) })] }), day === undefined || day.models.length === 0
                ? _jsx("p", { className: css.empty, children: t('detail.empty') })
                : _jsx("div", { className: css.tableCard, children: _jsxs("table", { className: css.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: t('detail.provider') }), _jsx("th", { scope: "col", children: t('detail.model') }), _jsx("th", { scope: "col", className: css.numeric, children: t('detail.tokens') }), _jsx("th", { scope: "col", className: css.numeric, children: t('detail.calls') }), priced ? _jsx("th", { scope: "col", className: css.numeric, children: t('detail.cost') }) : null] }) }), _jsx("tbody", { children: day.models.map(row => _jsxs("tr", { children: [_jsx("td", { children: row.provider }), _jsx("td", { children: row.model }), _jsx("td", { className: css.numeric, children: fmtTokens(row.totalTokens) }), _jsx("td", { className: css.numeric, children: fmtNumber(row.calls) }), priced ? _jsx("td", { className: css.numeric, children: fmtCost(row.cost) }) : null] }, `${row.provider}/${row.model}`)) })] }) })] });
}
//# sourceMappingURL=DayBreakdown.js.map