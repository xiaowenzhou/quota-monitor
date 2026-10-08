import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The export row: three buttons that ask the Host for a document and save it
 * through the browser.
 *
 * The Host returns the document's text; the download itself happens here, so no
 * new HTTP route is opened on the loopback server for a file the Remote face
 * can already deliver.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ExportBar
 */
import { useCallback, useState } from 'react';
import css from './UsagePanel.module.css';
/** Buttons in the order they are offered. */
const KINDS = Object.freeze([
    Object.freeze(['daily-csv', 'export.daily']),
    Object.freeze(['sessions-csv', 'export.sessions']),
    Object.freeze(['report-json', 'export.json']),
]);
/** Hand one document to the browser's own save flow. */
function save(document_, file) {
    const url = URL.createObjectURL(new Blob([file.content], { type: file.mediaType }));
    try {
        const anchor = document_.createElement('a');
        anchor.href = url;
        anchor.download = file.filename;
        anchor.click();
    }
    finally {
        // The object URL pins the blob in memory until it is revoked, and the click
        // above has already handed the data to the download.
        URL.revokeObjectURL(url);
    }
}
export function ExportBar({ t, onExport }) {
    const [busy, setBusy] = useState();
    const [failed, setFailed] = useState(false);
    const run = useCallback(async (kind) => {
        setBusy(kind);
        setFailed(false);
        try {
            const file = await onExport(kind);
            if (file === undefined)
                setFailed(true);
            else
                save(document, file);
        }
        finally {
            setBusy(undefined);
        }
    }, [onExport]);
    return _jsxs("div", { children: [_jsx("div", { className: css.exportRow, children: KINDS.map(([kind, key]) => _jsx("button", { type: "button", className: css.action, disabled: busy !== undefined, onClick: () => void run(kind), children: t(key) }, kind)) }), _jsx("p", { className: css.sectionMeta, children: failed ? t('export.failed') : t('export.hint') })] });
}
//# sourceMappingURL=ExportBar.js.map