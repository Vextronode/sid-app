import { useCallback, useState } from 'react'

export const PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50]

type PageSizeOptions = {
  options?: readonly number[]
  defaultSize?: number
}

const storageKeyOf = (key: string) => `sid-page-size:${key}`

function readPageSize(key: string, options: readonly number[], defaultSize: number) {
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
export function usePageSize(
  key: string,
  { options = PAGE_SIZE_OPTIONS, defaultSize = options[0] }: PageSizeOptions = {},
) {
  const [pageSize, setPageSizeState] = useState(() => readPageSize(key, options, defaultSize))

  const setPageSize = useCallback(
    (value: number | string) => {
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

  return [pageSize, setPageSize] as const
}
