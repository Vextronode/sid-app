import type { VillageArea } from '../types'
import { useState } from 'react'

// Dusun dan RW pemilik RT terpilih, untuk mengisi ulang pilihan bertingkat.
function locate(areas: VillageArea[], rtId: unknown) {
  for (const hamlet of areas) {
    for (const rw of hamlet.rws ?? []) {
      if ((rw.rts ?? []).some((rt) => String(rt.id) === String(rtId))) {
        return { hamletId: String(hamlet.id), rwId: String(rw.id) }
      }
    }
  }

  return { hamletId: '', rwId: '' }
}

/**
 * Isian wilayah desa ini: Dusun -> RW -> RT dari data wilayah desa, agar
 * pemohon tidak mengetik dusun/RT/RW yang tidak ada. Nilai isian = id RT;
 * Dusun dan RW hanya penyaring pilihan.
 */

type VillageAreaFieldProps = {
  field: { name: string; label: string }
  value: unknown
  setValue: (name: string, value: string, options?: Record<string, boolean>) => void
  areas: VillageArea[]
  // Data wilayah gagal dimuat: tampilkan pesan.
  loadFailed?: boolean
  errors: Record<string, unknown>
}

export function VillageAreaField({
  field,
  value,
  setValue,
  areas,
  loadFailed,
  errors,
}: VillageAreaFieldProps) {
  const located = locate(areas, value)
  const [hamletId, setHamletId] = useState(located.hamletId)
  const [rwId, setRwId] = useState(located.rwId)
  // Data wilayah dimuat setelah isian tampil: ikuti RT yang sudah dipilih.
  const activeHamletId = hamletId || located.hamletId
  const activeRwId = rwId || located.rwId
  const hamlet = areas.find((item) => String(item.id) === activeHamletId)
  const rw = hamlet?.rws?.find((item) => String(item.id) === activeRwId)
  const hasError = Boolean(errors[field.name])
  const selectClass = `sid-select ${hasError ? 'sid-input-error' : ''}`

  const chooseRt = (rtId: string) =>
    setValue(field.name, rtId, { shouldDirty: true, shouldValidate: hasError })

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <select
        id={field.name}
        aria-label={`${field.label} - Dusun`}
        className={selectClass}
        value={activeHamletId}
        onChange={(event) => {
          setHamletId(event.target.value)
          setRwId('')
          chooseRt('')
        }}
      >
        <option value="">Pilih dusun...</option>
        {areas.map((item) => (
          <option key={item.id} value={String(item.id)}>
            {item.name}
          </option>
        ))}
      </select>

      <select
        aria-label={`${field.label} - RW`}
        className={selectClass}
        value={activeRwId}
        disabled={!hamlet}
        onChange={(event) => {
          setRwId(event.target.value)
          chooseRt('')
        }}
      >
        <option value="">Pilih RW...</option>
        {(hamlet?.rws ?? []).map((item) => (
          <option key={item.id} value={String(item.id)}>
            RW {item.number}
          </option>
        ))}
      </select>

      <select
        aria-label={`${field.label} - RT`}
        className={selectClass}
        value={value ? String(value) : ''}
        disabled={!rw}
        onChange={(event) => chooseRt(event.target.value)}
      >
        <option value="">Pilih RT...</option>
        {(rw?.rts ?? []).map((item) => (
          <option key={item.id} value={String(item.id)}>
            RT {item.number}
          </option>
        ))}
      </select>

      {loadFailed && (
        <p className="sid-upload-description sm:col-span-3">
          Data wilayah desa gagal dimuat. Muat ulang halaman untuk mencoba lagi.
        </p>
      )}
    </div>
  )
}
