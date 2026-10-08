import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Floating quota panel: a top-right pill with the aggregate token count and
 * the expandable per-provider list (balance probe results, usage counters,
 * manual balance fallback, rolling-window resets, plan-window rows, and
 * budget-pool rows).
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaOverlay
 */
import { useCallback, useEffect, useState } from 'react';
import css from './QuotaOverlay.module.css';
/** Dictionary key naming each plan window the panel can label. */
const WINDOW_KEYS = Object.freeze({
    'five-hour': 'window.fiveHour',
    weekly: 'window.weekly',
    monthly: 'window.monthly',
});
/** Compact token figure: `1.2M` / `3.4k` / plain. */
function fmtTokens(value) {
    if (value === undefined || value === null)
        return '—';
    if (Math.abs(value) >= 1e6)
        return `${(value / 1e6).toFixed(2)}M`;
    if (Math.abs(value) >= 1e3)
        return `${(value / 1e3).toFixed(1)}k`;
    return String(Math.round(value));
}
/** Fixed-digits number or an em dash placeholder. */
function fmtNumber(value, digits = 2) {
    if (value === undefined || value === null)
        return '—';
    return value.toFixed(digits);
}
/** Bar color for a used-percent figure: green below 70, warn below 90, error above. */
function pctColor(pct) {
    if (pct === undefined || pct === null)
        return 'var(--dsw-alias-label-secondary)';
    if (pct >= 90)
        return 'var(--dsw-alias-state-error-primary)';
    if (pct >= 70)
        return 'var(--dsw-alias-state-warn-primary)';
    return 'var(--dsw-alias-state-success-primary)';
}
/** Split one ISO reset instant into countdown parts, or undefined when unreadable. */
function resetParts(iso) {
    if (iso === undefined)
        return undefined;
    const at = new Date(iso).getTime();
    if (!Number.isFinite(at))
        return undefined;
    const stamp = new Date(at);
    const hh = String(stamp.getHours()).padStart(2, '0');
    const mm = String(stamp.getMinutes()).padStart(2, '0');
    const total = Math.max(0, Math.floor((at - Date.now()) / 60_000));
    return { at: `${hh}:${mm}`, hours: Math.floor(total / 60), minutes: total % 60, total };
}
/** Localized countdown line for one reset instant, or null when none applies. */
function resetLine(t, iso) {
    const parts = resetParts(iso);
    if (parts === undefined)
        return null;
    if (parts.total === 0)
        return t('reset.expired');
    return parts.hours >= 1
        ? t('reset.hours', { at: parts.at, hours: parts.hours, minutes: parts.minutes })
        : t('reset.minutes', { at: parts.at, minutes: parts.total });
}
/**
 * The floating overlay.
 * @param props - the root runtime seat, the `t` seat, and the injected Host face.
 */
