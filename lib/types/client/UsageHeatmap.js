import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The month calendar: one cell per day of the shown month, shaded by that
 * day's token total and labelled with its day number, with month navigation
 * and day selection.
 *
 * The calendar is built from the month string alone, so a month with 28, 30,
 * or 31 days and any leading weekday renders without a special case.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsageHeatmap
 */
import { useMemo } from 'react';
import { fmtNumber, fmtTokens } from "./format.js";
import css from './UsagePanel.module.css';
/** Shading steps, from no usage to the month's own maximum. */
const LEVELS = 5;
/** Weekday headers, starting on Monday to match the cell order. */
const WEEKDAYS = Object.freeze([
    'weekday.mon',
    'weekday.tue',
    'weekday.wed',
    'weekday.thu',
    'weekday.fri',
    'weekday.sat',
    'weekday.sun',
]);
/** Days in one `YYYY-MM` month, and the weekday its first day falls on. */
function calendarOf(month) {
    const [year = 0, index = 1] = month.split('-').map(Number);
    // Day 0 of the next month is the last day of this one, which is how the
    // length comes out right for February in a leap year.
    const days = new Date(year, index, 0).getDate();
    // Columns start on Monday, so Sunday (0) moves to the last column.
    const weekday = new Date(year, index - 1, 1).getDay();
    return { days, leading: (weekday + 6) % 7 };
}
/** The month before or after `month`, as `YYYY-MM`. */
function shiftMonth(month, delta) {
    const [year = 0, index = 1] = month.split('-').map(Number);
    const shifted = new Date(year, index - 1 + delta, 1);
    return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
}
export function UsageHeatmap({ t, days, month, today, selected, onSelect, onMonthChange, }) {
    const byDate = useMemo(() => new Map(days.map(day => [day.date, day])), [days]);
    const cells = useMemo(() => {
        if (month === undefined)
            return [];
        const { days: count, leading } = calendarOf(month);
        const rows = Array.from({ length: leading }, () => ({ day: 0, totalTokens: 0, calls: 0 }));
        for (let index = 1; index <= count; index += 1) {
            const date = `${month}-${String(index).padStart(2, '0')}`;
            const usage = byDate.get(date);
            rows.push({ date, day: index, totalTokens: usage?.totalTokens ?? 0, calls: usage?.calls ?? 0 });
        }
        return rows;
    }, [month, byDate]);
    // Shading is relative to the shown month's own peak: a quiet month still
    // shows its own variation instead of collapsing to one flat colour.
    const peak = useMemo(() => cells.reduce((highest, cell) => Math.max(highest, cell.totalTokens), 0), [cells]);
    if (month === undefined)
        return _jsx("p", { className: css.empty, children: t('usage.empty') });
    return _jsxs("div", { className: css.calendar, children: [_jsxs("div", { className: css.calendarHead, children: [_jsx("button", { type: "button", className: css.navButton, "aria-label": t('heatmap.prev'), onClick: () => { onMonthChange(shiftMonth(month, -1)); }, children: "\u2039" }), _jsx("span", { className: css.calendarMonth, children: month }), _jsx("button", { type: "button", className: css.navButton, "aria-label": t('heatmap.next'), onClick: () => { onMonthChange(shiftMonth(month, 1)); }, children: "\u203A" })] }), _jsx("div", { className: css.weekdayRow, "aria-hidden": "true", children: WEEKDAYS.map(key => _jsx("span", { className: css.weekday, children: t(key) }, key)) }), _jsx("div", { className: css.monthGrid, children: cells.map((cell, index) => {
                    if (cell.date === undefined) {
                        return _jsx("span", { className: css.dayBlank, "aria-hidden": "true" }, `blank-${index}`);
                    }
                    const level = peak <= 0 || cell.totalTokens <= 0
                        ? 0
                        : Math.max(1, Math.ceil((cell.totalTokens / peak) * (LEVELS - 1)));
                    const label = cell.totalTokens > 0
                        ? t('heatmap.day', {
                            date: cell.date,
                            tokens: fmtTokens(cell.totalTokens),
                            calls: fmtNumber(cell.calls),
                        })
                        : t('heatmap.dayEmpty', { date: cell.date });
                    const date = cell.date;
                    return _jsxs("button", { type: "button", title: label, "aria-label": label, "aria-pressed": selected === date, "data-level": level, className: [
                            css.dayCell,
                            selected === date ? css.dayCellActive : '',
                            date === today ? css.dayCellToday : '',
                        ].filter(name => name !== '').join(' '), onClick: () => { onSelect(date); }, children: [_jsx("span", { className: css.dayNumber, children: cell.day }), cell.totalTokens > 0
                                ? _jsx("span", { className: css.dayTokens, children: fmtTokens(cell.totalTokens) })
                                : null] }, date);
                }) }), _jsxs("div", { className: css.legend, children: [_jsx("span", { children: t('heatmap.less') }), Array.from({ length: LEVELS }, (_, level) => _jsx("span", { "data-level": level, className: css.legendCell, "aria-hidden": "true" }, level)), _jsx("span", { children: t('heatmap.more') })] })] });
}
//# sourceMappingURL=UsageHeatmap.js.map