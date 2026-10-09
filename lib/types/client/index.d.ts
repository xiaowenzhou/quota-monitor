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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * Required services: the typed Remote mount, the slot registry, and the
 * locale service owning the panel's dictionaries.
 *
 * `remote.quotaMonitor` is deliberately absent: this plugin mounts that
 * namespace itself, and listing a service the same `apply` registers would
 * deadlock on its own dependency.
 */
export declare const inject: string[];
/**
 * Client plugin body: register the panel's copy, mount the Host face, then
 * register the rail entry and the panel it addresses.
 *
 * The mount is awaited and the registrations run in a child scope declaring
 * `remote.quotaMonitor`: the namespace service exists only once `$mount`
 * resolves, and the panel reads it through that scope's injected record.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): Promise<void>;
//# sourceMappingURL=index.d.ts.map