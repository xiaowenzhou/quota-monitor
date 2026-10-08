/**
 * Quota monitor browser half: mounts the generated `quotaMonitor` Remote
 * contribution, adds a sidebar rail entry, and registers the matching usage
 * panel in the layout's `main` slot.
 *
 * The rail entry's id and the `main` key are the same string: that is how the
 * sidebar addresses the panel it selects.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the `ctx.remote` merge offered by the Gateway client face.
import type {} from '@deepseek-ai/dsh-api-gateway/client'
// Type-only: pulls the `ctx.locale` merge owned by the locale plugin.
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-layout SlotMap merge (the root-scoped `main` seat).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Type-only: pulls the ui-sidebar SlotMap merge (the `sidebar.panellist` seat).
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
// Type-only: pulls the `ctx.slots` merge owned by the renderer registry.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import quotaMonitorRemote from '@deepseek-ai/dsh-extension-quota-monitor/remote'
import { UsagePanel, type UsagePanelInjected } from './UsagePanel.tsx'
import { UsageIcon } from './UsageIcon.tsx'
import { en, NS, zh } from './locales.ts'

/** Sidebar entry id, and the `main` key it addresses. */
const PANEL_ID = 'quota-monitor'

/**
 * Required services: the typed Remote mount, the slot registry, and the
 * locale service owning the panel's dictionaries.
 *
 * `remote.quotaMonitor` is deliberately absent: this plugin mounts that
 * namespace itself, and listing a service the same `apply` registers would
 * deadlock on its own dependency.
 */
export const inject = ['remote', 'slots', 'locale']

/**
 * Client plugin body: register the panel's copy, mount the Host face, then
 * register the rail entry and the panel it addresses.
 *
 * The mount is awaited and the registrations run in a child scope declaring
 * `remote.quotaMonitor`: the namespace service exists only once `$mount`
 * resolves, and the panel reads it through that scope's injected record.
 * @param ctx - client root context.
 */
export async function apply(ctx: ClientContext): Promise<void> {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'quota-monitor.copy')
  // Registration-time text (the rail row's title and accessible name) reads
  // through the bound translate as a thunk, so it follows the active locale
  // without re-registration.
  const t = ctx.locale.bind(NS)

  await ctx.remote.$mount(quotaMonitorRemote)

  ctx.inject(['slots', 'remote.quotaMonitor'], (scope: ClientContext) => {
    scope.slots.inject('sidebar.panellist', () => scope.slots.register({
      name: 'sidebar.panellist',
      id: PANEL_ID,
      order: 40,
      label: () => t('nav.label'),
    }, UsageIcon))

    scope.slots.inject('main', () => scope.slots.register({
      name: 'main',
      key: PANEL_ID,
      locale: NS,
      inject: (): UsagePanelInjected => ({ quota: scope.remote.quotaMonitor }),
    }, UsagePanel))
  })
}
