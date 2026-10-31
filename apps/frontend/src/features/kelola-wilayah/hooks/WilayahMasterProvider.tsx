import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  createHamlet as apiCreateHamlet,
  createRt as apiCreateRt,
  createRw as apiCreateRw,
  deleteHamlet as apiDeleteHamlet,
  deleteRt as apiDeleteRt,
  deleteRw as apiDeleteRw,
  getHamlets,
  getRts,
  getRws,
  updateHamlet as apiUpdateHamlet,
  updateRt as apiUpdateRt,
  updateRw as apiUpdateRw,
} from '../api'

import { WilayahMasterContext } from '../context/WilayahMasterContext'
import { getApiErrorMessage } from '@/shared/lib/apiError'
import type { Hamlet, Rt, Rw } from '@/types'
import type {
  WilayahHamlet,
  WilayahMasterValue,
  WilayahPayload,
  WilayahProcessing,
  WilayahRt,
  WilayahRw,
} from '../types'

// Semua endpoint wilayah membungkus hasilnya dalam { data }.
function unwrap<T>(response: { data: { data: T } } | null | undefined): T | null {
  return response?.data?.data ?? null
}

function unwrapList<T>(response: { data: { data: T[] } } | null | undefined): T[] {
  const data = unwrap(response)

  return Array.isArray(data) ? data : []
}

const ERROR_FALLBACK = 'Terjadi kesalahan saat memproses data wilayah.'

function normalizeHamlet(item: Hamlet): WilayahHamlet {
  return {
    id: item?.id ?? null,
    code: item?.code ?? '',
    name: item?.name ?? '',
    isActive: Boolean(item?.is_active),
    villageId: item?.village_id ?? null,
  }
}

function normalizeRw(item: Rw): WilayahRw {
  return {
    id: item?.id ?? null,
    number: item?.number ?? '',
    fullLabel: item?.full_label ?? `RW ${item?.number ?? ''}`,
    isActive: Boolean(item?.is_active),
    hamletId: item?.hamlet_id ?? null,
  }
}

function normalizeRt(item: Rt): WilayahRt {
  return {
    id: item?.id ?? null,
    number: item?.number ?? '',
    fullLabel: item?.full_label ?? `RT ${item?.number ?? ''}`,
    isActive: Boolean(item?.is_active),
    rwId: item?.rw_id ?? null,
  }
}

export function WilayahMasterProvider({ children }: { children: ReactNode }) {
  const [hamlets, setHamlets] = useState<WilayahHamlet[]>([])
  const [rws, setRws] = useState<WilayahRw[]>([])
  const [rts, setRts] = useState<WilayahRt[]>([])

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<WilayahProcessing>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const [hamletResponse, rwResponse, rtResponse] = await Promise.all([
        getHamlets(),
        getRws(),
        getRts(),
      ])

      setHamlets(unwrapList(hamletResponse).map(normalizeHamlet))
      setRws(unwrapList(rwResponse).map(normalizeRw))
      setRts(unwrapList(rtResponse).map(normalizeRt))
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  // ==========================================
  // DUSUN
  // ==========================================

  const createHamlet = useCallback(async (payload: WilayahPayload) => {
    setProcessing('create-hamlet')
    setError('')

    try {
      const response = await apiCreateHamlet(payload)
      const created = unwrap(response)

      if (created) {
        setHamlets((current) => [...current, normalizeHamlet(created)])
      }

      return created
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const updateHamlet = useCallback(async (id: number, payload: WilayahPayload) => {
    setProcessing(`update-hamlet-${id}`)
    setError('')

    try {
      const response = await apiUpdateHamlet(id, payload)
      const updated = unwrap(response)

      if (updated) {
        const normalized = normalizeHamlet(updated)

        setHamlets((current) => current.map((item) => (item.id === id ? normalized : item)))
      }

      return updated
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const deleteHamlet = useCallback(async (id: number) => {
    setProcessing(`delete-hamlet-${id}`)
    setError('')

    try {
      await apiDeleteHamlet(id)

      setHamlets((current) => current.filter((item) => item.id !== id))

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return false
    } finally {
      setProcessing(null)
    }
  }, [])

  // ==========================================
  // RW
  // ==========================================

  const createRw = useCallback(async (payload: WilayahPayload) => {
    setProcessing('create-rw')
    setError('')

    try {
      const response = await apiCreateRw(payload)
      const created = unwrap(response)

      if (created) {
        setRws((current) => [...current, normalizeRw(created)])
      }

      return created
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const updateRw = useCallback(async (id: number, payload: WilayahPayload) => {
    setProcessing(`update-rw-${id}`)
    setError('')

    try {
      const response = await apiUpdateRw(id, payload)
      const updated = unwrap(response)

      if (updated) {
        const normalized = normalizeRw(updated)

        setRws((current) => current.map((item) => (item.id === id ? normalized : item)))
      }

      return updated
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const deleteRw = useCallback(async (id: number) => {
    setProcessing(`delete-rw-${id}`)
    setError('')

    try {
      await apiDeleteRw(id)

      setRws((current) => current.filter((item) => item.id !== id))

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return false
    } finally {
      setProcessing(null)
    }
  }, [])

  // ==========================================
  // RT
  // ==========================================

  const createRt = useCallback(async (payload: WilayahPayload) => {
    setProcessing('create-rt')
    setError('')

    try {
      const response = await apiCreateRt(payload)
      const created = unwrap(response)

      if (created) {
        setRts((current) => [...current, normalizeRt(created)])
      }

      return created
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const updateRt = useCallback(async (id: number, payload: WilayahPayload) => {
    setProcessing(`update-rt-${id}`)
    setError('')

    try {
      const response = await apiUpdateRt(id, payload)
      const updated = unwrap(response)

      if (updated) {
        const normalized = normalizeRt(updated)

        setRts((current) => current.map((item) => (item.id === id ? normalized : item)))
      }

      return updated
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const deleteRt = useCallback(async (id: number) => {
    setProcessing(`delete-rt-${id}`)
    setError('')

    try {
      await apiDeleteRt(id)

      setRts((current) => current.filter((item) => item.id !== id))

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, ERROR_FALLBACK))
      return false
    } finally {
      setProcessing(null)
    }
  }, [])

  const value = useMemo<WilayahMasterValue>(
    () => ({
      hamlets,
      rws,
      rts,
      loading,
      processing,
      error,
      refresh,
      createHamlet,
      updateHamlet,
      deleteHamlet,
      createRw,
      updateRw,
      deleteRw,
      createRt,
      updateRt,
      deleteRt,
    }),
    [
      hamlets,
      rws,
      rts,
      loading,
      processing,
      error,
      refresh,
      createHamlet,
      updateHamlet,
      deleteHamlet,
      createRw,
      updateRw,
      deleteRw,
      createRt,
      updateRt,
      deleteRt,
    ],
  )

  return <WilayahMasterContext.Provider value={value}>{children}</WilayahMasterContext.Provider>
}
