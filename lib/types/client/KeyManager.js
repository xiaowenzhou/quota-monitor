import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Provider-scoped key inventory and routing controls. */
import { useEffect, useId, useState } from 'react';
import { Button, IconChevronRightOutlineRegular, IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { chipFigure } from "./windows.js";
import css from './Keys.module.css';
export function KeyManager({ t, entry, selected, onSelect, onManage }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [label, setLabel] = useState('');
    const [key, setKey] = useState('');
    const [rename, setRename] = useState('');
    const [mode, setMode] = useState(entry.routing?.mode ?? 'manual');
    const [jevKey, setJevKey] = useState('');
    const routingId = useId();
    const ref = selected ?? entry.credentialRefs[0];
    useEffect(() => { setRename(ref === undefined ? '' : entry.keyNames?.[ref] ?? ''); }, [ref, entry.keyNames]);
    useEffect(() => { setMode(entry.routing?.mode ?? 'manual'); }, [entry.routing?.mode]);
    async function run(request, done) {
        setBusy(true);
        setError('');
        try {
            await onManage({ provider: entry.id, ...request });
            done?.();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : t('keys.failed'));
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("fieldset", { className: css.manager, disabled: busy, children: [_jsx("legend", { children: t('keys.heading', { count: String(entry.credentialRefs.length) }) }), _jsx("p", { className: css.hint, children: t('keys.viewHint') }), _jsx("div", { className: css.list, children: entry.credentialRefs.map(reference => {
                    const account = entry.accounts.find(item => item.credentialRef === reference);
                    const active = entry.activeCredentialRef === reference;
                    const name = entry.keyNames?.[reference] ?? account?.accountName ?? reference;
                    return _jsxs("div", { className: `${css.row} ${ref === reference || active ? css.selected : ''}`, children: [_jsxs("button", { type: "button", className: css.view, "aria-pressed": ref === reference, onClick: () => onSelect(reference), children: [_jsx("strong", { title: name, children: name }), _jsxs("small", { className: css.reference, title: reference, children: [account?.accountName && entry.keyNames?.[reference] ? `${account.accountName} · ` : '', reference] }), _jsx("span", { className: css.figure, children: account?.unlimited ? t('account.unlimited') : chipFigure(account) ?? '—' }), _jsx("small", { className: css.badge, children: account?.status ?? t('keys.unread') })] }), _jsx(Button, { variant: active ? 'outline' : 'ghost', size: "sm", className: active ? css.active : undefined, disabled: active, onClick: () => void run({ action: 'activate', credentialRef: reference }), children: active ? t('keys.active') : t('keys.activate') })] }, reference);
                }) }), ref === undefined ? null : _jsxs("form", { className: css.form, onSubmit: event => { event.preventDefault(); void run({ action: 'rename', credentialRef: ref, name: rename }); }, children: [_jsx("input", { "aria-label": t('keys.name'), placeholder: t('keys.name'), value: rename, onChange: event => setRename(event.target.value), maxLength: 120 }), _jsx(Button, { variant: "primary", size: "sm", type: "submit", children: t('keys.rename') }), _jsx(Button, { variant: "ghost", size: "sm", disabled: entry.credentialRefs.length < 2 || entry.activeCredentialRef === ref, onClick: () => void run({ action: 'remove', credentialRef: ref }, () => { const next = entry.credentialRefs.find(item => item !== ref); if (next)
                            onSelect(next); }), children: t('keys.remove') })] }), _jsxs("details", { className: css.disclosure, children: [_jsxs("summary", { children: [_jsx(IconChevronRightOutlineRegular, { className: css.chevron, size: 14 }), t('keys.add')] }), _jsxs("form", { className: css.form, onSubmit: event => { event.preventDefault(); void run({ action: 'add', name: label, key }, () => { setKey(''); setLabel(''); }); }, children: [_jsx("input", { "aria-label": t('keys.name'), placeholder: t('keys.name'), value: label, onChange: event => setLabel(event.target.value), maxLength: 120 }), _jsx("input", { type: "password", autoComplete: "new-password", required: true, "aria-label": t('keys.secret'), placeholder: t('keys.secret'), value: key, onChange: event => setKey(event.target.value) }), _jsx(Button, { variant: "primary", size: "sm", type: "submit", icon: _jsx(IconPlusOutlineRegular, { size: 14 }), children: t('keys.add') })] }), _jsx("p", { className: css.hint, children: t('keys.storageHint') })] }), _jsxs("form", { className: css.routing, onSubmit: event => { event.preventDefault(); void run({ action: 'routing', mode, ...jevKey ? { jevKey } : {} }, () => setJevKey('')); }, children: [_jsxs("div", { className: css.fieldText, children: [_jsx("label", { htmlFor: routingId, children: t('routing.heading') }), _jsx("p", { className: css.hint, children: t('routing.hint') })] }), _jsxs("div", { className: css.controls, children: [_jsxs("select", { id: routingId, value: mode, onChange: event => { const value = event.target.value; if (value === 'manual' || value === 'quota' || value === 'jev')
                                    setMode(value); }, children: [_jsx("option", { value: "manual", children: t('routing.manual') }), _jsx("option", { value: "quota", children: t('routing.quota') }), _jsx("option", { value: "jev", children: t('routing.jev') })] }), mode === 'jev' ? _jsx("input", { type: "password", autoComplete: "new-password", "aria-label": t('routing.jevKey'), placeholder: entry.routing?.jevConfigured ? t('routing.keepKey') : t('routing.jevKey'), value: jevKey, onChange: event => setJevKey(event.target.value) }) : null, _jsx(Button, { variant: "outline", size: "sm", type: "submit", children: t('routing.save') })] })] }), entry.routing?.lastDecision === 'jev-fallback' ? _jsx("p", { role: "status", children: t('routing.fallback') }) : null, busy ? _jsx("p", { role: "status", children: t('keys.saving') }) : null, error ? _jsx("p", { role: "alert", className: css.error, children: error }) : null] });
}
//# sourceMappingURL=KeyManager.js.map