import { useQuery } from '@tanstack/react-query'

import type { LetterListItem } from '@/types'
import { getLetterTypes } from '../api/letterTypeApi'

type ReapplySource = Partial<Pick<LetterListItem, 'is_expired' | 'letter_type'>> | null | undefined

/**
 * Pintasan "Ajukan lagi" untuk surat kedaluwarsa milik pemohon. Mengembalikan
 * aksi yang memanggil `onReapply(kode jenis surat)`, atau undefined bila
 * surat belum kedaluwarsa, halaman tidak menyediakan tujuan, atau jenis
 * suratnya sudah tidak bisa diajukan (dinonaktifkan). Daftar jenis surat
 * aktif hanya dimuat saat diperlukan.
 */
export function useLetterReapply(
  surat: ReapplySource,
  onReapply: ((letterTypeCode: string) => void) | undefined,
): (() => void) | undefined {
  const code = surat?.letter_type?.code
  const needed = Boolean(onReapply && surat?.is_expired === true && code)

  const { data: letterTypes } = useQuery({
    queryKey: ['letter-types', 'active'],
    queryFn: () => getLetterTypes(),
    staleTime: 5 * 60 * 1000,
    enabled: needed,
  })

  if (!needed || !onReapply || !code || !letterTypes?.some((type) => type.code === code)) {
    return undefined
  }

  return () => onReapply(code)
}
