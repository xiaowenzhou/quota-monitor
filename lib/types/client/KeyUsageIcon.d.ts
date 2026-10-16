/**
 * The sidebar rail icon addressing the per-key usage panel.
 *
 * A key rather than a chart: the usage panel's own mark is a bar chart, and the
 * two rail rows must not read as the same entry. The seat supplies `size` and
 * `active`; the accessible name comes from the registration's `label`, so the
 * mark itself is hidden from assistive technology.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/KeyUsageIcon
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Composed props of the rail icon: the sidebar's owner share. */
export type KeyUsageIconProps = PropsRuntime<'sidebar.panellist'>;
export declare function KeyUsageIcon({ size, active }: KeyUsageIconProps): import("react").JSX.Element;
//# sourceMappingURL=KeyUsageIcon.d.ts.map