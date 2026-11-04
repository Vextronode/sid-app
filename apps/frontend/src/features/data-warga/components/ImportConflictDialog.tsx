import { Fragment, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle, ChevronDown, ChevronRight, Users } from 'lucide-react'
import { currentDialog } from '@/shared/lib/dialog'
import type { CitizenImportConflict } from '../hooks/useWargaList'

type Decision = 'overwrite' | 'skip'

type ImportConflictDialogProps = {
  conflicts: CitizenImportConflict[]
  newCount: number
  errorCount: number
  onCancel: () => void
  // Tidak ada warga baru dan tidak ada data yang berbeda: tutup impor tanpa
  // menjalankan apa pun.
  onClose: () => void
  // Nomor baris yang dipilih "Timpa"; konflik lain dilewati.
  onConfirm: (overwriteRows: number[]) => void
}

const hasChanges = (conflict: CitizenImportConflict) => conflict.changes.length > 0

/**
 * Pop-up NIK bentrok saat impor: semua konflik dalam satu tabel, pilihan
 * Timpa/Lewati per baris plus tombol untuk semua. Baris yang datanya sama
 * persis otomatis dilewati. Defaultnya Lewati supaya tidak ada data yang
 * tertimpa tanpa dipilih.
 */
export function ImportConflictDialog({
  conflicts,
  newCount,
  errorCount,
  onCancel,
  onClose,
  onConfirm,
}: ImportConflictDialogProps) {
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  // Escape = Batal (kembali ke modal impor), kecuali dialog konfirmasi sedang
  // tampil di atasnya; DialogHost menutup dirinya sendiri.
  const cancelRef = useRef(onCancel)
  useEffect(() => {
    cancelRef.current = onCancel
  })
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !currentDialog()) cancelRef.current()
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const changed = conflicts.filter(hasChanges)
  const identicalCount = conflicts.length - changed.length
  const nothingToImport = changed.length === 0 && newCount === 0
  const overwriteRows = changed
    .filter((conflict) => decisions[conflict.row] === 'overwrite')
    .map((conflict) => conflict.row)

  const setAll = (decision: Decision) =>
    setDecisions(Object.fromEntries(changed.map((conflict) => [conflict.row, decision])))

  const setOne = (row: number, decision: Decision) =>
    setDecisions((current) => ({ ...current, [row]: decision }))

  return (
    <div className="sid-modal-overlay sid-admin-modal-overlay sid-import-conflict-overlay">
      <div
        className="sid-modal sid-import-conflict-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-conflict-title"
      >
        <div className="sid-admin-modal-header">
          <div className="sid-admin-import-heading">
            <Users size={22} />
            <h2 id="import-conflict-title">
              Ditemukan {conflicts.length} warga yang NIK-nya sudah terdaftar
            </h2>
          </div>
        </div>

        {changed.length === 0 ? (
          <div className="sid-import-conflict-notice" role="status">
            <CheckCircle size={18} />
            <span>
              Semua data di file <strong>sama persis</strong> dengan data yang sudah terdaftar, jadi
              tidak ada yang perlu ditimpa.
              {newCount > 0
                ? ` ${newCount} warga baru tetap ditambahkan.`
                : ' Tidak ada warga baru di file ini.'}
              {errorCount > 0 ? ` ${errorCount} baris gagal diperiksa.` : ''}
            </span>
          </div>
        ) : (
          <>
            <p className="sid-import-conflict-intro">
              Pilih <strong>Timpa</strong> untuk mengganti data lama dengan data dari file (hanya
              kolom yang terisi di file; NIK tidak berubah), atau <strong>Lewati</strong> untuk
              membiarkan data lama.
              {identicalCount > 0 &&
                ` ${identicalCount} warga yang datanya sama persis otomatis dilewati.`}
              {newCount > 0 && ` ${newCount} warga baru tetap ditambahkan.`}
              {errorCount > 0 && ` ${errorCount} baris yang gagal diperiksa dilewati.`}
            </p>

            <div className="sid-import-conflict-bulk">
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => setAll('overwrite')}
              >
                Timpa semua ({changed.length})
              </button>
              <button
                type="button"
                className="sid-button sid-button-outline"
                onClick={() => setAll('skip')}
              >
                Lewati semua ({changed.length})
              </button>
            </div>
          </>
        )}

        <div className="sid-operator-table-wrapper sid-import-conflict-table">
          <table className="sid-operator-table">
            <thead>
              <tr>
                <th className="center">Baris</th>
                <th>Nama terdaftar</th>
                <th>Kolom yang berubah</th>
                <th className="center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {conflicts.map((conflict) => {
                const decision = decisions[conflict.row] ?? 'skip'
                const expanded = expandedRow === conflict.row && hasChanges(conflict)

                return (
                  <Fragment key={conflict.row}>
                    <tr className={expanded ? 'is-expanded' : undefined}>
                      <td className="center">{conflict.row}</td>
                      <td className="sid-admin-family-member-name">{conflict.name}</td>
                      <td>
                        {hasChanges(conflict) ? (
                          <button
                            type="button"
                            className="sid-import-conflict-toggle"
                            aria-expanded={expanded}
                            onClick={() => setExpandedRow(expanded ? null : conflict.row)}
                          >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            <span>{conflict.changes.map((change) => change.label).join(', ')}</span>
                          </button>
                        ) : (
                          <span className="sid-import-conflict-muted">Tidak ada perubahan</span>
                        )}
                        {conflict.moves_family && (
                          <span className="sid-import-conflict-flag">
                            <AlertTriangle size={12} /> Pindah KK
                          </span>
                        )}
                      </td>
                      <td className="center">
                        {hasChanges(conflict) ? (
                          <div
                            className="sid-import-conflict-choice"
                            role="radiogroup"
                            aria-label={`Aksi baris ${conflict.row}`}
                          >
                            {(['overwrite', 'skip'] as const).map((option) => (
                              <label
                                key={option}
                                className={decision === option ? 'is-selected' : undefined}
                              >
                                <input
                                  type="radio"
                                  name={`conflict-${conflict.row}`}
                                  checked={decision === option}
                                  onChange={() => setOne(conflict.row, option)}
                                />
                                {option === 'overwrite' ? 'Timpa' : 'Lewati'}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <span className="sid-import-conflict-muted">Dilewati</span>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="sid-import-conflict-detail">
                        <td />
                        <td colSpan={3}>
                          <table className="sid-import-diff-table">
                            <colgroup>
                              <col className="sid-import-diff-label-col" />
                              <col />
                              <col />
                            </colgroup>
                            <thead>
                              <tr>
                                <th scope="col">Data</th>
                                <th scope="col">Lama</th>
                                <th scope="col">Baru (dari file)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {conflict.changes.map((change) => (
                                <tr key={change.field}>
                                  <th scope="row">{change.label}</th>
                                  <td>{change.before}</td>
                                  <td className="is-new">{change.after}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="sid-import-conflict-footer">
          <span>
            Timpa: <strong>{overwriteRows.length}</strong> · Lewati:{' '}
            <strong>{conflicts.length - overwriteRows.length}</strong>
            {identicalCount > 0 && ` (${identicalCount} data sama persis)`}
          </span>
          <div className="sid-modal-actions">
            <button type="button" className="sid-button sid-button-outline" onClick={onCancel}>
              Batal
            </button>
            <button
              type="button"
              className="sid-button sid-button-primary"
              onClick={() => (nothingToImport ? onClose() : onConfirm(overwriteRows))}
            >
              {nothingToImport ? 'Tutup' : 'Lanjutkan impor'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
