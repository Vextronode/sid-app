import { useEffect, useEffectEvent } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Membuka detail surat saat halaman daftar dibuka dengan ?surat=<id>
 * (dari klik notifikasi). Parameternya dihapus setelah dipakai supaya
 * menutup detail lalu memuat ulang halaman tidak membukanya lagi.
 *
 * @param {(letterId: string) => void} onOpen
 * @param {boolean} ready  false selama data yang dibutuhkan onOpen belum siap
 */
export function useLetterDeepLink(onOpen, ready = true) {
  const [searchParams, setSearchParams] = useSearchParams()
  const letterId = searchParams.get('surat')

  const openLetter = useEffectEvent((id) => {
    onOpen(id)

    const next = new URLSearchParams(searchParams)
    next.delete('surat')
    setSearchParams(next, { replace: true })
  })

  useEffect(() => {
    if (letterId && ready) {
      openLetter(letterId)
    }
  }, [letterId, ready])
}
