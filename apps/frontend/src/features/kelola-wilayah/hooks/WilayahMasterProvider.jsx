import { useCallback, useEffect, useMemo, useState } from 'react'

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

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null
}

function unwrapList(response) {
  const data = unwrap(response)

  if (Array.isArray(data)) {
    return data
  }

  if (Array.isArray(data?.data)) {
    return data.data
  }

  return []
}

function normalizeHamlet(item) {
  return {
    id: item?.id ?? null,
    code: item?.code ?? '',
    name: item?.name ?? '',
    isActive: Boolean(item?.is_active),
    villageId: item?.village_id ?? null,
  }
}

function normalizeRw(item) {
  return {
    id: item?.id ?? null,
    number: item?.number ?? '',
    fullLabel: item?.full_label ?? `RW ${item?.number ?? ''}`,
    isActive: Boolean(item?.is_active),
    hamletId: item?.hamlet_id ?? item?.hamlet?.id ?? null,
    hamlet: item?.hamlet
      ? {
          id: item.hamlet.id ?? null,
          name: item.hamlet.name ?? '',
          code: item.hamlet.code ?? '',
        }
      : null,
  }
}

function normalizeRt(item) {
  return {
    id: item?.id ?? null,
    number: item?.number ?? '',
    fullLabel: item?.full_label ?? `RT ${item?.number ?? ''}`,
    isActive: Boolean(item?.is_active),
    rwId: item?.rw_id ?? item?.rw?.id ?? null,
    rw: item?.rw
      ? {
          id: item.rw.id ?? null,
          number: item.rw.number ?? '',
          fullLabel: item.rw.full_label ?? '',
          hamletId: item.rw.hamlet_id ?? null,
        }
      : null,
  }
}

function getApiErrorMessage(error) {
  const response = error?.response?.data

  if (response?.errors) {
    const firstError = Object.values(response.errors).flat()?.[0]

    if (firstError) {
      return firstError
    }
  }

  return response?.message ?? error?.message ?? 'Terjadi kesalahan saat memproses data wilayah.'
}

export function WilayahMasterProvider({ children }) {
  const [hamlets, setHamlets] = useState([])
  const [rws, setRws] = useState([])
  const [rts, setRts] = useState([])

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
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
      setError(getApiErrorMessage(requestError))
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

  const createHamlet = useCallback(async (payload) => {
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
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const updateHamlet = useCallback(async (id, payload) => {
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
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const deleteHamlet = useCallback(async (id) => {
    setProcessing(`delete-hamlet-${id}`)
    setError('')

    try {
      await apiDeleteHamlet(id)

      setHamlets((current) => current.filter((item) => item.id !== id))

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      return false
    } finally {
      setProcessing(null)
    }
  }, [])

  // ==========================================
  // RW
  // ==========================================

  const createRw = useCallback(async (payload) => {
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
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const updateRw = useCallback(async (id, payload) => {
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
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const deleteRw = useCallback(async (id) => {
    setProcessing(`delete-rw-${id}`)
    setError('')

    try {
      await apiDeleteRw(id)

      setRws((current) => current.filter((item) => item.id !== id))

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      return false
    } finally {
      setProcessing(null)
    }
  }, [])

  // ==========================================
  // RT
  // ==========================================

  const createRt = useCallback(async (payload) => {
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
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const updateRt = useCallback(async (id, payload) => {
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
      setError(getApiErrorMessage(requestError))
      return null
    } finally {
      setProcessing(null)
    }
  }, [])

  const deleteRt = useCallback(async (id) => {
    setProcessing(`delete-rt-${id}`)
    setError('')

    try {
      await apiDeleteRt(id)

      setRts((current) => current.filter((item) => item.id !== id))

      return true
    } catch (requestError) {
      setError(getApiErrorMessage(requestError))
      return false
    } finally {
      setProcessing(null)
    }
  }, [])

  const value = useMemo(
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
