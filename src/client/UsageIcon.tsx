/**
 * The sidebar rail icon addressing the usage panel.
 *
 * The seat supplies `size` and `active`; the accessible name comes from the
 * registration's `label`, so the mark itself is hidden from assistive
 * technology.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/UsageIcon
 */

import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'

/** Composed props of the rail icon: the sidebar's owner share. */
export type UsageIconProps = PropsRuntime<'sidebar.panellist'>

export function UsageIcon({ size, active }: UsageIconProps) {
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
    <path d="M3 20h18" />
    <rect x="5" y="12" width="3.4" height="6" rx="1" />
    <rect x="10.3" y="8" width="3.4" height="10" rx="1" />
    <rect x="15.6" y="4" width="3.4" height="14" rx="1" />
  </svg>
}
