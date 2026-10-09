import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The account card: one provider's balance or plan windows, with the provider
 * selector, the endpoint status, and the manual allowance fallback.
 *
 * A non-`ok` status renders its reason instead of a figure. The card never
 * substitutes zero for a number it could not read.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/AccountCard
 */
import { useEffect, useState } from 'react';
import { fmtAmount, fmtNumber, fmtTime, fmtTokens, initialsOf, resetLabel } from "./format.js";
import { WINDOW_KEYS } from "./windows.js";
import css from './UsagePanel.module.css';
/** Dictionary key naming each account status. */
const STATUS_KEYS = Object.freeze({
    'ok': 'status.ok',
    'not-configured': 'status.notConfigured',
    'unauthorized': 'status.unauthorized',
    'rate-limited': 'status.rateLimited',
    'unsupported': 'status.unsupported',
    'invalid-response': 'status.invalidResponse',
    'blocked': 'status.blocked',
    'unavailable': 'status.unavailable',
});
/** Dictionary key naming each card frame. */
const MODE_KEYS = Object.freeze({
    balance: 'account.mode.balance',
    subscription: 'account.mode.subscription',
    unsupported: 'account.mode.unsupported',
});
/** Severity class for a figure, from the account's own warning level. */
function toneOf(warning) {
    if (warning === 'critical')
        return css.critical ?? '';
    if (warning === 'warning')
        return css.warning ?? '';
    return css.normal ?? '';
}
/** Status-pill class: a read that succeeded is tinted by its own severity. */
function pillOf(account) {
    if (account.status !== 'ok') {
        return account.status === 'not-configured' || account.status === 'unsupported'
            ? ''
            : css.pillError ?? '';
    }
    if (account.warning === 'critical')
        return css.pillError ?? '';
    return account.warning === 'warning' ? css.pillWarn ?? '' : css.pillOk ?? '';
}
/** Selector-dot class for one route's last known status. */
function dotOf(status, warning) {
    if (status !== 'ok') {
        return status === 'not-configured' || status === 'unsupported' ? '' : css.dotError ?? '';
    }
    if (warning === 'critical')
        return css.dotError ?? '';
    return warning === 'warning' ? css.dotWarn ?? '' : css.dotOk ?? '';
}
/** The provider selector: one chip per watched route, with its status dot. */
function Selector({ providers, selected, onSelect }) {
    return _jsx("div", { className: css.selector, children: providers.map(entry => _jsxs("button", { type: "button", "aria-pressed": entry.id === selected, className: `${css.selectorChip} ${entry.id === selected ? css.selectorChipActive : ''}`, onClick: () => { onSelect(entry.id); }, children: [_jsx("span", { className: `${css.dot} ${dotOf(entry.status, entry.warning)}`, "aria-hidden": "true" }), entry.name] }, entry.id)) });
}
/** One plan window: a labelled bar with its used share and reset countdown. */
function WindowRow({ t, window: entry, tone }) {
    const reset = resetLabel(t, entry.resetAt);
    return _jsxs("div", { className: css.windowRow, children: [_jsxs("div", { className: css.windowHead, children: [_jsx("span", { className: css.windowName, children: t(WINDOW_KEYS[entry.kind]) }), _jsx("span", { className: css.windowValue, children: t('window.used', { percent: String(entry.percentUsed) }) })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: `${css.barFill} ${tone}`, style: { width: `${entry.percentUsed}%` } }) }), reset === undefined ? null : _jsx("span", { className: css.windowMeta, children: reset })] });
}
/** One budget pool row. */
function PoolRow({ t, pool }) {
    const amount = fmtAmount(pool.remaining);
    return _jsx("li", { className: css.poolRow, children: pool.limit === undefined
            ? t('pool.remaining', { name: pool.name, amount })
            : t('pool.remainingOfLimit', { name: pool.name, amount, limit: fmtAmount(pool.limit) }) });
}
/** Rows of one gateway table the card shows before it says how many it hides. */
const GATEWAY_ROWS = 6;
/** Dictionary key naming each gateway usage table, in display order. */
const GATEWAY_GROUPS = Object.freeze({
    day: 'gateway.days',
    model: 'gateway.models',
    pool: 'gateway.pools',
});
/** Display order of the gateway usage tables. */
const GATEWAY_ORDER = Object.freeze(['day', 'model', 'pool']);
/** The endpoint's own token total for a row: its own, or the four buckets summed. */
function gatewayTokens(row) {
    if (row.totalTokens !== undefined)
        return row.totalTokens;
    const buckets = [row.inputTokens, row.outputTokens, row.cacheReadTokens, row.cacheWriteTokens];
    const present = buckets.filter((value) => value !== undefined);
    return present.length === 0 ? undefined : present.reduce((total, value) => total + value, 0);
}
/** One row of a gateway table: its label and the figures the endpoint reported. */
function GatewayRow({ t, row }) {
    const parts = [];
    if (row.requests !== undefined)
        parts.push(t('gateway.requests', { count: fmtNumber(row.requests) }));
    const tokens = gatewayTokens(row);
    if (tokens !== undefined)
        parts.push(fmtTokens(tokens));
    if (row.cost !== undefined)
        parts.push(fmtAmount(row.cost, row.currency));
    return _jsxs("li", { className: css.gatewayRow, children: [_jsx("span", { className: css.gatewayLabel, title: row.label, children: row.label }), _jsx("span", { className: css.gatewayValue, children: parts.join(' · ') })] });
}
/**
 * Usage the account endpoint reported for its own credential.
 *
 * This is the gateway's ledger, not this plugin's fold: it is what makes two
 * keys behind one provider route tell themselves apart, and it covers calls
 * that predate this process.
 */
