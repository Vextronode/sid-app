import { useEffect, useState } from 'react'

import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'

const EMPTY_INFO = { village: null, stats: null, contacts: [] }

// Identitas dan kontak desa dipakai beberapa komponen publik sekaligus
// (beranda, header, footer, pusat bantuan), jadi satu permintaan dibagi bersama.
let sharedRequest = null
const listeners = new Set()

function loadPublicVillageInfo() {
  if (!sharedRequest) {
    const params = publicVillageParams()

    sharedRequest = Promise.all([
      api.get('/api/public/home', { params }).catch(() => null),
      api.get('/api/public/contact-us', { params }).catch(() => null),
    ]).then(([homeResponse, contactResponse]) => ({
      village: homeResponse?.data?.data?.village ?? null,
      stats: homeResponse?.data?.data?.public_stats ?? null,
      contacts: contactResponse?.data?.data ?? [],
    }))
  }

  return sharedRequest
}

// Muat ulang setelah Petugas Desa mengubah profil (mis. logo), agar header
// dan halaman publik yang sedang terbuka langsung memakai data baru.
export async function refreshPublicVillageInfo() {
  sharedRequest = null
  const result = await loadPublicVillageInfo()
  listeners.forEach((listener) => listener(result))
  return result
}

export function usePublicVillageInfo() {
  const [info, setInfo] = useState(EMPTY_INFO)

  useEffect(() => {
    let active = true
    const listener = (result) => {
      if (active) setInfo(result)
    }

    listeners.add(listener)
    loadPublicVillageInfo().then(listener)

    return () => {
      active = false
      listeners.delete(listener)
    }
  }, [])

  return info
}