export function QuotaOverlay({ quota, t }) {
    const [open, setOpen] = useState(true);
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState('');
    const load = useCallback(() => {
        return quota.getSnapshot().then((result) => {
            if (result.ok) {
                setSnapshot(result.value);
                setError('');
            }
            else {
                setError(result.error.message);
            }
        }).catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    }, [quota]);
    useEffect(() => {
        void load();
        // Open panels refresh briskly so token counts track live streams; a
        // collapsed pill only keeps its headline figure warm.
        const timer = window.setInterval(() => {
            void load();
        }, open ? 2_000 : 5_000);
        return () => {
            window.clearInterval(timer);
        };
    }, [open, load]);
    const onProbe = useCallback(() => {
        quota.probe().then(() => load()).catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    }, [quota, load]);
    const onReset = useCallback(() => {
        void quota.resetStats({}).then(load);
    }, [quota, load]);
    const onManualBlur = useCallback((id, raw) => {
        const previous = snapshot?.balances ?? {};
        const balances = {};
        for (const [key, total] of Object.entries(previous)) {
            if (key !== id)
                balances[key] = total;
        }
        const value = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(value))
            balances[id] = value;
        void quota.setBalances({ balances }).then(load);
    }, [quota, snapshot]);
    return _jsxs("div", { className: css.overlay, children: [_jsxs("button", { className: css.fab, type: "button", onClick: () => {
                    setOpen(!open);
                }, children: [_jsx("span", { className: css.dot }), _jsx("span", { children: t('pill.label') }), _jsx("span", { className: css.num, children: snapshot === null
                            ? t('pill.loading')
                            : t('pill.tokens', { tokens: fmtTokens(snapshot.aggregate.totalTokens) }) })] }), open ? _jsxs("div", { className: css.panel, children: [_jsxs("div", { className: css.header, children: [_jsx("span", { children: t('panel.title') }), _jsxs("span", { children: [_jsx("button", { className: css.actionButton, type: "button", onClick: onProbe, children: t('action.probe') }), _jsx("button", { className: css.actionButton, type: "button", onClick: () => void load(), children: t('action.refresh') }), _jsx("button", { className: css.actionButton, type: "button", onClick: onReset, children: t('action.reset') }), _jsx("button", { className: css.actionButton, type: "button", "aria-label": t('action.close'), onClick: () => {
                                            setOpen(false);
                                        }, children: '×' })] })] }), error !== '' ? _jsx("div", { className: css.error, children: error }) : null, (snapshot?.providers ?? []).map(provider => (_jsx(ProviderRow, { provider: provider, onManualBlur: onManualBlur, t: t }, provider.id)))] }) : null] });
}
function ProviderRow({ provider, onManualBlur, t }) {
    const probe = provider.probe;
    const manual = provider.balance;
    const isDeepSeek = /deepseek/i.test(provider.id);
    const isMiniMax = /minimax/i.test(provider.id);
    const isWindow = probe !== null && probe.ok && probe.hasIntervalWindow === true;
    const windows = probe !== null && probe.ok ? probe.planWindows ?? [] : [];
    const pools = probe !== null && probe.ok ? probe.budgetPools ?? [] : [];
    let pct = null;
    if (manual !== null)
        pct = manual.pct;
    else if (probe !== null && probe.ok)
        pct = probe.pct;
    // Plan windows carry their own per-window reset, so the envelope countdown
    // would repeat the tightest row.
    const reset = probe !== null && probe.ok && windows.length === 0 ? resetLine(t, probe.resetAt) : null;
    return _jsxs("div", { className: css.row, children: [_jsxs("div", { className: css.name, children: [_jsxs("span", { children: [provider.name, isMiniMax && isWindow
                                ? _jsx("span", { className: css.pill, children: t('window.badge', { window: t('window.fiveHour') }) })
                                : null] }), _jsx("span", { className: css.source, children: probe !== null && probe.ok ? probe.source : '' })] }), _jsxs("div", { className: css.meta, children: [probe === null ? null : probe.ok
                        ? _jsx("span", { children: t('row.balance', { amount: fmtNumber(probe.balance), currency: probe.currency }) })
                        : _jsx("span", { className: css.error, children: probe.error }), probe === null && manual === null ? _jsx("span", { children: t('row.empty') }) : null] }), isDeepSeek || windows.length > 0 ? null : _jsx("div", { className: css.bar, children: _jsx("div", { className: css.fill, style: { width: pct === null ? '0%' : `${Math.min(100, pct)}%`, background: pctColor(pct) } }) }), reset === null ? null : _jsx("div", { className: css.meta, children: reset }), windows.map(entry => _jsx(PlanWindowRow, { entry: entry, t: t }, entry.kind)), pools.length === 0 ? null : _jsxs("div", { className: css.poolList, children: [_jsx("div", { className: css.poolHeading, children: t('pools.heading') }), pools.map(pool => _jsx(BudgetPoolRow, { pool: pool, t: t }, pool.name))] }), _jsx("div", { className: css.meta, children: t('row.usage', {
                    calls: provider.calls,
                    input: fmtTokens(provider.inputTokens),
                    output: fmtTokens(provider.outputTokens),
                }) }), manual !== null
                ? _jsx("div", { className: css.meta, children: t('row.manualRemaining', { amount: fmtNumber(manual.remaining) }) })
                : null, _jsxs("div", { className: css.meta, children: [t('row.manualLabel'), _jsx("input", { className: css.manualInput, type: "number", defaultValue: manual?.total ?? '', placeholder: t('row.manualPlaceholder'), onBlur: (event) => {
                            onManualBlur(provider.id, event.target.value);
                        } })] })] });
}
/** One plan window: its used share as a bar plus its own reset countdown. */
function PlanWindowRow({ entry, t }) {
    const label = t(WINDOW_KEYS[entry.kind]);
    const reset = resetLine(t, entry.resetAt);
    return _jsxs("div", { className: css.window, children: [_jsxs("div", { className: css.meta, children: [_jsx("span", { children: t('window.used', { window: label, percent: Math.round(entry.percentUsed) }) }), reset === null ? null : _jsx("span", { className: css.windowReset, children: reset })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: css.fill, style: { width: `${entry.percentUsed}%`, background: pctColor(entry.percentUsed) } }) })] });
}
/** One budget pool: its remainder, its allowance when disclosed, and a bar. */
function BudgetPoolRow({ pool, t }) {
    return _jsxs("div", { className: css.pool, children: [_jsx("div", { className: css.meta, children: pool.limit === undefined
                    ? t('pool.remaining', { name: pool.name, amount: fmtNumber(pool.remaining) })
                    : t('pool.remainingOfLimit', {
                        name: pool.name,
                        amount: fmtNumber(pool.remaining),
                        limit: fmtNumber(pool.limit),
                    }) }), pool.percentUsed === undefined ? null : _jsx("div", { className: css.bar, children: _jsx("div", { className: css.fill, style: { width: `${pool.percentUsed}%`, background: pctColor(pool.percentUsed) } }) })] });
}
//# sourceMappingURL=QuotaOverlay.js.map