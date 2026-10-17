// Nomor halaman ringkas: hanya halaman sebelumnya, terkini, dan berikutnya
// (digeser di tepi), dengan elipsis bila ada halaman yang tersembunyi.
// Contoh 17 halaman: hal. 1 -> 1 2 3 …; hal. 5 -> … 4 5 6 …; hal. 17 -> … 15 16 17.
const WINDOW_SIZE = 3

export function getPageWindow(currentPage, totalPages) {
  const total = Math.max(0, Number(totalPages) || 0)

  if (total === 0) {
    return []
  }

  const current = Math.min(Math.max(1, Number(currentPage) || 1), total)
  const size = Math.min(WINDOW_SIZE, total)
  const start = Math.min(Math.max(1, current - 1), total - size + 1)
  const end = start + size - 1

  const pages = Array.from({ length: size }, (_, index) => start + index)

  return [
    ...(start > 1 ? ['ellipsis-start'] : []),
    ...pages,
    ...(end < total ? ['ellipsis-end'] : []),
  ]
}
