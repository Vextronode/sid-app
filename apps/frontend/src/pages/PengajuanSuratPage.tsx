/* eslint-disable @typescript-eslint/no-unused-vars */
// ==========================================
// PengajuanSuratPage.tsx
// Dua mode:
// - DENGAN kode di URL (klik kartu jenis surat) -> langsung terisi,
//   dropdown jenis surat locked/tidak bisa diganti.
// - TANPA kode (klik "Ajukan Permohonan Baru") -> dropdown kosong,
//   form baru muncul setelah user pilih jenis surat.
// ==========================================

import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/features/auth/contexts/AuthContext'
import { DynamicSuratForm } from '@/features/surat/components/DynamicSuratForm'
import { useLetterTypes } from '@/features/surat/hooks/useLetterTypes'
import { getLetterTypeFormConfig } from '@/features/surat/utils/letterTypeConfig'
import { WargaLayout } from '@/components/layout/WargaLayout'
import { notifySuccess } from '@/shared/lib/toast'
import { LetterTypePicker } from '@/features/surat/components/LetterTypePicker'

export function PengajuanSuratPage() {
  const { kode } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { letterTypes, loading, error } = useLetterTypes()

  // Kalau nggak ada kode di URL, mulai kosong (user harus pilih dulu)
  const [selectedCode, setSelectedCode] = useState(kode?.toUpperCase() ?? '')

  const selectedLetterType = letterTypes.find((type) => type.code === selectedCode)
  const currentConfig = getLetterTypeFormConfig(selectedLetterType)
  const isLocked = !!kode // kalau dari URL langsung, dropdown dikunci

  const handleCancel = () => navigate('/jenis-surat')

  const handleSubmit = (data) => {
    const bulan = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Ags',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ]

    const tgl = new Date()

    const formatTanggal = `${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`

    const suratBaru = {
      id: Date.now(),
      noSurat: '-',
      pemohon: user?.name || 'Warga Desa',
      jenis: currentConfig.code || 'SKD',
      tanggal: formatTanggal,
      status: 'pending',
      nik: data.nik || null,
      alamat: data.alamat || null,
      keperluan: data.keperluan || null,
      processed_at: data.processed_at || null,
    }

    // Toast tetap tampil setelah pindah ke daftar surat.
    notifySuccess('Permohonan surat berhasil dikirim.')
    navigate('/surat-saya')
  }

  return (
    <WargaLayout>
      <div className="sid-page">
        <main className="sid-page-content">
          {/* ==========================================
              HEADER
              ========================================== */}
          <div className="sid-page-header">
            <h1 className="sid-page-title">Form Pengajuan Surat</h1>

            <p className="sid-page-description">
              Lengkapi detail di bawah ini untuk mengajukan permohonan surat administrasi.
            </p>
          </div>

          {/* ==========================================
              LANGKAH 1
              ========================================== */}
          <div className="sid-card">
            <div className="sid-step-title">
              <span className="sid-step-number">1</span>

              <span>LANGKAH 1 – PILIH JENIS SURAT</span>
            </div>

            {/* Kartu jenis surat; dari tautan berkode, pilihan dikunci. */}
            <LetterTypePicker
              letterTypes={letterTypes}
              loading={loading}
              error={error}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              locked={isLocked}
            />

            {!loading && !error && selectedLetterType && !currentConfig && (
              <p role="alert">Formulir untuk jenis surat ini belum tersedia.</p>
            )}
          </div>

          {/* ==========================================
              FORM / EMPTY STATE
              ========================================== */}
          {currentConfig ? (
            <DynamicSuratForm
              config={currentConfig}
              letterTypes={letterTypes}
              onCancel={handleCancel}
              onSubmit={handleSubmit}
            />
          ) : !loading && !error && !selectedLetterType ? (
            <div className="sid-card sid-empty-state">
              Silakan pilih jenis surat di atas untuk melanjutkan.
            </div>
          ) : null}
        </main>
      </div>
    </WargaLayout>
  )
}
