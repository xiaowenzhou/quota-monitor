import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { fmtCost, fmtDateTime, fmtNumber, fmtTokens } from "./format.js";
import css from './UsagePanel.module.css';
/** How many rows the list shows before it stops, so one busy corpus stays readable. */
const MAX_ROWS = 20;
export function SessionList({ t, sessions }) {
    if (sessions.length === 0)
        return _jsx("p", { className: css.empty, children: t('session.empty') });
    const rows = sessions.slice(0, MAX_ROWS);
    const priced = rows.some(session => session.cost !== undefined);
    return _jsxs(_Fragment, { children: [_jsx("div", { className: css.tableCard, children: _jsxs("table", { className: css.table, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { scope: "col", children: t('session.id') }), _jsx("th", { scope: "col", children: t('session.routes') }), _jsx("th", { scope: "col", className: css.numeric, children: t('session.tokens') }), _jsx("th", { scope: "col", className: css.numeric, children: t('session.calls') }), priced ? _jsx("th", { scope: "col", className: css.numeric, children: t('session.cost') }) : null, _jsx("th", { scope: "col", children: t('session.lastActive') })] }) }), _jsx("tbody", { children: rows.map(session => _jsxs("tr", { children: [_jsx("td", { className: css.mono, children: session.id }), _jsx("td", { className: css.routes, children: session.routes.join(', ') }), _jsx("td", { className: css.numeric, children: fmtTokens(session.totalTokens) }), _jsx("td", { className: css.numeric, children: fmtNumber(session.calls) }), priced ? _jsx("td", { className: css.numeric, children: fmtCost(session.cost) }) : null, _jsx("td", { children: fmtDateTime(session.lastActiveAt) })] }, session.id)) })] }) }), sessions.length > rows.length
                ? _jsx("p", { className: css.sectionMeta, children: t('session.more', { count: String(rows.length) }) })
                : null] });
}
//# sourceMappingURL=SessionList.js.map