import { Clock3, FilePlus, Trash2 } from 'lucide-react'

import { StatusBadge } from '@/components/ui/StatusBadge'
import { SimplePagination } from '@/components/ui/SimplePagination'
import { SURAT_STATUS } from '@/constants/suratStatus'
import { useSuratSummaryQuery } from '@/features/surat/hooks/useSuratListQuery'
import {
  formatLetterDate,
  getLetterProgress,
  LETTER_STAGES,
} from '@/features/surat/utils/letterProgress'
import { LetterRowActions } from './LetterRowActions'

const MY_LETTER_FILTERS = [
  { value: '', label: 'Semua' },
  { value: SURAT_STATUS.PENDING, label: 'Menunggu' },
  { value: SURAT_STATUS.IN_PROGRESS, label: 'Diproses' },
  { value: SURAT_STATUS.APPROVED, label: 'Terbit' },
  { value: SURAT_STATUS.REJECTED, label: 'Ditolak' },
]

function stageState(index, progress) {
  if (index < progress.current) return 'done'
  if (index === progress.current) return progress.rejected ? 'rejected' : 'current'
  return 'upcoming'
}

function LetterTrack({ progress }) {
  return (
    <ol className="sid-my-letters-track" aria-label="Tahapan surat">
      {LETTER_STAGES.map((label, index) => {
        const state = stageState(index, progress)

        return (
          <li
            key={label}
            className={`sid-my-letters-stage is-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="sid-my-letters-stage-dot" aria-hidden="true" />
            <span className="sid-my-letters-stage-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function LetterRow({ letter, onDetail, onDelete, deleting }) {
  const progress = getLetterProgress(letter)
  const name = letter.letter_type?.name ?? 'Surat'
  const isApproved = letter.status === SURAT_STATUS.APPROVED

  return (
    <li className={`sid-my-letters-row tone-${progress.tone}`}>
      <div className="sid-my-letters-head">
        <div className="sid-my-letters-title">
          <h2>{name}</h2>

          <p className="sid-my-letters-meta">
            <span>Diajukan {formatLetterDate(letter.submitted_at ?? letter.created_at)}</span>
            {letter.letter_number && (
              <span className="sid-my-letters-number">No. {letter.letter_number}</span>
            )}
          </p>
        </div>

        <StatusBadge status={letter.status} />
      </div>

      <div className="sid-my-letters-body">
        <LetterTrack progress={progress} />

        <p className="sid-my-letters-message">
          {progress.message}
          {letter.is_overdue && progress.tone !== 'done' && (
            <span className="sid-my-letters-overdue">
              <Clock3 size={13} aria-hidden="true" />
              Lewat batas waktu
            </span>
          )}
        </p>

        <div className="sid-my-letters-actions">
          <LetterRowActions
            surat={letter}
            onOpen={onDetail}
            openAriaLabel={`Lihat detail ${name}`}
            canDownload={isApproved}
            downloadDisabled={letter.is_expired === true}
            downloadTitle={
              letter.is_expired === true ? 'Masa berlaku surat telah habis' : undefined
            }
            extra={
              !isApproved && (
                <button
                  type="button"
                  onClick={() => onDelete(letter)}
                  disabled={deleting}
                  className="sid-row-action danger"
                  aria-label={`Hapus ${name}`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {deleting ? 'Menghapus…' : 'Hapus'}
                </button>
              )
            }
          />
        </div>
      </div>
    </li>
  )
}

/**
 * Daftar surat milik pengguna sendiri (warga maupun pejabat): filter status,
 * baris surat dengan jalur tahapan, dan pagination dari server.
 */
export function MyLettersList({
  letters,
  loading,
  filter,
  onFilterChange,
  onDetail,
  onDelete,
  deletingId,
  onCreate,
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}) {
  const isEmpty = !loading && letters.length === 0
  const { summary, loading: summaryLoading } = useSuratSummaryQuery({ scope: 'mine' })
  const countOf = (value) => (value ? summary.by_status?.[value] : summary.total) ?? 0

  return (
    <section className="sid-my-letters">
      <div className="sid-my-letters-filters" role="group" aria-label="Saring status surat">
        {MY_LETTER_FILTERS.map((option) => (
          <button
            key={option.value || 'all'}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => onFilterChange(option.value)}
            className="sid-my-letters-filter"
          >
            {option.label}
            {!summaryLoading && (
              <span className="sid-my-letters-filter-count">{countOf(option.value)}</span>
            )}
          </button>
        ))}
      </div>

      <div className="sid-my-letters-panel">
        {loading ? (
          <ul className="sid-my-letters-list" aria-busy="true" aria-label="Memuat data surat">
            {[0, 1, 2].map((key) => (
              <li key={key} className="sid-my-letters-row is-skeleton" aria-hidden="true">
                <span className="sid-my-letters-skeleton w-1/2" />
                <span className="sid-my-letters-skeleton w-1/3" />
                <span className="sid-my-letters-skeleton w-full" />
              </li>
            ))}
          </ul>
        ) : isEmpty ? (
          <div className="sid-my-letters-empty">
            {filter ? (
              <p>Tidak ada surat dengan status ini.</p>
            ) : (
              <>
                <p className="sid-my-letters-empty-title">Belum ada surat yang Anda ajukan</p>
                <p>Surat yang Anda ajukan akan muncul di sini beserta tahap prosesnya.</p>
                {onCreate && (
                  <button
                    type="button"
                    onClick={onCreate}
                    className="sid-btn sid-btn-primary inline-flex items-center gap-2"
                  >
                    <FilePlus size={16} aria-hidden="true" />
                    Ajukan surat
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <ul className="sid-my-letters-list">
            {letters.map((letter) => (
              <LetterRow
                key={letter.id}
                letter={letter}
                onDetail={onDetail}
                onDelete={onDelete}
                deleting={deletingId === letter.id}
              />
            ))}
          </ul>
        )}

        <SimplePagination
          page={page}
          totalPages={totalPages}
          onChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={loading || isEmpty ? undefined : onPageSizeChange}
        />
      </div>
    </section>
  )
}
