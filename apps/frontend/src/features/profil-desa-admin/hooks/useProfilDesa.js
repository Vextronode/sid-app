import { useCallback, useEffect, useMemo, useState } from 'react'

import { refreshPublicVillageInfo } from '@/features/info-desa/usePublicVillageInfo'
import {
  getPerangkatDesa,
  getProfilDesa,
  updatePerangkatDesa,
  updateProfilDesa,
  uploadVillageImage,
} from '../api'

// ==========================================
// POSISI YANG TIDAK TAMPIL DI PROFIL DESA
// ==========================================
// Selain ini semua jabatan ditampilkan, termasuk jenis jabatan yang
// ditambahkan Petugas Desa.

// Staf aplikasi (staf_sid) ikut tampil, sama seperti di halaman publik.
const HIDDEN_POSITIONS = ['rt', 'rw']

// ==========================================
// DEFAULT PROFIL
// ==========================================

const EMPTY_PROFILE = {
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
const TEXT_FIELDS = [
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
function normalizeProfile(village) {
  const profile = { ...EMPTY_PROFILE }

  for (const key of Object.keys(EMPTY_PROFILE)) {
    if (village?.[key] !== undefined && village?.[key] !== null) profile[key] = village[key]
  }

  return profile
}

// ==========================================
// UNWRAP RESPONSE
// ==========================================

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null
}

function toNumberOrNull(value) {
  return value === '' || value === null || value === undefined ? null : Number(value)
}

// ==========================================
// NORMALIZE OFFICIAL
// ==========================================

function normalizeOfficial(official) {
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
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [officials, setOfficials] = useState([])
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
    const result = unwrap(response)

    const items = Array.isArray(result) ? result : (result?.data ?? [])

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
      const message = err?.response?.data?.message ?? 'Data profil desa gagal dimuat.'

      setError(message)

      console.error('GET PROFIL DESA ERROR:', {
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method,
      })
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
  // jabatan yang ditambahkan Petugas Desa. Sekretaris Desa selalu pertama.
  // ==========================================

  const perangkatList = useMemo(
    () =>
      activeOfficials
        .filter((official) => !['kepala_desa', 'kadus'].includes(official.position))
        .sort(
          (first, second) =>
            Number(second.position === 'sekdes') - Number(first.position === 'sekdes') ||
            // Staf aplikasi paling akhir, seperti urutan di halaman publik.
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

  const updateProfile = async (payload) => {
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

      const response = await updateProfilDesa({
        name: nextProfile.name,
        head_name: nextProfile.head_name,
        ...Object.fromEntries(TEXT_FIELDS.map((key) => [key, nextProfile[key] || null])),
        // Luas wilayah (hektare); kosong berarti belum diisi.
        area_ha: toNumberOrNull(nextProfile.area_ha),
        latitude: nextProfile.latitude ?? null,
        longitude: nextProfile.longitude ?? null,
      })

      const updated = unwrap(response)

      setProfile(updated ? normalizeProfile(updated) : nextProfile)
      // Header dan halaman publik yang sedang terbuka ikut memakai data baru.
      refreshPublicVillageInfo()

      return updated
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Profil desa gagal diperbarui.'

      setError(message)

      console.error('UPDATE PROFIL DESA ERROR:', {
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method,
      })

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

  const uploadImage = async (kind, file) => {
    const response = await uploadVillageImage(kind, file)

    setProfile(normalizeProfile(unwrap(response)))
    refreshPublicVillageInfo()
  }

  const updateVisiMisi = async (payload) => {
    return updateProfile({
      vision: payload?.vision ?? '',
      mission: payload?.mission ?? '',
    })
  }

  // ==========================================
  // UPDATE PERANGKAT DESA
  // ==========================================

  const updateOfficial = async (id, payload) => {
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
      const message = err?.response?.data?.message ?? 'Data perangkat desa gagal diperbarui.'

      setError(message)

      console.error('UPDATE OFFICIAL ERROR:', {
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method,
      })

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
