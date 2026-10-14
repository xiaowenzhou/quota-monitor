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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccountCard } from "./AccountCard.js";
import { ExportBar } from "./ExportBar.js";
import { UsageHeatmap } from "./UsageHeatmap.js";
import { DayBreakdown } from "./DayBreakdown.js";
import { ProviderUsage } from "./ProviderUsage.js";
import { SessionList } from "./SessionList.js";
import { TotalsRow } from "./TotalsRow.js";
import { ModelUsage } from "./ModelUsage.js";
import css from './UsagePanel.module.css';
/** The local calendar month a date string belongs to, as `YYYY-MM`. */
function monthOf(date) {
    return date.slice(0, 7);
}
/** The header's mark: a compact bar chart, the panel's own subject. */
function BrandGlyph() {
    return _jsx("svg", { className: css.brandGlyph, viewBox: "0 0 24 24", "aria-hidden": "true", children: _jsxs("g", { fill: "currentColor", children: [_jsx("rect", { x: "3", y: "13", width: "4", height: "8", rx: "1.4" }), _jsx("rect", { x: "10", y: "8", width: "4", height: "13", rx: "1.4" }), _jsx("rect", { x: "17", y: "3", width: "4", height: "18", rx: "1.4" })] }) });
}
export function UsagePanel({ t, quota, subscribeProviders }) {
    const [snapshot, setSnapshot] = useState();
    const [account, setAccount] = useState();
    /** The selected route's own figures: the totals, calendar, and sessions below. */
    const [usage, setUsage] = useState();
    /** Every route together, which is what the provider comparison reads. */
    const [allUsage, setAllUsage] = useState();
    const [provider, setProvider] = useState();
    /** Credential reference of the shown reading; absent is the route's own key. */
    const [credential, setCredential] = useState();
    const [month, setMonth] = useState();
    const [selectedDay, setSelectedDay] = useState();
    const [busy, setBusy] = useState(false);
    const selection = useRef({ id: provider, credentialRef: credential });
    const requests = useRef({ usage: 0, account: 0, snapshot: 0 });
    selection.current = { id: provider, credentialRef: credential };
    useEffect(() => () => {
        requests.current.usage++;
        requests.current.account++;
        requests.current.snapshot++;
    }, []);
    const applySnapshot = useCallback((value) => {
        const current = selection.current;
        const entry = value.providers.find(candidate => candidate.id === current.id) ?? value.providers[0];
        const id = entry?.id;
        const credentialRef = id === current.id
            && (current.credentialRef === undefined || entry?.credentialRefs.includes(current.credentialRef))
            ? current.credentialRef
            : entry?.activeCredentialRef ?? entry?.credentialRefs[0];
        setSnapshot(value);
        if (id === current.id && credentialRef === current.credentialRef)
            return;
        // Invalidate in-flight reads immediately, before React commits the new
        // selection, so a deleted route cannot repaint its old balance afterward.
        selection.current = { id, credentialRef };
        requests.current.account++;
        requests.current.usage++;
        setAccount(undefined);
        setUsage(undefined);
        setProvider(id);
        setCredential(credentialRef);
    }, []);
    const loadSnapshot = useCallback(async () => {
        const request = ++requests.current.snapshot;
        const result = await quota.getSnapshot();
        if (!result.ok || request !== requests.current.snapshot)
            return;
        applySnapshot(result.value);
    }, [quota, applySnapshot]);
    /**
     * Open the panel: read the monitored credentials no round has taken yet and
     * adopt the snapshot that answers.
     *
     * This is the whole opening round trip. Every key a deployment monitors then
     * states its own figure, while readings a background round already took are
     * served from cache instead of being queried again.
     */
    const loadPending = useCallback(async () => {
        const request = ++requests.current.snapshot;
        const result = await quota.readPendingAccounts();
        if (!result.ok || request !== requests.current.snapshot)
            return;
        applySnapshot(result.value);
    }, [quota, applySnapshot]);
    const loadUsage = useCallback(async (id, refresh) => {
        if (selection.current.id !== id)
            return;
        const request = ++requests.current.usage;
        const result = await quota.getUsage({ refresh, ...id === undefined ? {} : { provider: id } });
        if (request !== requests.current.usage)
            return;
        if (result.ok && selection.current.id === id)
            setUsage(result.value);
        // A refresh completes the Host fold before the cached comparison is read.
        const all = await quota.getUsage({});
        if (all.ok && request === requests.current.usage)
            setAllUsage(all.value);
    }, [quota]);
    const loadAccount = useCallback(async (id, credentialRef, refresh) => {
        if (selection.current.id !== id || selection.current.credentialRef !== credentialRef)
            return;
        const request = ++requests.current.account;
        const result = await quota.getAccount({
            provider: id,
            ...credentialRef === undefined ? {} : { credentialRef },
            refresh,
        });
        if (result.ok && request === requests.current.account
            && selection.current.id === id && selection.current.credentialRef === credentialRef) {
            setAccount(result.value);
        }
    }, [quota]);
    useEffect(() => {
        void loadPending();
    }, [loadPending]);
    useEffect(() => subscribeProviders?.(() => { void loadSnapshot(); }), [subscribeProviders, loadSnapshot]);
    const hasSnapshot = snapshot !== undefined;
    const hasProvider = snapshot?.providers.some(entry => entry.id === provider) === true;
    useEffect(() => {
        if (!hasSnapshot)
            return;
        setAccount(undefined);
        setUsage(undefined);
        if (provider !== undefined && hasProvider)
            void loadAccount(provider, credential, false);
        // Historical routes still have statistics, but no current account or keys.
        void loadUsage(provider, false);
    }, [provider, credential, hasSnapshot, hasProvider, loadAccount, loadUsage]);
    const refreshAll = useCallback(async () => {
        setBusy(true);
        try {
            const request = ++requests.current.snapshot;
            const result = await quota.refreshAccounts();
            if (result.ok && request === requests.current.snapshot)
                applySnapshot(result.value);
            await Promise.all([
                loadUsage(provider, true),
                provider === undefined ? Promise.resolve() : loadAccount(provider, credential, false),
            ]);
        }
        finally {
            setBusy(false);
        }
    }, [quota, applySnapshot, loadUsage, loadAccount, provider, credential]);
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
        await loadAccount(id, credential, false);
    }, [quota, loadSnapshot, loadAccount, credential]);
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
                        : _jsx(AccountCard, { t: t, providers: providers, selected: provider, selectedCredential: credential, account: account, manualTotal: row?.balance?.total, manualRemaining: row?.balance?.remaining, onSelect: (id, credentialRef) => {
                                setProvider(id);
                                setCredential(credentialRef);
                            }, onRefresh: () => {
                                if (provider !== undefined)
                                    void loadAccount(provider, credential, true);
                            }, onManage: async (request) => {
                                const result = await quota.manageKey(request);
                                if (!result.ok)
                                    throw new Error(result.error.message);
                                applySnapshot(result.value);
                                await loadPending();
                            }, onManualChange: (id, value) => { void setManual(id, value); } })] }), _jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('usage.heading') }), scopeName === undefined
                                ? null
                                : _jsx("span", { className: css.sectionMeta, children: t('usage.scope', { provider: scopeName }) })] }), _jsx(TotalsRow, { t: t, usage: usage })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('model.heading') }) }), _jsx(ModelUsage, { t: t, models: usage?.models ?? [], names: providerNames })] }), _jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx("h2", { className: css.sectionTitle, children: t('provider.heading') }), _jsx("span", { className: css.sectionMeta, children: t('provider.hint') })] }), _jsx(ProviderUsage, { t: t, providers: allUsage?.providers ?? [], names: providerNames, selected: provider, onSelect: (id) => {
                            setProvider(id);
                            // A route picked from the comparison table reads its first key,
                            // which is what an absent reference names.
                            setCredential(undefined);
                        }, allTimeTokens: allUsage?.allTimeTotals.totalTokens ?? 0, todayTokens: allUsage?.todayTotals.totalTokens ?? 0, monthTokens: allUsage?.monthTotals.totalTokens ?? 0 })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('heatmap.heading') }) }), _jsx(UsageHeatmap, { t: t, days: days, month: activeMonth, today: usage?.today, selected: selectedDay, onSelect: setSelectedDay, onMonthChange: setMonth })] }), _jsx(DayBreakdown, { t: t, date: selectedDay, day: selected }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('session.heading') }) }), _jsx(SessionList, { t: t, sessions: usage?.sessions ?? [] })] }), _jsxs("section", { className: css.section, children: [_jsx("div", { className: css.sectionHead, children: _jsx("h2", { className: css.sectionTitle, children: t('export.heading') }) }), _jsx(ExportBar, { t: t, onExport: exportUsage })] })] });
}
//# sourceMappingURL=UsagePanel.js.map