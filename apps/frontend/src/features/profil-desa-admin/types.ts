// Profil desa dan perangkat desa di halaman admin Profil Desa.
import type { Official, Uuid, Village } from '@/types'

// Kolom wilayah yang wajib diisi saat menetapkan jabatan berwilayah.
export type AreaScope = 'rt_id' | 'rw_id' | 'hamlet_id'

// GET /api/official-position-types `account_positions`: jabatan berakun.
export type AccountPositionData = { code: string; label: string; scope: AreaScope | null }

// POST /api/officials/candidates/lookup.
export type OfficialCandidate = {
  citizen_id: Uuid
  user_id: Uuid | null
  name: string
  username: string | null
  eligible: boolean
  reason: string | null
}

// OfficialPositionTypeResource: jabatan tanpa akun (Kasi/Kaur/Staf).
export type OfficialPositionType = {
  id: number
  code: string
  label: string
  is_single_occupant: boolean
  sort_order: number
  is_active: boolean
}

export type OfficialPositionTypePayload = Partial<
  Pick<OfficialPositionType, 'label' | 'is_single_occupant' | 'sort_order' | 'is_active'>
>

// PATCH /api/officials/{id} dan POST /api/officials.
export type OfficialPayload = Partial<
  Pick<
    Official,
    | 'citizen_id'
    | 'user_id'
    | 'position'
    | 'rt_id'
    | 'rw_id'
    | 'hamlet_id'
    | 'phone_wa'
    | 'started_at'
    | 'term_ends_at'
    | 'ended_at'
    | 'is_active'
    | 'notes'
  >
>

// Penetapan (promote) dan rotasi pejabat; dikirim multipart bersama foto.
export type OfficialAssignPayload = {
  user_id?: Uuid | null
  citizen_id?: Uuid | null
  position?: string
  rt_id?: number | string | null
  rw_id?: number | string | null
  hamlet_id?: number | string | null
  started_at: string
  term_ends_at?: string | null
  phone_wa?: string | null
  notes?: string | null
  photo: File
}

export type VillageImageKind = 'logo' | 'hero'

// State form profil desa: teks kosong '' agar aman dipakai di input.
export type VillageProfileForm = {
  id: Uuid | null
  name: string
  code: string
  head_name: string
  address: string
  phone: string
  district: string
  regency: string
  province: string
  postal_code: string
  email: string
  area_ha: number | string
  history: string
  vision: string
  mission: string
  office_hours: string
  hero_photo_credit: string
  welcome_message: string
  latitude: number | string | null
  longitude: number | string | null
  logo_url: string | null
  hero_image_url: string | null
}

// PATCH /api/villages/profile.
export type VillageProfilePayload = Partial<
  Omit<Village, 'id' | 'has_stamp_img' | 'logo_url' | 'hero_image_url'>
>

// Perangkat desa yang sudah dinormalkan untuk tampilan profil.
export type ProfileOfficial = {
  id: number | null
  position: string
  positionLabel: string
  name: string
  photo: string | null
  phoneWa: string
  isActive: boolean
  notes: string
  citizenId: Uuid | null
  userId: Uuid | null
  villageId: Uuid | null
  rtId: number | null
  rwId: number | null
  hamletId: number | null
}
