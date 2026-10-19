import { useCallback, useState } from 'react'

export const PAGE_SIZE_OPTIONS = [10, 25, 50]

const storageKeyOf = (key) => `sid-page-size:${key}`

function readPageSize(key, options, defaultSize) {
  try {
    const stored = Number(window.localStorage.getItem(storageKeyOf(key)))

    return options.includes(stored) ? stored : defaultSize
  } catch {
    return defaultSize
  }
}

/**
 * Jumlah baris per halaman yang dipilih pengguna untuk satu daftar.
 * Pilihan diingat per daftar di browser; nilai di luar `options` jatuh
 * ke `defaultSize`.
 */
export function usePageSize(key, { options = PAGE_SIZE_OPTIONS, defaultSize = options[0] } = {}) {
  const [pageSize, setPageSizeState] = useState(() => readPageSize(key, options, defaultSize))

  const setPageSize = useCallback(
    (value) => {
      const next = options.includes(Number(value)) ? Number(value) : defaultSize

      setPageSizeState(next)

      try {
        window.localStorage.setItem(storageKeyOf(key), String(next))
      } catch {
        // Penyimpanan browser tidak tersedia; pilihan hanya berlaku di sesi ini.
      }
    },
    [key, options, defaultSize],
  )

  return [pageSize, setPageSize]
}
