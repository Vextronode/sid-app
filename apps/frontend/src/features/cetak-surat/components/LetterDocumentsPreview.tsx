import { useState } from 'react'

import { PdfCanvasPreview } from '@/features/cetak-surat/components/PdfCanvasPreview'
import { MAIN_DOCUMENT } from '@/features/cetak-surat/utils/letterDocuments'

/**
 * Pratinjau surat beserta dokumen yang terbit bersama (surat.documents):
 * tab per dokumen di atas pratinjau. Tanpa dokumen tambahan, sama dengan
 * PdfCanvasPreview biasa.
 */
export function LetterDocumentsPreview({ surat, template }) {
  const documents = surat?.documents ?? []
  const [active, setActive] = useState(MAIN_DOCUMENT)
  const activeKey = documents.some((document) => document.key === active) ? active : MAIN_DOCUMENT

  if (documents.length <= 1) {
    return <PdfCanvasPreview surat={surat} template={template} />
  }

  return (
    <div className="sid-letter-documents">
      <div className="sid-letter-documents-tabs" role="tablist" aria-label="Dokumen yang terbit">
        {documents.map((document) => (
          <button
            key={document.key}
            type="button"
            role="tab"
            aria-selected={document.key === activeKey}
            className="sid-letter-documents-tab"
            onClick={() => setActive(document.key)}
          >
            {document.title}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <PdfCanvasPreview surat={surat} template={template} documentKey={activeKey} />
      </div>
    </div>
  )
}
