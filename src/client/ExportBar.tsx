/**
 * The export row: three buttons that ask the Host for a document and save it
 * through the browser.
 *
 * The Host returns the document's text; the download itself happens here, so no
 * new HTTP route is opened on the loopback server for a file the Remote face
 * can already deliver.
 * @module @deepseek-ai/dsh-extension-quota-monitor/client/ExportBar
 */

import { useCallback, useState } from 'react'
import type { QuotaExportDocument, QuotaExportKind } from '../types.ts'
import type { QuotaTranslate } from './UsagePanel.tsx'
import css from './UsagePanel.module.css'

/** The row's props. */
export interface ExportBarProps {
  t: QuotaTranslate
  /** Asks the Host to build one document, or resolves undefined when it could not. */
  onExport: (kind: QuotaExportKind) => Promise<QuotaExportDocument | undefined>
}

/** Buttons in the order they are offered. */
const KINDS: readonly (readonly [QuotaExportKind, 'export.daily' | 'export.sessions' | 'export.json'])[] =
  Object.freeze([
    Object.freeze(['daily-csv', 'export.daily'] as const),
    Object.freeze(['sessions-csv', 'export.sessions'] as const),
    Object.freeze(['report-json', 'export.json'] as const),
  ])

/** Hand one document to the browser's own save flow. */
function save(document_: Document, file: QuotaExportDocument): void {
  const url = URL.createObjectURL(new Blob([file.content], { type: file.mediaType }))
  try {
    const anchor = document_.createElement('a')
    anchor.href = url
    anchor.download = file.filename
    anchor.click()
  } finally {
    // The object URL pins the blob in memory until it is revoked, and the click
    // above has already handed the data to the download.
    URL.revokeObjectURL(url)
  }
}

export function ExportBar({ t, onExport }: ExportBarProps) {
  const [busy, setBusy] = useState<QuotaExportKind | undefined>()
  const [failed, setFailed] = useState(false)

  const run = useCallback(async (kind: QuotaExportKind) => {
    setBusy(kind)
    setFailed(false)
    try {
      const file = await onExport(kind)
      if (file === undefined) setFailed(true)
      else save(document, file)
    } finally {
      setBusy(undefined)
    }
  }, [onExport])

  return <div>
    <div className={css.exportRow}>
      {KINDS.map(([kind, key]) => <button
        key={kind}
        type="button"
        className={css.action}
        disabled={busy !== undefined}
        onClick={() => void run(kind)}
      >{t(key)}</button>)}
    </div>
    <p className={css.sectionMeta}>{failed ? t('export.failed') : t('export.hint')}</p>
  </div>
}
