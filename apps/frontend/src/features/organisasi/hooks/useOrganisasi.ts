/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  addMember,
  deleteMember,
  deleteMemberPhoto,
  endMember,
  getPositions,
  updateMember,
  uploadMemberPhoto,
} from '../api'
import type { Id } from '@/types'
import type { AddOrgMemberPayload, OrgSlots, UpdateOrgMemberPayload } from '../types'

const EMPTY_SLOTS: OrgSlots = { ketua: null, wakil_ketua: null, anggota: null }

export function useOrganisasi(orgType: string) {
  const [slots, setSlots] = useState<OrgSlots>(EMPTY_SLOTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const fetchList = useCallback(async () => {
    const current = ++requestId.current
    try {
      setLoading(true)
      setError(null)
      const res = await getPositions(orgType)
      if (current !== requestId.current) return // abaikan response lama (ganti tab cepat)
      const list = res.data?.data ?? []
      setSlots({
        ketua: list.find((p) => p.slot === 'ketua') ?? null,
        wakil_ketua: list.find((p) => p.slot === 'wakil_ketua') ?? null,
        anggota: list.find((p) => p.slot === 'anggota') ?? null,
      })
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

  const withRefresh =
    <A extends unknown[]>(request: (...args: A) => Promise<unknown>) =>
    async (...args: A) => {
      try {
        await request(...args)
      } finally {
        // Tetap muat ulang bila foto gagal diunggah setelah data tersimpan.
        await fetchList()
      }
    }

  // Foto opsional diunggah setelah data anggota tersimpan.
  const fillSlot = async (positionId: Id, payload: AddOrgMemberPayload, photo?: File | null) => {
    const res = await addMember(positionId, payload)
    if (photo) await uploadMemberPhoto(positionId, res.data.data.id, photo)
  }

  const editMember = async (
    positionId: Id,
    memberId: Id,
    payload: UpdateOrgMemberPayload,
    photo?: File | null,
  ) => {
    await updateMember(positionId, memberId, payload)
    if (photo) await uploadMemberPhoto(positionId, memberId, photo)
  }

  return {
    slots,
    loading,
    error,
    refresh: fetchList,
    fillSlot: withRefresh(fillSlot),
    editMember: withRefresh(editMember),
    endMember: withRefresh(endMember),
    removeMember: withRefresh(deleteMember),
    uploadPhoto: withRefresh(uploadMemberPhoto),
    removePhoto: withRefresh(deleteMemberPhoto),
  }
}
