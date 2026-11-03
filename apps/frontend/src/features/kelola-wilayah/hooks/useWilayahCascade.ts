import { useEffect, useState } from 'react'

import { getHamlets, getRts, getRws } from '../api'
import type { Hamlet, Rt, Rw } from '@/types'

// Id terpilih per tingkat sebagai teks input; '' = belum dipilih.
export type WilayahCascadeValue = { hamletId: string; rwId: string; rtId: string }

export const EMPTY_WILAYAH_CASCADE: WilayahCascadeValue = { hamletId: '', rwId: '', rtId: '' }

// Wilayah nonaktif tidak bisa dipilih untuk data baru.
const active = <T extends { is_active?: boolean }>(items: T[] | undefined) =>
  (items ?? []).filter((item) => item.is_active !== false)

/**
 * Pilihan Dusun -> RW -> RT yang diambil per tingkat dari backend: dusun saat
 * dibuka, RW setelah dusun dipilih, RT setelah RW dipilih.
 */
export function useWilayahCascade(value: WilayahCascadeValue, withRt: boolean) {
  const [hamlets, setHamlets] = useState<Hamlet[]>([])
  const [rws, setRws] = useState<{ hamletId: string; items: Rw[] }>({ hamletId: '', items: [] })
  const [rts, setRts] = useState<{ rwId: string; items: Rt[] }>({ rwId: '', items: [] })
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let current = true

    getHamlets()
      .then((response) => current && setHamlets(active(response.data?.data)))
      .catch(() => current && setFailed(true))

    return () => {
      current = false
    }
  }, [])

  useEffect(() => {
    if (!value.hamletId) return

    let current = true

    getRws({ hamlet_id: value.hamletId })
      .then(
        (response) =>
          current && setRws({ hamletId: value.hamletId, items: active(response.data?.data) }),
      )
      .catch(() => current && setFailed(true))

    return () => {
      current = false
    }
  }, [value.hamletId])

  useEffect(() => {
    if (!withRt || !value.rwId) return

    let current = true

    getRts({ rw_id: value.rwId })
      .then(
        (response) => current && setRts({ rwId: value.rwId, items: active(response.data?.data) }),
      )
      .catch(() => current && setFailed(true))

    return () => {
      current = false
    }
  }, [withRt, value.rwId])

  return {
    hamlets,
    // Hanya hasil untuk dusun/RW yang sedang dipilih (bukan sisa pilihan sebelumnya).
    rws: value.hamletId && rws.hamletId === value.hamletId ? rws.items : [],
    rts: value.rwId && rts.rwId === value.rwId ? rts.items : [],
    failed,
  }
}
