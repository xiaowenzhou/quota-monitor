import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The usage panel: the provider account card, token totals with derived spend
 * and budgets, the month calendar, the selected day's breakdown, the session
 * list, and the export row.
 *
 * Every figure arrives from the `quotaMonitor` Remote face. The panel derives
 * presentation only — it never computes a total the Host did not report, so
 * one authority owns the accounting.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsagePanel
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccountCard } from "./AccountCard.js";
import { ExportBar } from "./ExportBar.js";
import { UsageHeatmap } from "./UsageHeatmap.js";
import { DayBreakdown } from "./DayBreakdown.js";
import { ProviderUsage } from "./ProviderUsage.js";
import { SessionList } from "./SessionList.js";
import { TotalsRow } from "./TotalsRow.js";
import css from './UsagePanel.module.css';
/** The local calendar month a date string belongs to, as `YYYY-MM`. */
function monthOf(date) {
    return date.slice(0, 7);
}
/** The header's mark: a compact bar chart, the panel's own subject. */
function BrandGlyph() {
    return _jsx("svg", { className: css.brandGlyph, viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsxs("g", { fill: "currentColor", children: [_jsx("rect", { x: "3", y: "13", width: "4", height: "8", rx: "1.4" }), _jsx("rect", { x: "10", y: "8", width: "4", height: "13", rx: "1.4" }), _jsx("rect", { x: "17", y: "3", width: "4", height: "18", rx: "1.4" })] }) });
}
export function UsagePanel({ t, quota }) {
    const [snapshot, setSnapshot] = useState();
    const [account, setAccount] = useState();
    /** The selected route's own figures: the totals, calendar, and sessions below. */
    const [usage, setUsage] = useState();
    /** Every route together, which is what the provider comparison reads. */
    const [allUsage, setAllUsage] = useState();
    const [provider, setProvider] = useState();
    const [month, setMonth] = useState();
    const [selectedDay, setSelectedDay] = useState();
    const [busy, setBusy] = useState(false);
    const loadSnapshot = useCallback(async () => {
        const result = await quota.getSnapshot();
        if (!result.ok)
            return;
        setSnapshot(result.value);
        // The first provider becomes the selection only while none is held, so a
        // background refresh never moves the card out from under the reader.
        setProvider(current => current ?? result.value.providers[0]?.id);
    }, [quota]);
    const loadUsage = useCallback(async (id, refresh) => {
        // Each read publishes as it lands, so the selected route's figures are not
        // held up by the comparison read that shares the request.
        const scoped = quota
            .getUsage({ refresh, ...id === undefined ? {} : { provider: id } })
            .then(result => {
            if (result.ok)
                setUsage(result.value);
        });
        const all = quota.getUsage({}).then(result => {
            if (result.ok)
                setAllUsage(result.value);
        });
        await Promise.all([scoped, all]);
    }, [quota]);
    const loadAccount = useCallback(async (id, refresh) => {
        const result = await quota.getAccount({ provider: id, refresh });
        if (result.ok)
            setAccount(result.value);
    }, [quota]);
    useEffect(() => {
        void loadSnapshot();
    }, [loadSnapshot]);
    useEffect(() => {
        if (provider === undefined)
            return;
        setAccount(undefined);
        void loadAccount(provider, false);
        // The statistics follow the same selection as the account card.
        void loadUsage(provider, false);
    }, [provider, loadAccount, loadUsage]);
    const refreshAll = useCallback(async () => {
        setBusy(true);
        try {
            await loadSnapshot();
            await Promise.all([
                loadUsage(provider, true),
                provider === undefined ? Promise.resolve() : loadAccount(provider, true),
            ]);
        }
        finally {
            setBusy(false);
        }
    }, [loadSnapshot, loadUsage, loadAccount, provider]);
    const resetStats = useCallback(async () => {
        const result = await quota.resetStats({});
        if (result.ok) {
            setSnapshot(result.value);
            await loadUsage(provider, false);
        }
    }, [quota, loadUsage, provider]);
    const setManual = useCallback(async (id, value) => {
        await quota.setBalances({ balances: { [id]: value } });
        await loadSnapshot();
        await loadAccount(id, false);
    }, [quota, loadSnapshot, loadAccount]);
    const exportUsage = useCallback(async (kind) => {
        const result = await quota.exportUsage({ kind });
        return result.ok ? result.value : undefined;
    }, [quota]);
    // The month shown defaults to the one carrying today's figures, and stays
    // put once the reader moves it.
    const activeMonth = month ?? (usage === undefined ? undefined : monthOf(usage.today));
    const days = usage?.days ?? [];
    const selected = useMemo(() => days.find(day => day.date === selectedDay), [days, selectedDay]);
    const providers = snapshot?.providers ?? [];
    const row = snapshot?.rows.find(entry => entry.id === provider);
    // The folded report carries route keys; the snapshot is what knows a display
    // name for one, so the two are joined here rather than in the Host.
    const providerNames = useMemo(() => Object.fromEntries(providers.map(entry => [entry.id, entry.name])), [providers]);
    /** The selected route's display name, which the statistics section states. */
    const scopeName = provider === undefined
        ? undefined
        : providerNames[provider] ?? provider;
    return _jsxs("div", { className: css.panel, children: [_jsxs("header", { className: css.header, children: [_jsxs("div", { className: css.brand, children: [_jsx("span", { className: css.brandMark, children: _jsx(BrandGlyph, {}) }), _jsxs("div", { children: [_jsx("h1", { className: css.title, children: t('panel.title') }), _jsx("p", { className: css.subtitle, children: t('panel.subtitle') })] })] }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", className: `${css.action} ${css.actionPrimary}`, onClick: () => void refreshAll(), disabled: busy, children: busy ? t('action.refreshing') : t('action.refresh') }), _jsx("button", { type: "button", className: css.action, onClick: () => void resetStats(), children: t('action.reset') })] })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('account.heading') }) }), providers.length === 0
                        ? _jsx("p", { className: css.empty, children: t('account.empty') })
                        : _jsx(AccountCard, { t: t, providers: providers, selected: provider, account: account, manualTotal: row?.balance?.total, manualRemaining: row?.balance?.remaining, onSelect: setProvider, onRefresh: () => {
                                if (provider !== undefined)
                                    void loadAccount(provider, true);
                            }, onManualChange: (id, value) => { void setManual(id, value); } })] }), _jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('usage.heading') }), scopeName === undefined
                                ? null
                                : _jsx("span", { className: css.sectionMeta, children: t('usage.scope', { provider: scopeName }) })] }), _jsx(TotalsRow, { t: t, usage: usage })] }), _jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('provider.heading') }), _jsx("span", { className: css.sectionMeta, children: t('provider.hint') })] }), _jsx(ProviderUsage, { t: t, providers: allUsage?.providers ?? [], names: providerNames, selected: provider, onSelect: setProvider, allTimeTokens: allUsage?.allTimeTotals.totalTokens ?? 0, todayTokens: allUsage?.todayTotals.totalTokens ?? 0, monthTokens: allUsage?.monthTotals.totalTokens ?? 0 })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('heatmap.heading') }) }), _jsx(UsageHeatmap, { t: t, days: days, month: activeMonth, today: usage?.today, selected: selectedDay, onSelect: setSelectedDay, onMonthChange: setMonth })] }), _jsx(DayBreakdown, { t: t, date: selectedDay, day: selected }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('session.heading') }) }), _jsx(SessionList, { t: t, sessions: usage?.sessions ?? [] })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('export.heading') }) }), _jsx(ExportBar, { t: t, onExport: exportUsage })] })] });
}
//# sourceMappingURL=UsagePanel.js.map