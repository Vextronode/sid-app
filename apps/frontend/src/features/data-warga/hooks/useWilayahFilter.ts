import { useEffect, useMemo, useState } from 'react'
import { getHamlets, getRts, getRws } from '@/features/kelola-wilayah/api'
import type { Hamlet, Rt, Rw } from '@/types'

// Id terpilih per tingkat; '' = semua.
export type WilayahFilters = { hamletId: string; rwId: string; rtId: string }

export type FilterOption = { value: string; label: string }

const EMPTY_FILTERS: WilayahFilters = { hamletId: '', rwId: '', rtId: '' }

/**
 * Filter bertingkat Dusun -> RW -> RT untuk daftar warga dan KK. Memilih
 * tingkat atas mengosongkan tingkat di bawahnya; pilihan RW/RT menyempit
 * mengikuti tingkat di atasnya. `params` siap dikirim ke API daftar.
 *
 * onChange (opsional) dipanggil setiap filter berubah, mis. untuk kembali
 * ke halaman 1.
 */
export function useWilayahFilter(onChange?: () => void) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [wilayah, setWilayah] = useState<{ hamlets: Hamlet[]; rws: Rw[]; rts: Rt[] }>({
    hamlets: [],
    rws: [],
    rts: [],
  })

  // Pilihan wilayah tidak bergantung pada halaman daftar yang sedang dibuka.
  useEffect(() => {
    let active = true

    Promise.all([getHamlets(), getRws(), getRts()])
      .then(([hamletRes, rwRes, rtRes]) => {
        if (!active) return

        setWilayah({
          hamlets: hamletRes.data?.data ?? [],
          rws: rwRes.data?.data ?? [],
          rts: rtRes.data?.data ?? [],
        })
      })
      .catch((err) => console.error('GET WILAYAH OPTIONS ERROR', err))

    return () => {
      active = false
    }
  }, [])

  const setFilter = (level: keyof WilayahFilters, value: string) => {
    setFilters((current) => {
      if (level === 'hamletId') return { hamletId: value, rwId: '', rtId: '' }
      if (level === 'rwId') return { ...current, rwId: value, rtId: '' }

      return { ...current, rtId: value }
    })
    onChange?.()
  }

  const params = useMemo(
    () => ({
      ...(filters.hamletId ? { hamlet_id: filters.hamletId } : {}),
      ...(filters.rwId ? { rw_id: filters.rwId } : {}),
      ...(filters.rtId ? { rt_id: filters.rtId } : {}),
    }),
    [filters],
  )

  const options = useMemo(() => {
    const rwById = new Map(wilayah.rws.map((rw) => [String(rw.id), rw]))
    const rwsInHamlet = filters.hamletId
      ? wilayah.rws.filter((rw) => String(rw.hamlet_id) === filters.hamletId)
      : wilayah.rws
    const allowedRwIds = new Set(
      filters.rwId ? [filters.rwId] : rwsInHamlet.map((rw) => String(rw.id)),
    )

    return {
      hamletOptions: wilayah.hamlets.map((hamlet) => ({
        value: String(hamlet.id),
        label: hamlet.name,
      })),
      rwOptions: rwsInHamlet.map((rw) => ({ value: String(rw.id), label: `RW ${rw.number}` })),
      rtOptions: wilayah.rts
        .filter((rt) => allowedRwIds.has(String(rt.rw_id)))
        .map((rt) => ({
          value: String(rt.id),
          label: filters.rwId
            ? `RT ${rt.number}`
            : `RT ${rt.number} / RW ${rwById.get(String(rt.rw_id))?.number ?? '-'}`,
        })),
      // Semua RT untuk pilihan RT di form tambah/edit warga.
      wilayahOptions: wilayah.rts.map((rt) => ({
        ...rt,
        label: `RT ${rt.number} / RW ${rwById.get(String(rt.rw_id))?.number ?? '-'}`,
      })),
    }
  }, [wilayah, filters.hamletId, filters.rwId])

  return { filters, setFilter, params, ...options }
}
