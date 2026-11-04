import { PageNumbers } from '@/components/ui/PageNumbers'
import { PageSizeSelect } from '@/components/ui/PageSizeSelect'
import { formatPageRange } from '@/components/ui/pageRange'
import type { PageMeta } from '@/types'

type RequestPaginationProps = {
  meta: Pick<PageMeta, 'current_page' | 'last_page' | 'total'>
  pageSize: number
  noun: string
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function RequestPagination({
  meta,
  pageSize,
  noun,
  onPageChange,
  onPageSizeChange,
}: RequestPaginationProps) {
  if (meta.total === 0) return null

  return (
    <div className="sid-operator-pagination">
      <div className="sid-pagination-meta">
        <p>{formatPageRange(meta.current_page, pageSize, meta.total, noun)}</p>
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />
      </div>
      <div>
        <button
          type="button"
          disabled={meta.current_page <= 1}
          onClick={() => onPageChange(meta.current_page - 1)}
        >
          Sebelumnya
        </button>
        <PageNumbers
          currentPage={meta.current_page}
          totalPages={Math.max(1, meta.last_page)}
          onChange={onPageChange}
        />
        <button
          type="button"
          disabled={meta.current_page >= meta.last_page}
          onClick={() => onPageChange(meta.current_page + 1)}
        >
          Selanjutnya
        </button>
      </div>
    </div>
  )
}
