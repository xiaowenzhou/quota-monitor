/**
 * Quota monitor browser half: mounts the generated `quotaMonitor` Remote
 * contribution, adds a sidebar rail entry, and registers the matching usage
 * panel in the layout's `main` slot.
 *
 * The rail entry's id and the `main` key are the same string: that is how the
 * sidebar addresses the panel it selects.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client
 */
import quotaMonitorRemote from '@deepseek-ai/dsh-extension-quota-monitor/remote';
import { UsagePanel } from "./UsagePanel.js";
import { UsageIcon } from "./UsageIcon.js";
import { en, NS, zh } from "./locales.js";
/** Sidebar entry id, and the `main` key it addresses. */
const PANEL_ID = 'quota-monitor';
/**
 * Required services: the typed Remote mount, the slot registry, and the
 * locale service owning the panel's dictionaries.
 *
 * `remote.quotaMonitor` is deliberately absent: this plugin mounts that
 * namespace itself, and listing a service the same `apply` registers would
 * deadlock on its own dependency.
 */
export const inject = ['remote', 'slots', 'locale'];
/**
 * Client plugin body: register the panel's copy, mount the Host face, then
 * register the rail entry and the panel it addresses.
 *
 * The mount is awaited and the registrations run in a child scope declaring
 * `remote.quotaMonitor`: the namespace service exists only once `$mount`
 * resolves, and the panel reads it through that scope's injected record.
 * @param ctx - client root context.
 */
export async function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'quota-monitor.copy');
    // Registration-time text (the rail row's title and accessible name) reads
    // through the bound translate as a thunk, so it follows the active locale
    // without re-registration.
    const t = ctx.locale.bind(NS);
    await ctx.remote.$mount(quotaMonitorRemote);
    ctx.inject(['slots', 'remote.quotaMonitor'], (scope) => {
        scope.slots.inject('sidebar.panellist', () => scope.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 40,
            label: () => t('nav.label'),
        }, UsageIcon));
        scope.slots.inject('main', () => scope.slots.register({
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({ quota: scope.remote.quotaMonitor }),
        }, UsagePanel));
    });
}
//# sourceMappingURL=index.js.map