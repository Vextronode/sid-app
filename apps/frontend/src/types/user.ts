// Akun pengguna. Sumber: UserResource, enum UserRole (backend).
import type { IsoDateString } from './api'
import type { Citizen, Official } from './citizen'

export type UserRole =
  | 'warga'
  | 'rt'
  | 'rw'
  | 'kadus'
  | 'kasi_pemerintahan'
  | 'kaur_tu_umum'
  | 'staf_sid'
  | 'kepala_desa'
  | 'sekretaris_desa'

export type User = {
  id: number
  village_id: number
  citizen_id: number | null
  name: string
  username: string | null
  role: UserRole
  role_label: string | null
  photo_url: string | null
  email: string | null
  // NIK utuh hanya dikirim untuk akun milik sendiri (GET /api/user).
  nik?: string | null
  is_active: boolean
  must_change_password: boolean
  created_at: IsoDateString | null
  updated_at: IsoDateString | null
  citizen?: Citizen
  official?: Official
}
