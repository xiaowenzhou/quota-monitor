import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { fmtNumber, fmtPercent, fmtTokens } from "./format.js";
import css from './UsageCharts.module.css';
const colors = ['#4f8ff7', '#20b8a5', '#a184ed', '#f0ae47', '#e9798c', '#60b8dc', '#9fb168'];
function modelColor(index) {
    return `hsl(${(210 + Math.max(0, index) * 137.508) % 360} 65% 60%)`;
}
const bucketKeys = ['inputTokens', 'outputTokens', 'cacheReadTokens', 'cacheWriteTokens'];
const bucketLabels = ['usage.input', 'usage.output', 'usage.cacheRead', 'usage.cacheWrite'];
/** Legends support keyboard/touch; hover highlights slices while the centre keeps the total. */
function Donut({ title, slices, t, available, reportedTotal, onInspect }) {
    const [highlight, setHighlight] = useState();
    const inspect = (label) => { setHighlight(label); onInspect?.(label); };
    const clear = () => { if (!onInspect)
        setHighlight(undefined); };
    const total = reportedTotal ?? slices.reduce((sum, slice) => sum + slice.value, 0);
    const selected = slices.find(slice => slice.label === highlight);
    let offset = 0;
    return _jsxs("figure", { className: css.chart, "aria-label": title, children: [_jsx("figcaption", { className: css.heading, children: title }), _jsxs("div", { className: css.donutBody, children: [_jsxs("div", { className: css.ring, children: [_jsxs("svg", { viewBox: "0 0 160 160", role: "img", "aria-label": `${title}: ${available ? fmtNumber(total) : t('analysis.unavailable')}`, children: [_jsx("circle", { cx: "80", cy: "80", r: "64", fill: "none", className: css.track, strokeWidth: "15" }), slices.map(slice => {
                                        const share = total > 0 ? slice.value / total * 100 : 0;
                                        const start = offset;
                                        offset += share;
                                        return share > 0 && _jsx("circle", { cx: "80", cy: "80", r: "64", fill: "none", stroke: slice.color, strokeWidth: 15, pathLength: "100", strokeDasharray: `${Math.max(0, share - Math.min(0.75, share / 4))} ${100 - Math.max(0, share - Math.min(0.75, share / 4))}`, strokeDashoffset: -start, transform: "rotate(-90 80 80)", opacity: selected && selected.label !== slice.label ? 0.35 : 1, onMouseEnter: () => inspect(slice.label), onMouseLeave: clear, children: _jsxs("title", { children: [slice.label, ": ", fmtNumber(slice.value), " \u00B7 ", fmtPercent(share)] }) }, slice.label);
                                    })] }), _jsxs("div", { className: css.center, "aria-live": "polite", children: [_jsx("strong", { children: available ? fmtTokens(total) : '—' }), _jsx("span", { children: t('analysis.tokens') })] })] }), _jsx("div", { className: css.legend, children: available && slices.some(slice => slice.value > 0) ? slices.filter(slice => slice.value > 0).map(slice => _jsxs("button", { type: "button", className: css.legendRow, "aria-pressed": highlight === slice.label, onMouseEnter: () => inspect(slice.label), onMouseLeave: clear, onFocus: () => inspect(slice.label), onBlur: clear, onClick: () => inspect(slice.label), children: [_jsx("i", { className: css.swatch, style: { background: slice.color }, "aria-hidden": "true" }), _jsx("span", { className: css.legendName, title: slice.label, children: slice.label }), _jsx("span", { className: css.legendValue, title: fmtNumber(slice.value), children: fmtTokens(slice.value) }), _jsx("span", { className: css.legendShare, children: fmtPercent(slice.value / total * 100) })] }, slice.label)) : _jsx("p", { className: css.empty, children: t(!available ? 'analysis.unavailable' : total > 0 ? 'charts.breakdownUnavailable' : 'charts.zero') }) })] })] });
}
/** Include calendar gaps so adjacent bars never conceal idle or unavailable days. */
export function calendarSeries(daily, range, availableStart, availableEnd) {
    const byDate = new Map(daily.map(day => [day.date, day.totalTokens]));
    const series = [];
    for (let stamp = Date.parse(`${range.start}T00:00:00Z`); stamp <= Date.parse(`${range.end}T00:00:00Z`); stamp += 86_400_000) {
        const date = new Date(stamp).toISOString().slice(0, 10);
        const known = availableStart !== undefined && availableEnd !== undefined && date >= availableStart && date <= availableEnd;
        series.push({ date, value: byDate.get(date) ?? (known ? 0 : undefined) });
    }
    return series;
}
export function UsageCharts({ t, totals, models, daily, range, startDate, endDate, modelNames = [] }) {
    // Window bounds alone do not prove that daily detail was supplied.
    const dailyComplete = totals !== undefined && daily.reduce((sum, day) => sum + day.totalTokens, 0) === totals.totalTokens;
    const series = calendarSeries(daily, range, dailyComplete ? startDate : undefined, dailyComplete ? endDate : undefined);
    const max = Math.max(1, ...series.map(day => day.value ?? 0));
    const peak = series.reduce((peak, day) => day.value !== undefined && day.value > (peak?.value ?? 0) ? day : peak, undefined);
    const [hovered, setHovered] = useState();
    const focusDay = series.find(day => day.date === hovered);
    const tokenSlices = bucketKeys.map((key, i) => ({ label: t(bucketLabels[i]), value: totals?.[key] ?? 0, color: colors[i] }));
    const bucketSum = tokenSlices.reduce((sum, slice) => sum + slice.value, 0);
    const tokenTotal = totals?.totalTokens ?? 0;
    if (bucketSum < tokenTotal)
        tokenSlices.push({ label: t('charts.unclassified'), value: tokenTotal - bucketSum, color: '#8e9aaa' });
    // An inconsistent breakdown cannot be normalized as though it were the total.
    if (bucketSum > tokenTotal)
        tokenSlices.length = 0;
    // Use the whole provider model catalogue, so period/member switches preserve colours.
    const catalog = modelNames.length ? modelNames : models.map(model => model.model).sort();
    const sorted = [...models].sort((a, b) => b.totalTokens - a.totalTokens);
    const modelSlices = sorted.map(model => ({ label: model.model, value: model.totalTokens, color: modelColor(catalog.indexOf(model.model)) }));
    const [inspectedModel, setInspectedModel] = useState();
    const modelDetail = sorted.find(model => model.model === inspectedModel) ?? sorted[0];
    const modelTotal = sorted.reduce((sum, model) => sum + model.totalTokens, 0);
    return _jsxs("div", { className: css.dashboard, children: [_jsxs("div", { className: css.chartPair, children: [_jsx(Donut, { title: t('charts.tokens'), slices: tokenSlices, available: totals !== undefined, t: t, ...totals === undefined ? {} : { reportedTotal: totals.totalTokens } }), _jsx(Donut, { title: t('charts.models'), slices: modelSlices, available: models.some(model => model.totalTokens > 0) || totals?.totalTokens === 0, t: t, onInspect: setInspectedModel })] }), modelDetail && _jsxs("section", { className: css.modelDetail, "aria-label": t('charts.modelDetail'), children: [_jsxs("div", { className: css.detailHead, children: [_jsxs("h4", { children: [_jsx("i", { className: css.swatch, style: { background: modelColor(catalog.indexOf(modelDetail.model)) } }), modelDetail.model] }), _jsxs("span", { children: [fmtPercent(modelTotal > 0 ? modelDetail.totalTokens / modelTotal * 100 : undefined), " \u00B7 ", t('charts.inspect')] })] }), _jsxs("div", { className: css.detailMetrics, children: [_jsxs("div", { children: [_jsx("span", { children: t('analysis.tokens') }), _jsx("strong", { title: fmtNumber(modelDetail.totalTokens), children: fmtTokens(modelDetail.totalTokens) })] }), _jsxs("div", { children: [_jsx("span", { children: t('analysis.calls') }), _jsx("strong", { children: fmtNumber(modelDetail.calls) })] }), bucketKeys.map((key, index) => _jsxs("div", { children: [_jsxs("span", { children: [_jsx("i", { className: css.swatch, style: { background: colors[index] } }), t(bucketLabels[index])] }), _jsx("strong", { title: fmtNumber(modelDetail[key]), children: fmtTokens(modelDetail[key]) })] }, key))] })] }), totals !== undefined && models.length > 0 && models.reduce((sum, model) => sum + model.totalTokens, 0) !== totals.totalTokens && _jsx("p", { className: css.empty, children: t('charts.modelsPartial') }), _jsxs("figure", { className: css.chart, "aria-label": t('charts.trend'), children: [_jsxs("div", { className: css.trendHead, children: [_jsx("figcaption", { className: css.heading, children: t('charts.trend') }), _jsx("span", { className: css.trendValue, children: focusDay ? `${focusDay.date} · ${focusDay.value === undefined ? t('analysis.unavailable') : fmtTokens(focusDay.value)}` : peak ? `${t('charts.peak')} ${peak.date} · ${fmtTokens(peak.value)}` : t(series.every(day => day.value === 0) ? 'charts.zero' : 'analysis.unavailable') })] }), _jsxs("div", { className: css.plot, role: "group", "aria-label": t('charts.trend'), children: [_jsxs("div", { className: css.grid, "aria-hidden": "true", children: [_jsx("span", { children: fmtTokens(max === 1 ? 0 : max) }), _jsx("span", { children: fmtTokens(max === 1 ? 0 : max / 2) }), _jsx("span", { children: "0" })] }), _jsx("div", { className: css.bars, children: series.map(day => _jsx("button", { type: "button", className: `${css.barSlot} ${day.value === undefined ? css.unknown : ''}`, title: `${day.date}: ${day.value === undefined ? t('analysis.unavailable') : fmtNumber(day.value)}`, "aria-label": `${day.date}: ${day.value === undefined ? t('analysis.unavailable') : `${fmtNumber(day.value)} tokens`}`, onMouseEnter: () => setHovered(day.date), onMouseLeave: () => setHovered(undefined), onFocus: () => setHovered(day.date), onBlur: () => setHovered(undefined), onClick: () => setHovered(day.date), children: _jsx("span", { className: css.bar, style: { height: `${day.value === undefined ? 0 : day.value / max * 100}%` } }) }, day.date)) })] }), _jsxs("div", { className: css.axis, children: [_jsx("span", { children: range.start }), _jsx("span", { children: range.end })] }), series.some(day => day.value === undefined) && _jsx("p", { className: css.empty, children: t('charts.unknownDays') })] })] });
}
//# sourceMappingURL=UsageCharts.js.map