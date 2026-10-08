/**
 * The export row: three buttons that ask the Host for a document and save it
 * through the browser.
 *
 * The Host returns the document's text; the download itself happens here, so no
 * new HTTP route is opened on the loopback server for a file the Remote face
 * can already deliver.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ExportBar
 */
import type { QuotaExportDocument, QuotaExportKind } from '../types.ts';
import type { QuotaTranslate } from './UsagePanel.tsx';
/** The row's props. */
export interface ExportBarProps {
    t: QuotaTranslate;
    /** Asks the Host to build one document, or resolves undefined when it could not. */
    onExport: (kind: QuotaExportKind) => Promise<QuotaExportDocument | undefined>;
}
export declare function ExportBar({ t, onExport }: ExportBarProps): import("react").JSX.Element;
//# sourceMappingURL=ExportBar.d.ts.map