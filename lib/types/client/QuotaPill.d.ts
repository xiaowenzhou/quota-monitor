/**
 * The composer pill: the selected route's allowance beside the model selector,
 * and the reading behind it once the reader asks for more.
 *
 * The pill states the two tightest plan windows, or a wallet's remainder, and
 * clicking it floats the whole reading above the composer: every window with
 * its reset countdown and disclosed remainder, the balance, the budget pools,
 * and the usage the endpoint itself reported for this credential. It renders
 * nothing when that route's provider publishes no account endpoint — a control
 * that always showed something would be noise — and it stands down when another
 * plugin's own allowance chip already speaks for that exact route (see
 * {@link rivalStatesRoute}).
 *
 * That decision belongs here rather than at registration: a rival registers its
 * entry unconditionally and renders nothing unless the selected route is its
 * own, so the seat is occupied even while the rival says nothing — and this pill
 * is the only one that would fill that silence.
 *
 * The reading is placed by the stylesheet alone — `.panel` is absolutely
 * positioned inside the relatively-positioned pill, which is how
 * `dsh-cline-pass` anchors its own card — so nothing is measured, portaled, or
 * clamped at runtime, and the popup cannot drift away from the control that
 * opened it.
 *
 * The route comes from the session's own `modelSelection` projection, so the
 * pill follows the model the next request will use rather than the account
 * card's independent selection.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/QuotaPill
 */
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { QuotaMonitorApi } from './UsagePanel.tsx';
/**
 * A live view of the entries sharing this seat.
 *
 * The arbitration below must run per render rather than once at registration,
 * because what decides it — the selected route — is render state. This face
 * keeps the entry list observable so a rival arriving or leaving re-decides.
 */
export interface SeatRivals {
    /** Version counter of the seat's entry list, for `useSyncExternalStore`. */
    version: () => number;
    /** Subscribe to the seat's entry list changing. */
    subscribe: (listener: () => void) => () => void;
    /** Every entry id currently registered in the seat. */
    ids: () => readonly (string | undefined)[];
}
/** What the pill reads through. */
export interface QuotaPillInjected {
    /** The mounted `ctx.remote.quotaMonitor` face. */
    quota: QuotaMonitorApi;
    /** The other entries in this seat, for the stand-down decision. */
    rivals: SeatRivals;
}
/** Composed props of the pill entry. */
export type QuotaPillProps = PropsRuntime<'conversation.input.right'> & PropsLocale<'quotaMonitor'> & InjectFace<QuotaPillInjected>;
export declare function QuotaPill({ t, quota, rivals, useProjection }: QuotaPillProps): import("react").JSX.Element | null;
//# sourceMappingURL=QuotaPill.d.ts.map