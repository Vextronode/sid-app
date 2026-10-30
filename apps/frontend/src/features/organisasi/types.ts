// Organisasi desa (BPD, LPM, PKK, Karang Taruna): jabatan berupa slot tetap
// yang dibuat backend (VillageOrgPositionResource).
import type { IsoDateString } from '@/types'

export type OrgSlot = 'ketua' | 'wakil_ketua' | 'anggota'

export type OrgMember = {
  id: number
  position_id: number
  member_name: string
  photo_img: string | null
  phone_wa: string | null
  started_at: IsoDateString | null
  ended_at: IsoDateString | null
  is_active: boolean
  notes: string | null
}

export type OrgPosition = {
  id: number
  village_id: string
  org_type: string
  slot: OrgSlot
  position_label: string
  is_single_occupant: boolean
  sort_order: number
  is_active: boolean
  members?: OrgMember[]
}

export type OrgSlots = Record<OrgSlot, OrgPosition | null>

// Mengisi slot: nama baru, atau promosi anggota (from_member_id).
// previous_holder: nasib pemegang Ketua/Wakil lama.
export type AddOrgMemberPayload = {
  member_name?: string | null
  from_member_id?: number | null
  previous_holder?: 'end' | 'to_member'
  phone_wa?: string | null
  started_at: string
  notes?: string | null
}

export type UpdateOrgMemberPayload = {
  member_name?: string
  phone_wa?: string | null
  notes?: string | null
  is_active?: boolean
}

export type EndOrgMemberPayload = { ended_at?: string | null; to_member?: boolean }
