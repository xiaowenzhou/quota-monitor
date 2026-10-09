/**
 * Quota monitor browser half: mounts the generated `quotaMonitor` Remote
 * contribution, adds a sidebar rail entry, registers the matching usage panel in
 * the layout's `main` slot, and puts the selected route's allowance on the
 * composer's tool row beside the model selector.
 *
 * The rail entry's id and the `main` key are the same string: that is how the
 * sidebar addresses the panel it selects.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client
 */
import quotaMonitorRemote from '@deepseek-ai/dsh-extension-quota-monitor/remote';
import { UsagePanel } from "./UsagePanel.js";
import { QuotaPill } from "./QuotaPill.js";
import { UsageIcon } from "./UsageIcon.js";
import { PILL_ID } from "./yield.js";
import { en, NS, zh } from "./locales.js";
/**
 * Sidebar entry id, and the `main` key it addresses.
 */
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
        // The composer's own seat, so the selected model's allowance sits beside the
        // selector that chose it. The entry reads the session's model selection
        // through the standard projection seat rather than another plugin's state.
        //
        // The seat is a list another plugin may already occupy with its own
        // allowance chip — `dsh-cline-pass` publishes `cline-pass-usage` — and such
        // a chip registers unconditionally, rendering nothing unless the selected
        // route is its own. Presence in the seat therefore cannot decide anything up
        // front: this entry is always registered, and the pill stands down inside
        // its own render, once the selected route is known. It reads the seat's
        // occupant list through an observable face rather than sampling it once, so
        // a rival arriving or leaving re-decides on the spot.
        scope.slots.inject('conversation.input.right', () => {
            // Built once per seat: the pill reads this through `useSyncExternalStore`,
            // so an identity that changed each render would re-subscribe every frame.
            const rivals = {
                version: () => scope.slots.getVersion('conversation.input.right'),
                subscribe: listener => scope.slots.subscribe('conversation.input.right', listener),
                // `entriesOfSlot` yields the live winner per cell, so a rival that
                // abdicated after a render crash no longer claims the seat.
                ids: () => scope.slots
                    .entriesOfSlot('conversation.input.right')
                    .map(candidate => candidate.options.id),
            };
            return scope.slots.register({
                name: 'conversation.input.right',
                id: PILL_ID,
                order: 90,
                locale: NS,
                inject: () => ({ quota: scope.remote.quotaMonitor, rivals }),
            }, QuotaPill);
        });
    });
}
//# sourceMappingURL=index.js.map