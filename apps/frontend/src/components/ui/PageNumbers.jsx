import { getPageWindow } from './pageWindow'

// Tombol nomor halaman ringkas; lihat getPageWindow untuk aturan jendela.
export function PageNumbers({
  currentPage,
  totalPages,
  onChange,
  buttonClassName = '',
  activeClassName = 'active',
  disabled = false,
}) {
  return getPageWindow(currentPage, totalPages).map((item) => {
    if (typeof item === 'string') {
      return (
        <span key={item} className="sid-pagination-ellipsis" aria-hidden="true">
          …
        </span>
      )
    }

    const isActive = item === currentPage

    return (
      <button
        key={item}
        type="button"
        onClick={() => onChange(item)}
        disabled={disabled}
        aria-current={isActive ? 'page' : undefined}
        className={[buttonClassName, isActive ? activeClassName : ''].filter(Boolean).join(' ')}
      >
        {item}
      </button>
    )
  })
}
