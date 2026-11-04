import { useEffect, useState } from 'react'

/**
 * Foto permintaan dari disk privat, dimuat sebagai object URL saat rincian
 * dibuka dan dilepas saat ditutup.
 */
export function useRequestPhoto(
  id: number,
  enabled: boolean,
  fetchUrl: (id: number) => Promise<string>,
) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!enabled) return

    let objectUrl: string | null = null
    let cancelled = false

    fetchUrl(id)
      .then((created) => {
        objectUrl = created
        if (cancelled) URL.revokeObjectURL(created)
        else setUrl(created)
      })
      .catch(() => setError('Foto gagal dimuat. Tutup lalu buka lagi rincian ini.'))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, enabled, fetchUrl])

  return { url, error }
}