function GatewayUsage({ t, usage }) {
    const groups = GATEWAY_ORDER
        .map(kind => [kind, usage.filter(row => row.kind === kind)])
        .filter(([, rows]) => rows.length > 0);
    if (groups.length === 0)
        return null;
    return _jsxs("div", { className: css.pools, children: [_jsx("span", { className: css.poolsTitle, children: t('gateway.heading') }), _jsx("p", { className: css.gatewayHint, children: t('gateway.hint') }), groups.map(([kind, rows]) => _jsxs("div", { children: [_jsx("span", { className: css.gatewayGroup, children: t(GATEWAY_GROUPS[kind]) }), _jsx("ul", { className: css.poolList, children: rows.slice(0, GATEWAY_ROWS).map(row => _jsx(GatewayRow, { t: t, row: row }, `${row.kind}:${row.label}`)) }), rows.length <= GATEWAY_ROWS
                        ? null
                        : _jsx("span", { className: css.gatewayMore, children: t('gateway.more', { count: String(GATEWAY_ROWS) }) })] }, kind))] });
}
/** The manual allowance input, shown when the provider publishes no account endpoint. */
function ManualBalance({ t, provider, total, remaining, onChange }) {
    const [draft, setDraft] = useState(total === undefined ? '' : String(total));
    // A background refresh may deliver a new stored allowance; adopt it unless
    // the reader is mid-edit, which the draft's divergence cannot distinguish,
    // so the provider key is the reset point.
    useEffect(() => {
        setDraft(total === undefined ? '' : String(total));
    }, [provider, total]);
    return _jsxs("div", { className: css.manual, children: [_jsxs("div", { className: css.manualHead, children: [_jsx("span", { className: css.manualTitle, children: t('manual.heading') }), remaining === undefined
                        ? null
                        : _jsx("span", { className: css.manualValue, children: t('manual.remaining', { amount: fmtAmount(remaining) }) })] }), _jsx("input", { className: css.manualInput, type: "number", inputMode: "decimal", value: draft, placeholder: t('manual.placeholder'), "aria-label": t('manual.heading'), onChange: (event) => { setDraft(event.target.value); }, onBlur: () => { onChange(provider, Number(draft)); } }), _jsx("p", { className: css.manualHint, children: t('manual.hint') })] });
}
/** The identity row: avatar, provider name, mode and adapter chips, status pill. */
function Identity({ t, name, account }) {
    return _jsxs("div", { className: css.accountHead, children: [_jsx("span", { className: css.avatar, "aria-hidden": "true", children: initialsOf(name) }), _jsxs("span", { className: css.accountIdentity, children: [_jsx("span", { className: css.accountName, children: name }), _jsxs("span", { className: css.accountMeta, children: [account === undefined ? null : _jsx("span", { className: css.chip, children: t(MODE_KEYS[account.mode]) }), account === undefined ? null : _jsx("span", { className: css.chip, children: account.adapter }), account?.plan === undefined ? null : _jsx("span", { className: css.chip, children: account.plan })] })] }), account === undefined
                ? null
                : _jsx("span", { className: `${css.pill} ${pillOf(account)}`, children: t(STATUS_KEYS[account.status]) })] });
}
/** The figures of a balance account: its remainder, then what it was measured against. */
function Figures({ t, account, tone }) {
    if (account.remaining === undefined && account.unlimited !== true)
        return null;
    return _jsxs("div", { className: css.hero, children: [_jsxs("span", { className: css.heroFigure, children: [_jsx("span", { className: css.heroLabel, children: t('account.remaining') }), _jsx("span", { className: `${css.heroValue} ${tone}`, children: account.unlimited === true
                            ? t('account.unlimited')
                            : fmtAmount(account.remaining, account.currency) })] }), _jsxs("span", { className: css.heroSecondaries, children: [account.used === undefined ? null : _jsxs("span", { className: css.secondary, children: [_jsx("span", { className: css.secondaryLabel, children: t('account.used') }), _jsx("span", { className: css.secondaryValue, children: fmtAmount(account.used, account.currency) })] }), account.limit === undefined ? null : _jsxs("span", { className: css.secondary, children: [_jsx("span", { className: css.secondaryLabel, children: t('account.limit') }), _jsx("span", { className: css.secondaryValue, children: fmtAmount(account.limit, account.currency) })] })] })] });
}
export function AccountCard({ t, providers, selected, account, manualTotal, manualRemaining, onSelect, onRefresh, onManualChange, }) {
    const tone = toneOf(account?.warning);
    const windows = account?.planWindows ?? [];
    const pools = account?.budgetPools ?? [];
    const showManual = account !== undefined && account.status !== 'ok';
    const name = providers.find(entry => entry.id === selected)?.name ?? selected ?? '';
    return _jsxs("div", { className: `${css.card} ${css.cardTint}`, children: [_jsxs("div", { className: css.sectionHead, children: [_jsx(Selector, { providers: providers, selected: selected, onSelect: onSelect }), _jsx("button", { type: "button", className: css.action, onClick: onRefresh, children: t('action.refresh') })] }), _jsx(Identity, { t: t, name: name, account: account }), account === undefined ? null : account.status === 'ok'
                ? _jsxs(_Fragment, { children: [_jsx(Figures, { t: t, account: account, tone: tone }), windows.length === 0 ? null : _jsx("div", { className: css.windows, children: windows.map(entry => _jsx(WindowRow, { t: t, window: entry, tone: tone }, entry.kind)) }), pools.length === 0 ? null : _jsxs("div", { className: css.pools, children: [_jsx("span", { className: css.poolsTitle, children: t('pools.heading') }), _jsx("ul", { className: css.poolList, children: pools.map(pool => _jsx(PoolRow, { t: t, pool: pool }, pool.name)) })] }), account.usage === undefined ? null : _jsx(GatewayUsage, { t: t, usage: account.usage }), _jsxs("p", { className: css.cardMeta, children: [t('account.source', { adapter: account.adapter }), ' · ', t('account.updated', { time: fmtTime(account.fetchedAt) })] })] })
                : _jsxs("div", { children: [_jsx("p", { className: css.status, children: t(STATUS_KEYS[account.status]) }), account.reason === undefined ? null : _jsx("p", { className: css.reason, children: account.reason }), account.missingCredentials === undefined ? null : _jsx("p", { className: css.reason, children: t('status.missingCredentials', { names: account.missingCredentials.join(', ') }) })] }), showManual && selected !== undefined
                ? _jsx(ManualBalance, { t: t, provider: selected, total: manualTotal, remaining: manualRemaining, onChange: onManualChange })
                : null] });
}
//# sourceMappingURL=AccountCard.js.map