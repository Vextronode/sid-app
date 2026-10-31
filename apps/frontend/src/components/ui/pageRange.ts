// Rentang baris halaman aktif untuk bar pagination, mis. "11–20 dari 266 data".
export function formatPageRange(
  page: number,
  pageSize: number,
  total: number | string | null | undefined,
  unit = 'data',
) {
  const count = Math.max(0, Number(total) || 0)

  if (count === 0) return `0 dari 0 ${unit}`

  const start = Math.min((page - 1) * pageSize + 1, count)
  const end = Math.min(page * pageSize, count)

  return `${start}–${end} dari ${count} ${unit}`
}
