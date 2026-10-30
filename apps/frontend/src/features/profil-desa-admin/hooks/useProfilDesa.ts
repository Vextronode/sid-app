import { useCallback, useEffect, useMemo, useState } from 'react'

import { refreshPublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import {
  getPerangkatDesa,
  getProfilDesa,
  updatePerangkatDesa,
  updateProfilDesa,
  uploadVillageImage,
} from '../api'
import type { Official, ResourceResponse, Village } from '@/types'
import type {
  ProfileOfficial,
  VillageImageKind,
  VillageProfileForm,
  VillageProfilePayload,
} from '../types'
import { getApiErrorMessage } from '@/shared/lib/apiError'

// ==========================================
// POSISI YANG TIDAK TAMPIL DI PROFIL DESA
// ==========================================
// Selain ini semua jabatan ditampilkan, termasuk jenis jabatan yang
// ditambahkan Staf SIDUTama.

// Staf SIDUTama (staf_sid) ikut tampil, sama seperti di halaman publik.
const HIDDEN_POSITIONS = ['rt', 'rw']

// ==========================================
// DEFAULT PROFIL
// ==========================================

const EMPTY_PROFILE: VillageProfileForm = {
  id: null,
  name: '',
  code: '',
  head_name: '',
  address: '',
  phone: '',
  district: '',
  regency: '',
  province: '',
  postal_code: '',
  email: '',
  area_ha: '',
  history: '',
  vision: '',
  mission: '',
  // Tampilan halaman publik.
  office_hours: '',
  hero_photo_credit: '',
  welcome_message: '',
  // Titik kantor desa; null bila belum diatur.
  latitude: null,
  longitude: null,
  logo_url: null,
  hero_image_url: null,
}

// Teks profil yang dikirim lewat PATCH /villages/profile; kosong = null.
const TEXT_FIELDS: (keyof VillageProfileForm)[] = [
  'address',
  'phone',
  'district',
  'regency',
  'province',
  'postal_code',
  'email',
  'history',
  'vision',
  'mission',
  'office_hours',
  'hero_photo_credit',
  'welcome_message',
]

// Response backend -> state halaman. Nilai null jadi '' agar aman di input.
function normalizeProfile(village: Village | null | undefined): VillageProfileForm {
  const profile: Record<string, unknown> = { ...EMPTY_PROFILE }

  for (const key of Object.keys(EMPTY_PROFILE)) {
    const value = village?.[key as keyof Village]

    if (value !== undefined && value !== null) profile[key] = value
  }

  return profile as VillageProfileForm
}

// ==========================================
// UNWRAP RESPONSE
// ==========================================

// Semua endpoint di sini membungkus hasilnya dalam { data }.
function unwrap<T>(response: { data: ResourceResponse<T> } | null | undefined): T | null {
  return response?.data?.data ?? null
}

function toNumberOrNull(value: number | string | null | undefined) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

// ==========================================
// NORMALIZE OFFICIAL
// ==========================================

function normalizeOfficial(official: Official): ProfileOfficial {
  return {
    id: official?.id ?? null,
    position: official?.position ?? '',
    positionLabel: official?.position_label ?? official?.position ?? '',
    name: official?.citizen?.name ?? '',
    photo: official?.photo_img ?? null,
    phoneWa: official?.phone_wa ?? '',
    isActive: Boolean(official?.is_active),
    notes: official?.notes ?? '',
    citizenId: official?.citizen_id ?? null,
    userId: official?.user_id ?? null,
    villageId: official?.village_id ?? null,
    rtId: official?.rt_id ?? null,
    rwId: official?.rw_id ?? null,
    hamletId: official?.hamlet_id ?? null,
  }
}

// ==========================================
// HOOK
// ==========================================

export function useProfilDesa() {
  const [profile, setProfile] = useState<VillageProfileForm>(EMPTY_PROFILE)
  const [officials, setOfficials] = useState<ProfileOfficial[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  // ==========================================
  // AMBIL PROFIL DESA
  // ==========================================

  const fetchProfile = useCallback(async () => {
    const response = await getProfilDesa()
    setProfile(normalizeProfile(unwrap(response)))
  }, [])

  // ==========================================
  // AMBIL SEMUA PERANGKAT DESA
  // ==========================================

  const fetchOfficials = useCallback(async () => {
    const response = await getPerangkatDesa()
    const items = unwrap(response) ?? []

    const normalizedOfficials = items
      .map(normalizeOfficial)
      .filter((official) => !HIDDEN_POSITIONS.includes(official.position))

    // Simpan SEMUA perangkat:
    // aktif maupun nonaktif.
    setOfficials(normalizedOfficials)
  }, [])

  // ==========================================
  // LOAD SEMUA DATA
  // ==========================================

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      await Promise.all([fetchProfile(), fetchOfficials()])
    } catch (err) {
      const message = getApiErrorMessage(err, 'Data profil desa gagal dimuat.')

      setError(message)

      console.error('GET PROFIL DESA ERROR:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchProfile, fetchOfficials])

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  // ==========================================
  // PERANGKAT AKTIF
  // ==========================================
  // Hanya perangkat aktif yang boleh tampil
  // pada halaman profil utama.
  // ==========================================

  const activeOfficials = useMemo(
    () => officials.filter((official) => official.isActive),
    [officials],
  )

  // ==========================================
  // KEPALA DESA AKTIF
  // ==========================================

  const kepalaDesa = useMemo(
    () => activeOfficials.find((official) => official.position === 'kepala_desa') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // SEKDES, KASI, KAUR & STAF AKTIF
  // ==========================================
  // Semua perangkat selain Kepala Desa dan Kepala Dusun, termasuk jenis
  // jabatan yang ditambahkan Staf SIDUTama. Sekretaris Desa selalu pertama.
  // ==========================================

  const perangkatList = useMemo(
    () =>
      activeOfficials
        .filter((official) => !['kepala_desa', 'kadus'].includes(official.position))
        .sort(
          (first, second) =>
            Number(second.position === 'sekretaris_desa') -
              Number(first.position === 'sekretaris_desa') ||
            // Staf SIDUTama paling akhir, seperti urutan di halaman publik.
            Number(first.position === 'staf_sid') - Number(second.position === 'staf_sid'),
        ),
    [activeOfficials],
  )

  // ==========================================
  // KEPALA DUSUN AKTIF
  // ==========================================

  const kadusList = useMemo(
    () => activeOfficials.filter((official) => official.position === 'kadus'),
    [activeOfficials],
  )

  // ==========================================
  // UPDATE PROFIL DESA
  // ==========================================

  const updateProfile = async (payload: Partial<VillageProfileForm>) => {
    setProcessing(true)
    setError('')

    try {
      /*
       * Backend mewajibkan:
       * - name
       * - head_name
       *
       * Karena itu update dikirim sebagai
       * data profil lengkap.
       */

      const nextProfile = {
        ...profile,
        ...payload,
      }

      const fields: VillageProfilePayload = {
        name: nextProfile.name,
        head_name: nextProfile.head_name,
        ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, nextProfile[key] || null])),
        // Luas wilayah (hektare); kosong berarti belum diisi.
        area_ha: toNumberOrNull(nextProfile.area_ha),
        latitude: nextProfile.latitude ?? null,
        longitude: nextProfile.longitude ?? null,
      }
      const response = await updateProfilDesa(fields)

      const updated = unwrap(response)

      setProfile(updated ? normalizeProfile(updated) : nextProfile)
      // Header dan halaman publik yang sedang terbuka ikut memakai data baru.
      refreshPublicVillageInfo()

      return updated
    } catch (err) {
      const message = getApiErrorMessage(err, 'Profil desa gagal diperbarui.')

      setError(message)

      console.error('UPDATE PROFIL DESA ERROR:', err)

      throw err
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // UPDATE VISI & MISI
  // ==========================================

  // ==========================================
  // UNGGAH LOGO / FOTO BERANDA
  // ==========================================
  // kind: 'logo' | 'hero'. Galat dilempar ke komponen agar pesannya tampil
  // di kartu gambar yang bersangkutan.

  const uploadImage = async (kind: VillageImageKind, file: File) => {
    const response = await uploadVillageImage(kind, file)

    setProfile(normalizeProfile(unwrap(response)))
    refreshPublicVillageInfo()
  }

  const updateVisiMisi = async (payload: { vision?: string; mission?: string } | null) => {
    return updateProfile({
      vision: payload?.vision ?? '',
      mission: payload?.mission ?? '',
    })
  }

  // ==========================================
  // UPDATE PERANGKAT DESA
  // ==========================================

  const updateOfficial = async (id: number, payload: Parameters<typeof updatePerangkatDesa>[1]) => {
    setProcessing(true)
    setError('')

    try {
      await updatePerangkatDesa(id, payload)

      /*
       * Ambil ulang semua perangkat agar:
       * - status aktif/nonaktif terbaru terbaca
       * - relasi citizen tetap tersedia
       * - perubahan langsung tercermin di UI
       */
      await fetchOfficials()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Data perangkat desa gagal diperbarui.')

      setError(message)

      console.error('UPDATE OFFICIAL ERROR:', err)

      throw err
    } finally {
      setProcessing(false)
    }
  }

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // ==========================================
    // PROFIL
    // ==========================================

    profile,

    // ==========================================
    // SEMUA OFFICIAL
    // ==========================================
    // Termasuk yang nonaktif.
    // Digunakan untuk kebutuhan modal/edit.
    // ==========================================

    officials,

    // ==========================================
    // OFFICIAL AKTIF
    // ==========================================
    // Hanya yang is_active = true.
    // Digunakan untuk halaman utama.
    // ==========================================

    activeOfficials,

    // ==========================================
    // PERANGKAT UTAMA AKTIF
    // ==========================================

    kepalaDesa,
    perangkatList,
    kadusList,

    // ==========================================
    // STATE
    // ==========================================

    loading,
    processing,
    error,

    // ==========================================
    // ACTION
    // ==========================================

    refresh: fetchData,
    updateProfile,
    updateVisiMisi,
    updateOfficial,
    uploadImage,
  }
}
