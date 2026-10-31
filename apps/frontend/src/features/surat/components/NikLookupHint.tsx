import { useEffect, useState } from 'react'

import { lookupNik } from '../api/letterExtrasApi'

export type NikLookupResult = {
  nik?: string
  status: 'idle' | 'loading' | 'found' | 'not_found'
  name?: string
  hasAccount?: boolean
  isSelf?: boolean
  familyNumber?: string
}

type NikLookupHintProps = {
  nik: string | null | undefined
  onResult: (result: NikLookupResult) => void
  witness?: string | null
  // Pesan bila NIK tidak boleh dipakai; fungsi menerima hasil pencarian.
  conflict?: string | null | ((result: NikLookupResult) => string | null | undefined)
  includeInactive?: boolean
}

/**
 * Keterangan di bawah isian NIK yang berpasangan dengan isian nama
 * (`from_nik`): begitu NIK lengkap, nama dicari di data penduduk desa.
 * Ditemukan -> nama terisi otomatis; tidak ditemukan -> isian nama muncul.
 * `witness`: label pihak yang diminta persetujuannya (mis. Saksi I);
 * `conflict`: pesan bila NIK ini tidak boleh dipakai (mis. saksi = pemohon).
 */
export function NikLookupHint({
  nik,
  onResult,
  witness = null,
  conflict = null,
  includeInactive = false,
}: NikLookupHintProps) {
  const [result, setResult] = useState<NikLookupResult>({ nik: '', status: 'idle', name: '' })
  const complete = /^\d{16}$/.test(nik ?? '')
  const current: NikLookupResult =
    complete && result.nik === nik ? result : { status: complete ? 'loading' : 'idle' }

  useEffect(() => {
    if (!complete || !nik) {
      onResult({ status: 'idle', name: '' })

      return undefined
    }

    let active = true

    lookupNik(nik, { includeInactive })
      .then((data) => {
        if (!active) return
        const next: NikLookupResult = {
          nik,
          status: data?.found ? 'found' : 'not_found',
          // Pemilik NIK yang punya akun harus menyetujui: nama tersamar,
          // nama lengkap & No. KK diisi sistem setelah pengajuan.
          hasAccount: Boolean(data?.has_account),
          isSelf: Boolean(data?.is_self),
          name: data?.name ?? '',
          familyNumber: data?.family_number ?? '',
        }
        setResult(next)
        onResult(next)
      })
      .catch(() => {
        if (!active) return
        // Gagal mencari: nama diketik manual.
        const next: NikLookupResult = { nik, status: 'not_found', name: '' }
        setResult(next)
        onResult(next)
      })

    return () => {
      active = false
    }
    // onResult dari induk berubah tiap render; pencarian cukup per NIK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nik, complete])

  if (current.status === 'loading') {
    return <p className="sid-upload-description">Mencari data NIK...</p>
  }

  const message = typeof conflict === 'function' ? conflict(current) : conflict

  if (message && current.status !== 'idle') {
    return (
      <p className="sid-form-field-error" role="alert">
        {message}
      </p>
    )
  }

  if (current.status === 'found' && current.hasAccount) {
    return (
      <p className="sid-upload-description" role="status">
        NIK terdaftar atas nama <strong>{current.name}</strong>.{' '}
        {witness
          ? `Persetujuan pemilik NIK sebagai ${witness} akan diminta setelah surat diajukan.`
          : 'Nama lengkap dan No. KK diambil dari data penduduk setelah surat diajukan.'}
      </p>
    )
  }

  if (current.status === 'found') {
    return (
      <p className="sid-upload-description" role="status">
        Nama: <strong>{current.name}</strong>
        {current.familyNumber ? (
          <>
            , No. KK: <strong>{current.familyNumber}</strong>
          </>
        ) : null}{' '}
        (dari data penduduk, diverifikasi RT)
      </p>
    )
  }

  if (current.status === 'not_found') {
    return (
      <p className="sid-form-field-error" role="status">
        Data NIK tidak ditemukan. Isi data di bawah.
      </p>
    )
  }

  return null
}
