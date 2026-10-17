import { PageNumbers } from './PageNumbers'

// Navigasi halaman ringkas untuk daftar berpaginasi di server.
// Tidak dirender bila hanya ada satu halaman.
export function SimplePagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="sid-operator-pagination">
      <p>
        Halaman {page} dari {totalPages}
      </p>

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
