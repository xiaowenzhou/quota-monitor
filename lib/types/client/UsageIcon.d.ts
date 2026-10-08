/**
 * The sidebar rail icon addressing the usage panel.
 *
 * The seat supplies `size` and `active`; the accessible name comes from the
 * registration's `label`, so the mark itself is hidden from assistive
 * technology.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsageIcon
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Composed props of the rail icon: the sidebar's owner share. */
export type UsageIconProps = PropsRuntime<'sidebar.panellist'>;
export declare function UsageIcon({ size, active }: UsageIconProps): import("react").JSX.Element;
//# sourceMappingURL=UsageIcon.d.ts.map