/**
 * The session list: which sessions spent the tokens, ordered by their latest
 * activity.
 *
 * A session is named by its id and its routes, never by its title: a title is
 * text the user wrote, and this panel's accounting deliberately holds no prompt
 * text.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/SessionList
 */
import type { QuotaSessionUsage } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The list's props. */
export interface SessionListProps {
    t: QuotaTranslate;
    sessions: readonly QuotaSessionUsage[];
}
export declare function SessionList({ t, sessions }: SessionListProps): import("react").JSX.Element;
//# sourceMappingURL=SessionList.d.ts.map