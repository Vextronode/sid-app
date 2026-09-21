import { useCallback, useEffect, useMemo, useState } from 'react'

import { getPerangkatDesa, getProfilDesa, updatePerangkatDesa, updateProfilDesa } from '../api'

// ==========================================
// POSISI PERANGKAT DESA YANG DIGUNAKAN
// ==========================================

const STAFF_POSITIONS = [
  'kepala_desa',
  'sekdes',
  'kasi_pelayanan',
  'kasi_kesejahteraan',
  'kasi_pemerintahan',
  'kaur_tu_umum',
  'kaur_perencanaan',
  'kaur_keuangan',
  'kadus',
]

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
  history: '',
  vision: '',
  mission: '',
}

// ==========================================
// UNWRAP RESPONSE
// ==========================================

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null
}

// ==========================================
// NORMALIZE OFFICIAL
// ==========================================

function normalizeOfficial(official) {
  return {
    id: official?.id ?? null,
    position: official?.position ?? '',
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
    const village = unwrap(response)

    setProfile({
      id: village?.id ?? null,
      name: village?.name ?? '',
      code: village?.code ?? '',
      head_name: village?.head_name ?? '',
      address: village?.address ?? '',
      phone: village?.phone ?? '',
      history: village?.history ?? '',
      vision: village?.vision ?? '',
      mission: village?.mission ?? '',
    })
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
      .filter((official) => STAFF_POSITIONS.includes(official.position))

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
  // SEKRETARIS DESA AKTIF
  // ==========================================

  const sekdes = useMemo(
    () => activeOfficials.find((official) => official.position === 'sekdes') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // KASI PELAYANAN AKTIF
  // ==========================================

  const kasiPelayanan = useMemo(
    () => activeOfficials.find((official) => official.position === 'kasi_pelayanan') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // KASI KESEJAHTERAAN AKTIF
  // ==========================================

  const kasiKesejahteraan = useMemo(
    () => activeOfficials.find((official) => official.position === 'kasi_kesejahteraan') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // KASI PEMERINTAHAN AKTIF
  // ==========================================

  const kasiPemerintahan = useMemo(
    () => activeOfficials.find((official) => official.position === 'kasi_pemerintahan') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // KAUR TU UMUM AKTIF
  // ==========================================

  const kaurTuUmum = useMemo(
    () => activeOfficials.find((official) => official.position === 'kaur_tu_umum') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // KAUR PERENCANAAN AKTIF
  // ==========================================

  const kaurPerencanaan = useMemo(
    () => activeOfficials.find((official) => official.position === 'kaur_perencanaan') ?? null,
    [activeOfficials],
  )

  // ==========================================
  // KAUR KEUANGAN AKTIF
  // ==========================================

  const kaurKeuangan = useMemo(
    () => activeOfficials.find((official) => official.position === 'kaur_keuangan') ?? null,
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
  // PERANGKAT UTAMA
  // ==========================================
  // Berisi perangkat AKTIF untuk kebutuhan
  // tampilan utama halaman.
  // ==========================================

  const perangkatUtama = useMemo(
    () => ({
      kepalaDesa,
      sekdes,

      // Alias kasi lama tetap dipertahankan
      // agar kode lama tidak langsung rusak.
      kasi: kasiPelayanan,
      kasiPelayanan,
      kasiKesejahteraan,
      kasiPemerintahan,

      kaurTuUmum,
      kaurPerencanaan,
      kaurKeuangan,

      kadus: kadusList,
      kadusList,
    }),
    [
      kepalaDesa,
      sekdes,
      kasiPelayanan,
      kasiKesejahteraan,
      kasiPemerintahan,
      kaurTuUmum,
      kaurPerencanaan,
      kaurKeuangan,
      kadusList,
    ],
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
        address: nextProfile.address || null,
        phone: nextProfile.phone || null,
        history: nextProfile.history || null,
        vision: nextProfile.vision || null,
        mission: nextProfile.mission || null,
      })

      const updated = unwrap(response)

      setProfile({
        id: updated?.id ?? nextProfile.id ?? null,
        name: updated?.name ?? nextProfile.name,
        code: updated?.code ?? nextProfile.code,
        head_name: updated?.head_name ?? nextProfile.head_name,
        address: updated?.address ?? nextProfile.address,
        phone: updated?.phone ?? nextProfile.phone,
        history: updated?.history ?? nextProfile.history,
        vision: updated?.vision ?? nextProfile.vision,
        mission: updated?.mission ?? nextProfile.mission,
      })

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

    perangkatUtama,

    kepalaDesa,
    sekdes,

    kasiPelayanan,
    kasiKesejahteraan,
    kasiPemerintahan,

    kaurTuUmum,
    kaurPerencanaan,
    kaurKeuangan,

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
  }
}
