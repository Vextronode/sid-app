import { useState } from 'react'

import { PdfCanvasPreview } from '@/features/cetak-surat/components/PdfCanvasPreview'
import { MAIN_DOCUMENT, producesLetter } from '@/features/cetak-surat/utils/letterDocuments'
import { FormAnswersReview } from '@/features/surat/components/FormAnswersReview'
import type { PrintableLetter } from '@/features/cetak-surat/utils/letterDocuments'

type LetterDocumentsPreviewProps = {
  surat: PrintableLetter | null | undefined
}

/**
 * Pratinjau surat beserta dokumen yang terbit bersama (surat.documents):
 * tab per dokumen di atas pratinjau. Tanpa dokumen tambahan, sama dengan
 * PdfCanvasPreview biasa.
 */
export function LetterDocumentsPreview({ surat }: LetterDocumentsPreviewProps) {
  const documents = surat?.documents ?? []
  const [active, setActive] = useState(MAIN_DOCUMENT)
  const activeKey = documents.some((document) => document.key === active) ? active : MAIN_DOCUMENT

  // Layanan pendataan (mis. CPMI): tidak ada surat untuk dipratinjau, jadi
  // yang tampil rincian isian per section beserta dokumennya.
  if (!producesLetter(surat)) {
    return surat ? <FormAnswersReview letterId={surat.id} /> : null
  }

  if (documents.length <= 1) {
    return <PdfCanvasPreview surat={surat} />
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
        <PdfCanvasPreview surat={surat} documentKey={activeKey} />
      </div>
    </div>
  )
}
