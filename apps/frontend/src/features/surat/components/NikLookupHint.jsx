import { useEffect, useState } from 'react'

import { lookupNik } from '../api/letterExtrasApi'

/**
 * Keterangan di bawah isian NIK yang berpasangan dengan isian nama
 * (`from_nik`): begitu NIK lengkap, nama dicari di data penduduk desa.
 * Ditemukan -> nama terisi otomatis; tidak ditemukan -> isian nama muncul.
 */
export function NikLookupHint({ nik, onResult }) {
  const [result, setResult] = useState({ nik: '', status: 'idle', name: '' })
  const complete = /^\d{16}$/.test(nik ?? '')
  const current =
    complete && result.nik === nik ? result : { status: complete ? 'loading' : 'idle' }

  useEffect(() => {
    if (!complete) {
      onResult({ status: 'idle', name: '' })

      return undefined
    }

    let active = true

    lookupNik(nik)
      .then((data) => {
        if (!active) return
        const next = {
          nik,
          status: data?.found ? 'found' : 'not_found',
          // Pemilik NIK yang punya akun harus menyetujui: nama tersamar,
          // nama lengkap & No. KK diisi sistem setelah pengajuan.
          hasAccount: Boolean(data?.has_account),
          name: data?.name ?? '',
          familyNumber: data?.family_number ?? '',
        }
        setResult(next)
        onResult(next)
      })
      .catch(() => {
        if (!active) return
        // Gagal mencari: nama diketik manual.
        const next = { nik, status: 'not_found', name: '' }
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

  if (current.status === 'found' && current.hasAccount) {
    return (
      <p className="sid-upload-description" role="status">
        NIK terdaftar atas nama <strong>{current.name}</strong>. Persetujuan saksi akan diminta
        setelah surat diajukan.
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
