import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * The composer pill: the selected route's allowance beside the model selector,
 * and the reading behind it once the reader asks for more.
 *
 * The pill states the two tightest plan windows, or a wallet's remainder, and
 * opens a panel with the whole reading: every window with its reset countdown
 * and disclosed remainder, the balance, the budget pools, and the usage the
 * endpoint itself reported for this credential. It renders nothing when that
 * route's provider publishes no account endpoint — a control that always showed
 * something would be noise — and it stands down when another plugin's own
 * allowance chip already speaks for that exact route (see
 * {@link rivalStatesRoute}).
 *
 * That decision belongs here rather than at registration: a rival registers its
 * entry unconditionally and renders nothing unless the selected route is its
 * own, so the seat is occupied even while the rival says nothing — and this pill
 * is the only one that would fill that silence.
 *
 * The route comes from the session's own `modelSelection` projection, so the
 * pill follows the model the next request will use rather than the account
 * card's independent selection.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { MenuSurface, useAnchoredPosition, useDismissOnOutsidePointer } from '@deepseek-ai/dsh-client-ui-primitives';
import { fmtAmount, fmtNumber, fmtPercent, fmtTime, fmtTokens, resetLabel } from "./format.js";
import { accountTone, hasFigure, WINDOW_KEYS, worstWindows } from "./windows.js";
import { PILL_ID, rivalStatesRoute } from "./yield.js";
import css from './QuotaPill.module.css';
/** How many windows the pill states before the panel carries the rest. */
const PILL_WINDOWS = 2;
/** How many rows of one gateway usage table the panel shows. */
const GATEWAY_ROWS = 4;
/** How often the pill re-reads the Host's cached reading. */
const POLL_MS = 60_000;
/** Display order of the gateway usage tables. */
const GATEWAY_ORDER = Object.freeze(['day', 'model', 'pool']);
/** Dictionary key naming each gateway usage table. */
const GATEWAY_KEYS = Object.freeze({
    day: 'gateway.days',
    model: 'gateway.models',
    pool: 'gateway.pools',
});
/**
 * The endpoint's own token total for one row: its own, or the four buckets summed.
 * @param row - one gateway usage row.
 * @returns the token figure, or undefined when the row reported none.
 */
function gatewayTokens(row) {
    if (row.totalTokens !== undefined)
        return row.totalTokens;
    const present = [row.inputTokens, row.outputTokens, row.cacheReadTokens, row.cacheWriteTokens]
        .filter((value) => value !== undefined);
    return present.length === 0 ? undefined : present.reduce((total, value) => total + value, 0);
}
/**
 * One gateway usage row's figures, as a single line.
 * @param t - the panel's namespace-bound translate.
 * @param row - the row to describe.
 * @returns the figures the endpoint reported for it.
 */
function gatewayFacts(t, row) {
    const parts = [];
    if (row.requests !== undefined)
        parts.push(t('gateway.requests', { count: fmtNumber(row.requests) }));
    const tokens = gatewayTokens(row);
    if (tokens !== undefined)
        parts.push(fmtTokens(tokens));
    if (row.cost !== undefined)
        parts.push(fmtAmount(row.cost, row.currency));
    return parts.join(' · ');
}
/**
 * One plan window inside the panel: its bar, its share, and what resets it.
 * @param props - the window, its account, and the translate seat.
 * @returns the row element.
 */
