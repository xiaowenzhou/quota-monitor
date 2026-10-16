import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { TotalsRow } from "./TotalsRow.js";
import { ModelUsage } from "./ModelUsage.js";
import { ProviderUsage } from "./ProviderUsage.js";
import { UsageHeatmap } from "./UsageHeatmap.js";
import { DayBreakdown } from "./DayBreakdown.js";
import { SessionList } from "./SessionList.js";
import { ExportBar } from "./ExportBar.js";
import css from './LocalStats.module.css';
/** Local accounting keeps its own surfaces while the panel owns its selection. */
export function LocalStats({ t, usage, allUsage, names, provider, scopeName, month, selectedDay, onSelectDay, onMonthChange, onExport, onReset, }) {
    const days = usage?.days ?? [];
    const selected = days.find(day => day.date === selectedDay);
    return _jsxs("div", { className: css.stack, children: [_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsxs("div", { className: css.headingGroup, children: [_jsx("h2", { className: css.sectionTitle, children: t('usage.heading') }), scopeName === undefined ? null : _jsx("span", { className: css.sectionMeta, children: t('usage.scope', { provider: scopeName }) })] }), _jsx(Button, { variant: "ghost", size: "sm", onClick: onReset, children: t('action.reset') })] }), _jsx(TotalsRow, { t: t, usage: usage })] }), _jsx("section", { className: css.section, children: _jsx(ModelUsage, { t: t, models: usage?.models ?? [], names: names }) }), _jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('provider.heading') }), _jsx("span", { className: css.sectionMeta, children: t('provider.hint') })] }), _jsx(ProviderUsage, { t: t, providers: allUsage?.providers ?? [], names: names, selected: provider, allTimeTokens: allUsage?.allTimeTotals.totalTokens ?? 0, todayTokens: allUsage?.todayTotals.totalTokens ?? 0, monthTokens: allUsage?.monthTotals.totalTokens ?? 0 })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('heatmap.heading') }) }), _jsx(UsageHeatmap, { t: t, days: days, month: month, today: usage?.today, selected: selectedDay, onSelect: onSelectDay, onMonthChange: onMonthChange })] }), _jsx(DayBreakdown, { t: t, date: selectedDay, day: selected }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('session.heading') }) }), _jsx(SessionList, { t: t, sessions: usage?.sessions ?? [] })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('export.heading') }) }), _jsx(ExportBar, { t: t, onExport: onExport })] })] });
}
//# sourceMappingURL=LocalStats.js.map