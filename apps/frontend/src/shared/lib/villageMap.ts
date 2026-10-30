// Lokasi kantor desa (village.latitude, village.longitude), diatur Petugas
// Desa di Kelola Profil Desa. Satu-satunya sumber link "Buka di peta";
// jangan menulis koordinat atau link peta di kode.

import { formatVillageName } from './villageName'

export type Coords = [number, number]

// Cukup lokasi (dan nama untuk link peta), mis. Village dari API.
type VillageLocation = {
  latitude?: unknown
  longitude?: unknown
  name?: unknown
}

const isCoord = (value: unknown, limit: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit

/** [lat, lng], atau null bila lokasi belum diatur. */
export function villageCoords(village: VillageLocation | null | undefined): Coords | null {
  const lat = village?.latitude
  const lng = village?.longitude

  return isCoord(lat, 90) && isCoord(lng, 180) ? [lat, lng] : null
}

/**
 * Link Google Maps ke kantor desa, atau null bila lokasi belum diatur.
 * Maps mencari "Kantor Desa X" di sekitar titik kantor, sehingga yang terbuka
 * kartu tempatnya (dengan nama), bukan sekadar angka koordinat. Tanpa nama
 * desa, link menunjuk koordinatnya saja.
 */
export function googleMapsUrl(village: VillageLocation | null | undefined) {
  const coords = villageCoords(village)
  if (!coords) return null

  const name = formatVillageName(village?.name)
  if (!name) return `https://www.google.com/maps/search/?api=1&query=${coords.join(',')}`

  return `https://www.google.com/maps/search/${encodeURIComponent(`Kantor ${name}`)}/@${coords.join(',')},17z`
}

/**
 * Teks "lat, lng" (mis. hasil salin dari Google Maps) -> [lat, lng].
 * Teks kosong -> null; teks yang tidak valid -> undefined.
 */
export function parseCoords(text: unknown): Coords | null | undefined {
  const trimmed = String(text ?? '').trim()
  if (trimmed === '') return null

  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return undefined

  const coords = [Number(match[1]), Number(match[2])]

  return villageCoords({ latitude: coords[0], longitude: coords[1] }) ?? undefined
}

/** [lat, lng] -> "lat, lng" dengan 7 angka desimal (presisi kolom backend). */
export function formatCoords(coords: Coords | null | undefined) {
  return coords ? coords.map((value) => Number(value.toFixed(7))).join(', ') : ''
}
