/** Provider-scoped key inventory and routing controls. */
import { useEffect, useState } from 'react'
import type { QuotaKeyRequest, QuotaProviderEntry, QuotaRoutingMode } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import { chipFigure } from './windows.ts'
import css from './Keys.module.css'

export function KeyManager({ t, entry, selected, onSelect, onManage }: {
  t: QuotaTranslate
  entry: QuotaProviderEntry
  selected: string | undefined
  onSelect: (ref: string) => void
  onManage: (request: QuotaKeyRequest) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [rename, setRename] = useState('')
  const [mode, setMode] = useState<QuotaRoutingMode>(entry.routing?.mode ?? 'manual')
  const [jevKey, setJevKey] = useState('')
  const ref = selected ?? entry.credentialRefs[0]
  useEffect(() => { setRename(ref === undefined ? '' : entry.keyNames?.[ref] ?? '') }, [ref, entry.keyNames])
  useEffect(() => { setMode(entry.routing?.mode ?? 'manual') }, [entry.routing?.mode])
  async function run(request: Omit<QuotaKeyRequest, 'provider'>, done?: () => void) {
    setBusy(true); setError('')
    try { await onManage({ provider: entry.id, ...request }); done?.() }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('keys.failed')) }
    finally { setBusy(false) }
  }
  return <fieldset className={css.manager} disabled={busy}>
    <legend>{t('keys.heading', { count: String(entry.credentialRefs.length) })}</legend>
    <p className={css.hint}>{t('keys.viewHint')}</p>
    <div className={css.list}>
      {entry.credentialRefs.map(reference => {
        const account = entry.accounts.find(item => item.credentialRef === reference)
        const active = entry.activeCredentialRef === reference
        return <div className={`${css.row} ${ref === reference ? css.selected : ''}`} key={reference}>
          <button type="button" className={css.view} aria-pressed={ref === reference} onClick={() => onSelect(reference)}>
            <strong>{entry.keyNames?.[reference] ?? account?.accountName ?? reference}</strong>
            <small>{account?.accountName && entry.keyNames?.[reference] ? `${account.accountName} · ` : ''}{reference}</small>
            <span>{account?.unlimited ? t('account.unlimited') : chipFigure(account) ?? '—'}</span>
            <small>{account?.status ?? t('keys.unread')}</small>
          </button>
          <button type="button" className={css.button} disabled={active} onClick={() => void run({ action: 'activate', credentialRef: reference })}>
            {active ? t('keys.active') : t('keys.activate')}
          </button>
        </div>
      })}
    </div>
    {ref === undefined ? null : <form className={css.form} onSubmit={event => { event.preventDefault(); void run({ action: 'rename', credentialRef: ref, name: rename }) }}>
      <input aria-label={t('keys.name')} placeholder={t('keys.name')} value={rename} onChange={event => setRename(event.target.value)} maxLength={120} />
      <button className={css.button} type="submit">{t('keys.rename')}</button>
      <button className={css.button} type="button" disabled={entry.credentialRefs.length < 2 || entry.activeCredentialRef === ref}
        onClick={() => void run({ action: 'remove', credentialRef: ref }, () => { const next = entry.credentialRefs.find(item => item !== ref); if (next) onSelect(next) })}>{t('keys.remove')}</button>
    </form>}
    <details>
      <summary>{t('keys.add')}</summary>
      <form className={css.form} onSubmit={event => { event.preventDefault(); void run({ action: 'add', name: label, key }, () => { setKey(''); setLabel('') }) }}>
        <input aria-label={t('keys.name')} placeholder={t('keys.name')} value={label} onChange={event => setLabel(event.target.value)} maxLength={120} />
        <input type="password" autoComplete="new-password" required aria-label={t('keys.secret')} placeholder={t('keys.secret')} value={key} onChange={event => setKey(event.target.value)} />
        <button className={css.button} type="submit">{t('keys.add')}</button>
      </form>
      <p className={css.hint}>{t('keys.storageHint')}</p>
    </details>
    <form className={css.form} onSubmit={event => { event.preventDefault(); void run({ action: 'routing', mode, ...jevKey ? { jevKey } : {} }, () => setJevKey('')) }}>
      <label>{t('routing.heading')} <select value={mode} onChange={event => { const value = event.target.value; if (value === 'manual' || value === 'quota' || value === 'jev') setMode(value) }}>
        <option value="manual">{t('routing.manual')}</option><option value="quota">{t('routing.quota')}</option><option value="jev">{t('routing.jev')}</option>
      </select></label>
      {mode === 'jev' ? <input type="password" autoComplete="new-password" aria-label={t('routing.jevKey')} placeholder={entry.routing?.jevConfigured ? t('routing.keepKey') : t('routing.jevKey')} value={jevKey} onChange={event => setJevKey(event.target.value)} /> : null}
      <button className={css.button} type="submit">{t('routing.save')}</button>
    </form>
    <p className={css.hint}>{t('routing.hint')}</p>
    {entry.routing?.lastDecision === 'jev-fallback' ? <p role="status">{t('routing.fallback')}</p> : null}
    {busy ? <p role="status">{t('keys.saving')}</p> : null}
    {error ? <p role="alert" className={css.error}>{error}</p> : null}
  </fieldset>
}
