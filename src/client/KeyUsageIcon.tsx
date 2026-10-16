/**
 * The sidebar rail icon addressing the per-key usage panel.
 *
 * A key rather than a chart: the usage panel's own mark is a bar chart, and the
 * two rail rows must not read as the same entry. The seat supplies `size` and
 * `active`; the accessible name comes from the registration's `label`, so the
 * mark itself is hidden from assistive technology.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/KeyUsageIcon
 */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

/** Composed props of the rail icon: the sidebar's owner share. */
export type KeyUsageIconProps = PropsRuntime<'sidebar.panellist'>

export function KeyUsageIcon({ size, active }: KeyUsageIconProps) {
  return <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={active ? 2.2 : 1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="7.5" cy="16.5" r="4" />
    <path d="M10.4 13.6 20 4" />
    <path d="M16.5 7.5 19 10" />
    <path d="M13.5 10.5 16 13" />
  </svg>
}
