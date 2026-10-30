import { PageNumbers } from './PageNumbers'
import { PageSizeSelect } from './PageSizeSelect'

type SimplePaginationProps = {
  page: number
  totalPages: number
  onChange: (page: number) => void
  // Pemilih jumlah baris hanya tampil bila onPageSizeChange diisi.
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}

// Navigasi halaman ringkas untuk daftar berpaginasi di server. Tanpa
// pemilih jumlah baris, tidak dirender bila hanya ada satu halaman.
export function SimplePagination({
  page,
  totalPages,
  onChange,
  pageSize,
  onPageSizeChange,
}: SimplePaginationProps) {
  if (totalPages <= 1 && !onPageSizeChange) {
    return null
  }

  return (
    <div className="sid-operator-pagination">
      <div className="sid-pagination-meta">
        <p>
          Halaman {page} dari {Math.max(1, totalPages)}
        </p>
        {onPageSizeChange && pageSize !== undefined && (
          <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
        )}
      </div>

      <div>
        <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Sebelumnya
        </button>

        <PageNumbers currentPage={page} totalPages={totalPages} onChange={onChange} />

        <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Berikutnya
        </button>
      </div>
    </div>
  )
}
