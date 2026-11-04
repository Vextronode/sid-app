import { AlertCircle, ArrowRight, FileText } from 'lucide-react'
import type { CitizenImportPreview, CitizenImportRowError } from '../hooks/useWargaList'

type ImportPreviewSummaryProps = {
  preview: CitizenImportPreview
  fileName: string
  onBack: () => void
  onContinue: () => void
}

// Daftar per baris dipotong supaya file ribuan baris tidak membuat modal berat.
const ROW_MESSAGE_LIMIT = 100

const sameName = (header: string, label: string) =>
  header.trim().toLowerCase() === label.trim().toLowerCase()

function RowMessages({ title, items }: { title: string; items: CitizenImportRowError[] }) {
  if (items.length === 0) return null

  const hidden = items.length - ROW_MESSAGE_LIMIT

  return (
    <details className="sid-import-summary-messages">
      <summary>
        {title} ({items.length})
      </summary>
      <ul>
        {items.slice(0, ROW_MESSAGE_LIMIT).map((item, index) => (
          <li key={`${item.row}-${index}`}>
            <strong>Baris {item.row}:</strong> {item.message}
          </li>
        ))}
        {hidden > 0 && <li className="is-more">dan {hidden} lainnya</li>}
      </ul>
    </details>
  )
}

/**
 * Hasil pemeriksaan file sebelum impor: jumlah baris per hasil, kolom yang
 * dibaca dan diabaikan, kolom wajib yang tidak ada, serta baris gagal dan
 * peringatan. Petugas lanjut dari sini ke pilihan Timpa/Lewati atau langsung
 * impor.
 */
export function ImportPreviewSummary({
  preview,
  fileName,
  onBack,
  onContinue,
}: ImportPreviewSummaryProps) {
  const { columns } = preview
  const canContinue = preview.conflict_count > 0 || preview.new_count > 0

  const continueLabel =
    preview.conflict_count > 0
      ? 'Lanjut: pilih Timpa/Lewati'
      : preview.new_count > 0
        ? `Impor ${preview.new_count} warga baru`
        : 'Tidak ada yang bisa diimpor'

  const stats = [
    { label: 'Warga baru', value: preview.new_count, tone: 'success' },
    { label: 'NIK sudah terdaftar', value: preview.conflict_count, tone: 'info' },
    { label: 'Baris gagal', value: preview.error_count, tone: 'danger' },
    { label: 'Peringatan', value: preview.warning_count, tone: 'warning' },
  ]

  return (
    <div className="sid-import-summary">
      <p className="sid-import-summary-file">
        <FileText size={16} />
        <span>
          <strong>{fileName}</strong> · sheet “{columns.sheet}”, judul kolom di baris{' '}
          {columns.header_row}
        </span>
      </p>

      <dl className="sid-import-summary-stats">
        {stats.map((stat) => (
          <div key={stat.label} className={`is-${stat.tone}${stat.value ? '' : ' is-zero'}`}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      {columns.missing_required.length > 0 && (
        <div className="sid-admin-import-alert sid-admin-alert-error" role="alert">
          <AlertCircle size={16} />
          <span>
            Kolom wajib tidak ditemukan: <strong>{columns.missing_required.join(', ')}</strong>.
            Tanpa kolom ini setiap baris gagal. Perbaiki judul kolom di file, lalu unggah ulang.
          </span>
        </div>
      )}

      <section className="sid-import-summary-section" aria-labelledby="import-columns-read">
        <h3 id="import-columns-read">Kolom yang dibaca ({columns.mapped.length})</h3>
        <ul className="sid-import-column-list">
          {columns.mapped.map((column) => (
            <li key={column.column} className="sid-import-column">
              <span className="sid-import-column-letter">{column.column}</span>
              <span>{column.header}</span>
              {!sameName(column.header, column.label) && (
                <>
                  <ArrowRight size={12} aria-label="dibaca sebagai" />
                  <strong>{column.label}</strong>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {columns.ignored.length > 0 && (
        <section className="sid-import-summary-section" aria-labelledby="import-columns-ignored">
          <h3 id="import-columns-ignored">Kolom yang diabaikan ({columns.ignored.length})</h3>
          <ul className="sid-import-column-list">
            {columns.ignored.map((column) => (
              <li
                key={column.column}
                className="sid-import-column is-ignored"
                title={column.reason}
              >
                <span className="sid-import-column-letter">{column.column}</span>
                <span>{column.header}</span>
                {column.reason !== 'Tidak dikenali.' && (
                  <em className="sid-import-column-reason">{column.reason}</em>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <RowMessages title="Baris gagal" items={preview.errors} />
      <RowMessages title="Peringatan (kolom dikosongkan)" items={preview.warnings} />

      <div className="sid-modal-actions">
        <button type="button" className="sid-button sid-button-outline" onClick={onBack}>
          Pilih file lain
        </button>
        <button
          type="button"
          className="sid-button sid-button-primary"
          onClick={onContinue}
          disabled={!canContinue}
        >
          {continueLabel}
        </button>
      </div>
    </div>
  )
}
