import { useEffect, useState } from 'react'

import api from '@/lib/api'
import { publicVillageParams } from '@/shared/lib/api/publicVillageParams'
import type { Village } from '@/types'

// Sumber: GET /api/public/home (PublicOfficialResource, AnnouncementResource,
// PublicPageService::publicStats) dan GET /api/public/contact-us (PublicContactResource).
export type PublicVillageHead = {
  id: number
  position: string
  position_label: string
  name: string | null
  hamlet_id: number | null
  hamlet_name: string | null
  photo_url: string | null
}

export type PublicStats = {
  total_population: number
  total_hamlets: number
}

export type PublicContact = {
  position: string
  name: string | null
  phone_wa: string | null
  wa_link: string | null
}

export type PublicAnnouncement = {
  title: string
  body: string | null
  link_url: string | null
  expires_at: string | null
  updated_at: string | null
}

export type PublicVillageInfo = {
  village: Village | null
  villageHead: PublicVillageHead | null
  stats: PublicStats | null
  contacts: PublicContact[]
  announcement: PublicAnnouncement | null
}

const EMPTY_INFO: PublicVillageInfo = {
  village: null,
  villageHead: null,
  stats: null,
  contacts: [],
  announcement: null,
}

// Identitas dan kontak desa dipakai beberapa komponen publik sekaligus
// (beranda, header, footer, pusat bantuan), jadi satu permintaan dibagi bersama.
//
// Identitas (village, stats) dan kontak dimuat terpisah: identitas langsung
// dibagikan begitu /home selesai, tanpa menunggu /contact-us. Lambang dan foto
// hero di header/beranda bergantung padanya.
//
// Identitas terakhir juga disimpan di localStorage (stale-while-revalidate):
// kunjungan berikutnya langsung tahu URL lambang dan foto hero saat render
// pertama, lalu tetap diperbarui dari API.
const CACHE_PREFIX = 'sid:public-village-info:'

let sharedRequest: Promise<PublicVillageInfo> | null = null
let current: PublicVillageInfo | null = null
const listeners = new Set<(info: PublicVillageInfo) => void>()

function cacheKey() {
  return CACHE_PREFIX + (publicVillageParams().village_code ?? 'default')
}

function readCache(): PublicVillageInfo | null {
  try {
    const cached = JSON.parse(window.localStorage.getItem(cacheKey()) ?? 'null')
    return cached?.village
      ? {
          ...EMPTY_INFO,
          village: cached.village,
          villageHead: cached.villageHead ?? null,
          stats: cached.stats,
        }
      : null
  } catch {
    return null
  }
}

function writeCache({
  village,
  villageHead,
  stats,
}: Pick<PublicVillageInfo, 'village' | 'villageHead' | 'stats'>) {
  try {
    window.localStorage.setItem(cacheKey(), JSON.stringify({ village, villageHead, stats }))
  } catch {
    // Storage penuh atau diblokir: cukup tanpa cache.
  }
}

function currentInfo() {
  if (!current) current = readCache() ?? EMPTY_INFO
  return current
}

function publish(partial: Partial<PublicVillageInfo>) {
  current = { ...currentInfo(), ...partial }
  listeners.forEach((listener) => listener(current))
}

function loadPublicVillageInfo() {
  if (!sharedRequest) {
    const params = publicVillageParams()

    const home = api
      .get('/api/public/home', { params })
      .then((response) => {
        const identity = {
          village: response?.data?.data?.village ?? null,
          // Kepala Desa aktif (nama + foto) untuk Sambutan Kepala Desa.
          villageHead: response?.data?.data?.village_head ?? null,
          stats: response?.data?.data?.public_stats ?? null,
        }
        if (identity.village) writeCache(identity)
        // Pengumuman punya batas waktu, jadi tidak ikut disimpan di cache.
        publish({ ...identity, announcement: response?.data?.data?.announcement ?? null })
      })
      // Gagal: identitas dari cache (bila ada) tetap dipakai.
      .catch((): null => null)

    const contacts = api
      .get('/api/public/contact-us', { params })
      .then((response) => publish({ contacts: response?.data?.data ?? [] }))
      .catch((): null => null)

    sharedRequest = Promise.all([home, contacts]).then(() => currentInfo())
  }

  return sharedRequest
}

// Muat ulang setelah Staf SIDUTama mengubah profil (mis. logo), agar header
// dan halaman publik yang sedang terbuka langsung memakai data baru.
export async function refreshPublicVillageInfo() {
  sharedRequest = null
  return loadPublicVillageInfo()
}

export function usePublicVillageInfo() {
  const [info, setInfo] = useState(currentInfo)

  useEffect(() => {
    let active = true
    const listener = (result: PublicVillageInfo) => {
      if (active) setInfo(result)
    }

    listeners.add(listener)
    // Bagian yang sudah dimuat komponen lain sebelum komponen ini terpasang.
    listener(currentInfo())
    loadPublicVillageInfo()

    return () => {
      active = false
      listeners.delete(listener)
    }
  }, [])

  return info
}
