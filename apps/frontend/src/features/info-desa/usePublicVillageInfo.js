import { useEffect, useState } from 'react'

import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'

const EMPTY_INFO = { village: null, stats: null, contacts: [] }

// Identitas dan kontak desa dipakai beberapa komponen publik sekaligus
// (beranda, footer, pusat bantuan), jadi satu permintaan dibagi bersama.
let sharedRequest = null

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

export function usePublicVillageInfo() {
  const [info, setInfo] = useState(EMPTY_INFO)

  useEffect(() => {
    let active = true

    loadPublicVillageInfo().then((result) => {
      if (active) setInfo(result)
    })

    return () => {
      active = false
    }
  }, [])

  return info
}
