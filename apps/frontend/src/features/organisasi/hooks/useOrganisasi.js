/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getPositions,
  createPosition,
  updatePosition,
  deletePosition,
  addMember,
  updateMember,
  deleteMember,
} from '../api'

export function useOrganisasi(orgType) {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const requestId = useRef(0)

  const fetchList = useCallback(async () => {
    const current = ++requestId.current
    try {
      setLoading(true)
      setError(null)
      const res = await getPositions(orgType)
      if (current !== requestId.current) return // abaikan response lama (ganti tab cepat)
      const list = res.data?.data ?? []
      setPositions([...list].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    } catch (err) {
      if (current !== requestId.current) return
      setError(err?.response?.data?.message || 'Gagal memuat data organisasi.')
    } finally {
      if (current === requestId.current) setLoading(false)
    }
  }, [orgType])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const addPosition = async (payload) => {
    await createPosition({ ...payload, org_type: orgType })
    await fetchList()
  }

  const editPosition = async (id, payload) => {
    await updatePosition(id, payload)
    await fetchList()
  }

  const removePosition = async (id) => {
    await deletePosition(id)
    await fetchList()
  }

  const addOrRotateMember = async (positionId, payload) => {
    await addMember(positionId, payload)
    await fetchList()
  }

  const editMember = async (positionId, memberId, payload) => {
    await updateMember(positionId, memberId, payload)
    await fetchList()
  }

  const removeMember = async (positionId, memberId) => {
    await deleteMember(positionId, memberId)
    await fetchList()
  }

  return {
    positions,
    loading,
    error,
    refresh: fetchList,
    addPosition,
    editPosition,
    removePosition,
    addOrRotateMember,
    editMember,
    removeMember,
  }
}