function WindowDetail({ t, account, window: entry }) {
    const reset = resetLabel(t, entry.resetAt);
    const remaining = entry.remaining === undefined
        ? undefined
        : t('window.remaining', { amount: fmtAmount(entry.remaining, account.currency) });
    const meta = [reset, remaining].filter((part) => part !== undefined);
    return _jsxs("div", { className: css.detailRow, children: [_jsxs("div", { className: css.detailHead, children: [_jsx("span", { className: css.detailLabel, children: t(WINDOW_KEYS[entry.kind]) }), _jsx("span", { className: css.detailValue, children: fmtPercent(entry.percentUsed) })] }), _jsx("div", { className: css.bar, children: _jsx("div", { className: `${css.barFill} ${entry.percentUsed >= 100 ? css.critical : entry.percentUsed >= 80 ? css.warning : ''}`, style: { width: `${Math.min(100, entry.percentUsed)}%` } }) }), meta.length === 0 ? null : _jsx("span", { className: css.detailMeta, children: meta.join(' · ') })] });
}
export function QuotaPill({ t, quota, rivals, useProjection }) {
    const selection = useProjection('modelSelection');
    const provider = selection?.next?.provider;
    // The seat's occupant list, read as an external store: a rival chip may
    // arrive or leave at any time, and this pill re-decides then rather than
    // registering conditionally (see `rivalStatesRoute`).
    const seatVersion = useSyncExternalStore(rivals.subscribe, rivals.version);
    const standsDown = useMemo(() => {
        void seatVersion;
        return provider === undefined ? false : rivalStatesRoute(rivals.ids(), PILL_ID, provider);
    }, [rivals, seatVersion, provider]);
    const [account, setAccount] = useState();
    const [reading, setReading] = useState(false);
    const [open, setOpen] = useState(false);
    const rootRef = useRef(null);
    const panelRef = useRef(null);
    // The composer sits on the window's bottom edge, so the panel opens upward.
    const position = useAnchoredPosition({
        open,
        anchorRef: rootRef,
        panelRef,
        side: 'top',
        align: 'start',
        gap: 8,
        margin: 12,
    });
    useDismissOnOutsidePointer(rootRef, open, setOpen, panelRef);
    const read = useCallback(async (id, refresh) => {
        setReading(true);
        try {
            const result = await quota.getAccount({ provider: id, refresh });
            if (result.ok)
                setAccount(result.value);
        }
        finally {
            setReading(false);
        }
    }, [quota]);
    useEffect(() => {
        if (provider === undefined)
            return;
        // Another route's figures must never appear under a new selection.
        setAccount(undefined);
        setOpen(false);
        void read(provider, false);
        const timer = setInterval(() => { void read(provider, false); }, POLL_MS);
        return () => { clearInterval(timer); };
    }, [provider, read]);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (event) => {
            if (event.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('keydown', onKey); };
    }, [open]);
    if (provider === undefined || standsDown || account === undefined)
        return null;
    // A stale reading for another route, or one with no figure to state, says
    // nothing worth the tool row's width.
    if (account.id !== provider || account.status !== 'ok' || !hasFigure(account))
        return null;
    const tone = accountTone(account);
    const toneClass = tone === 'critical' ? css.critical : tone === 'warning' ? css.warning : undefined;
    const windows = worstWindows(account, PILL_WINDOWS);
    const unlimited = account.unlimited === true;
    const showBalance = !unlimited && windows.length === 0 && account.remaining !== undefined;
    const groups = GATEWAY_ORDER
        .map(kind => [kind, (account.usage ?? []).filter(row => row.kind === kind)])
        .filter(([, rows]) => rows.length > 0);
    return _jsxs("span", { className: css.root, ref: rootRef, children: [_jsxs("button", { type: "button", className: `${css.pill} ${toneClass ?? ''} ${reading ? css.reading : ''}`, "aria-expanded": open, "aria-haspopup": "dialog", "aria-label": t('pill.label', { provider: account.name }), onClick: () => setOpen(current => !current), children: [_jsx("span", { className: css.dot, "aria-hidden": "true" }), _jsx("span", { className: css.name, children: account.name }), unlimited
                        ? _jsx("span", { className: css.figure, children: t('pill.unlimited') })
                        : windows.map(window => _jsx("span", { className: css.window, children: t('pill.window', {
                                label: t(WINDOW_KEYS[window.kind]),
                                percent: fmtPercent(window.percentUsed),
                            }) }, window.kind)), showBalance
                        ? _jsx("span", { className: css.figure, children: fmtAmount(account.remaining, account.currency) })
                        : null] }), !open ? null : _jsxs(MenuSurface, { ref: panelRef, role: "dialog", "aria-label": t('pill.details', { provider: account.name }), className: css.panel, style: {
                    ...position ?? {},
                    // Placed by layout effect on the first frame; hidden until then so it
                    // never paints at the viewport origin.
                    visibility: position === null ? 'hidden' : 'visible',
                }, children: [_jsxs("div", { className: css.panelHead, children: [_jsx("span", { className: css.panelName, children: account.name }), account.plan === undefined ? null : _jsx("span", { className: css.panelPlan, children: account.plan }), _jsx("button", { type: "button", className: css.panelAction, disabled: reading, onClick: () => void read(provider, true), children: reading ? t('action.refreshing') : t('action.refresh') })] }), (account.planWindows ?? []).map(window => _jsx(WindowDetail, { t: t, account: account, window: window }, window.kind)), unlimited
                        ? _jsx("p", { className: css.detailMeta, children: t('account.unlimited') })
                        : account.remaining === undefined ? null : _jsxs("dl", { className: css.detailList, children: [_jsxs("div", { className: css.detailPair, children: [_jsx("dt", { children: t('account.remaining') }), _jsx("dd", { children: fmtAmount(account.remaining, account.currency) })] }), account.used === undefined ? null : _jsxs("div", { className: css.detailPair, children: [_jsx("dt", { children: t('account.used') }), _jsx("dd", { children: fmtAmount(account.used, account.currency) })] }), account.limit === undefined ? null : _jsxs("div", { className: css.detailPair, children: [_jsx("dt", { children: t('account.limit') }), _jsx("dd", { children: fmtAmount(account.limit, account.currency) })] })] }), account.budgetPools === undefined || account.budgetPools.length === 0 ? null : _jsxs(_Fragment, { children: [_jsx("p", { className: css.panelHeading, children: t('pools.heading') }), _jsx("ul", { className: css.detailList, children: account.budgetPools.map(pool => _jsx("li", { className: css.detailMeta, children: pool.limit === undefined
                                        ? t('pool.remaining', { name: pool.name, amount: fmtAmount(pool.remaining) })
                                        : t('pool.remainingOfLimit', {
                                            name: pool.name,
                                            amount: fmtAmount(pool.remaining),
                                            limit: fmtAmount(pool.limit),
                                        }) }, pool.name)) })] }), groups.length === 0 ? null : _jsxs(_Fragment, { children: [_jsx("p", { className: css.panelHeading, children: t('gateway.heading') }), groups.map(([kind, rows]) => _jsxs("div", { className: css.gatewayGroup, children: [_jsx("span", { className: css.panelHeading, children: t(GATEWAY_KEYS[kind]) }), _jsx("ul", { className: css.detailList, children: rows.slice(0, GATEWAY_ROWS).map(row => _jsxs("li", { className: css.gatewayRow, children: [_jsx("span", { className: css.gatewayLabel, title: row.label, children: row.label }), _jsx("span", { className: css.gatewayValue, children: gatewayFacts(t, row) })] }, row.label)) }), rows.length > GATEWAY_ROWS
                                        ? _jsx("span", { className: css.detailMeta, children: t('gateway.more', { count: String(GATEWAY_ROWS) }) })
                                        : null] }, kind))] }), _jsxs("p", { className: css.panelMeta, children: [t('account.updated', { time: fmtTime(account.fetchedAt) }), ' · ', t('account.source', { adapter: account.adapter })] })] })] });
}
//# sourceMappingURL=QuotaPill.js.map