// ==========================================
// KelolaProfilDesaPage.tsx
// Halaman Profil Desa untuk Operator Desa
// Data berasal dari API backend.
// ==========================================

import { useMemo, useState } from 'react'
import { Pencil, Users, Building2, Eye, ClipboardList, Mail, MapPin, Phone } from 'lucide-react'

import { useProfilDesa } from '@/features/profil-desa-admin/hooks/useProfilDesa'
import EditProfilDesaModal from '@/features/profil-desa-admin/components/EditProfilDesaModal'
import EditVisiMisiModal from '@/features/profil-desa-admin/components/EditVisiMisiModal'
import EditPerangkatDesaModal from '@/features/profil-desa-admin/components/EditPerangkatDesaModal'
import PengesahanSuratCard from '@/features/profil-desa-admin/components/PengesahanSuratCard'
import TampilanPublikCard from '@/features/profil-desa-admin/components/TampilanPublikCard'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { PageLoader } from '@/components/ui/PageLoader'
import { notifySuccess } from '@/shared/lib/toast'
import type { EditablePerson } from '@/features/profil-desa-admin/components/EditPerangkatDesaModal'
import type { VillageProfileForm } from '@/features/profil-desa-admin/types'

type AvatarProps = {
  src: string | null
  name?: string
  size?: 'tiny' | 'small' | 'medium' | 'large'
}

function Avatar({ src, name, size = 'medium' }: AvatarProps) {
  return (
    <div className={`sid-profil-desa-avatar sid-profil-desa-avatar-${size}`}>
      {src ? (
        <img src={src} alt={name || 'Foto perangkat desa'} />
      ) : (
        <Users size={20} className="sid-profil-desa-avatar-placeholder" />
      )}
    </div>
  )
}

function formatValue(value: string | null | undefined) {
  return value?.trim() ? value : '-'
}

export default function KelolaProfilDesaPage() {
  const {
    profile,
    officials,

    // Perangkat AKTIF untuk tampilan utama
    kepalaDesa,
    perangkatList,
    kadusList,

    loading,
    processing,
    error,
    updateProfile,
    updateVisiMisi,
    updateOfficial,
    uploadImage,
  } = useProfilDesa()

  const [modalProfil, setModalProfil] = useState(false)
  const [modalVisiMisi, setModalVisiMisi] = useState(false)
  const [modalPerangkat, setModalPerangkat] = useState(false)

  // ==========================================
  // CARI OFFICIAL UNTUK MODAL
  // ==========================================
  // Menggunakan officials, bukan activeOfficials,
  // supaya perangkat nonaktif tetap bisa diedit
  // dan diaktifkan kembali.
  // ==========================================

  // Dimemo agar modal tidak mereset isian setiap kali halaman dirender ulang
  // (mis. saat simpan gagal dan status processing berubah).
  const modalPerangkatList = useMemo(
    () => officials.filter((official) => official.position !== 'kadus'),
    [officials],
  )

  const modalKadusList = useMemo(
    () => officials.filter((official) => official.position === 'kadus'),
    [officials],
  )

  const visiMisiData = useMemo(
    () => ({ vision: profile.vision, mission: profile.mission }),
    [profile.vision, profile.mission],
  )

  // ==========================================
  // UPDATE PROFIL DESA
  // ==========================================

  const handleUpdateProfile = async (payload: Partial<VillageProfileForm>) => {
    try {
      await updateProfile(payload)
      notifySuccess('Profil desa berhasil diperbarui.')
      setModalProfil(false)
    } catch {
      // Error sudah ditangani di hook.
    }
  }

  // ==========================================
  // UPDATE VISI & MISI
  // ==========================================

  const handleUpdateVisiMisi = async (payload: { vision: string; mission: string }) => {
    try {
      await updateVisiMisi(payload)
      notifySuccess('Visi dan misi berhasil diperbarui.')
      setModalVisiMisi(false)
    } catch {
      // Error sudah ditangani di hook.
    }
  }

  // ==========================================
  // UPDATE PERANGKAT DESA
  // ==========================================

  const handleUpdatePerangkat = async (
    perangkat: EditablePerson[],
    kadusData: EditablePerson[],
  ) => {
    try {
      const updates: Promise<void>[] = []

      const perangkatEntries = Array.isArray(perangkat) ? perangkat : []

      perangkatEntries.forEach((official) => {
        if (!official?.id) {
          return
        }

        updates.push(
          updateOfficial(official.id, {
            phone_wa: official.phoneWa || null,
            notes: official.notes || null,
          }),
        )
      })

      if (Array.isArray(kadusData)) {
        kadusData.forEach((kadus) => {
          if (!kadus?.id) {
            return
          }

          updates.push(
            updateOfficial(kadus.id, {
              phone_wa: kadus.phoneWa || null,
              notes: kadus.notes || null,
            }),
          )
        })
      }

      await Promise.all(updates)

      notifySuccess('Data perangkat desa berhasil diperbarui.')
      setModalPerangkat(false)
    } catch {
      // Error sudah ditangani di hook.
    }
  }

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div className="sid-profil-desa-page">
        <div className="sid-profil-desa-content">
          <PageLoader label="Memuat profil desa..." />
        </div>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="sid-profil-desa-page">
      <div className="sid-profil-desa-content">
        {/* ==========================================
            HEADER
            ========================================== */}

        <div className="sid-profil-desa-header">
          <div className="sid-profil-desa-header-info">
            <p className="sid-profil-desa-eyebrow">Profil Desa</p>

            <h1>{formatValue(profile.name)}</h1>

            <p>
              Kelola informasi resmi, visi dan misi, serta data perangkat Desa{' '}
              {formatValue(profile.name)}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalProfil(true)}
            className="sid-profil-desa-edit-btn"
            disabled={processing}
          >
            <Pencil size={14} />
            Edit Profil Desa
          </button>
        </div>

        {/* ==========================================
            ERROR
            ========================================== */}

        {error && <div className="sid-profil-desa-error">{error}</div>}

        {/* ==========================================
            INFORMASI DESA
            ========================================== */}

        <div className="sid-profil-desa-card sid-profil-desa-info-card">
          <div className="sid-profil-desa-card-heading">
            <div className="sid-profil-desa-section-heading">
              <div className="sid-profil-desa-section-icon">
                <Building2 size={16} />
              </div>

              <div>
                <h3>Informasi Desa</h3>
                <p>Data identitas dan informasi umum desa.</p>
              </div>
            </div>
          </div>

          <div className="sid-profil-desa-info-grid">
            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Nama Desa</span>

              <p className="sid-profil-desa-info-value">{formatValue(profile.name)}</p>
            </div>

            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Kode Desa</span>

              <p className="sid-profil-desa-info-value">{formatValue(profile.code)}</p>
            </div>

            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Kepala Desa</span>

              <p className="sid-profil-desa-info-value">{formatValue(profile.head_name)}</p>
            </div>

            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Nomor Telepon</span>

              <p className="sid-profil-desa-info-value">
                {profile.phone ? (
                  <>
                    <Phone size={14} />
                    {profile.phone}
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>

            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Email Kantor Desa</span>

              <p className="sid-profil-desa-info-value">
                {profile.email ? (
                  <>
                    <Mail size={14} />
                    {profile.email}
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>

            {/* Wilayah administratif (juga tercetak di kop surat). */}
            {[
              ['Kecamatan', profile.district],
              ['Kabupaten/Kota', profile.regency],
              ['Provinsi', profile.province],
              ['Kode Pos', profile.postal_code],
            ].map(([label, value]) => (
              <div key={label} className="sid-profil-desa-info-item">
                <span className="sid-profil-desa-info-label">{label}</span>

                <p className="sid-profil-desa-info-value">{formatValue(value)}</p>
              </div>
            ))}

            <div className="sid-profil-desa-info-item">
              <span className="sid-profil-desa-info-label">Luas Wilayah</span>

              <p className="sid-profil-desa-info-value">
                {profile.area_ha === '' || profile.area_ha === null
                  ? '-'
                  : `${Number(profile.area_ha).toLocaleString('id-ID', { maximumFractionDigits: 3 })} ha`}
              </p>
            </div>

            <div className="sid-profil-desa-info-item sid-profil-desa-info-item-full">
              <span className="sid-profil-desa-info-label">Alamat</span>

              <p className="sid-profil-desa-info-value sid-profil-desa-info-address">
                {profile.address ? (
                  <>
                    <MapPin size={14} />
                    {profile.address}
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>

            <div className="sid-profil-desa-info-item sid-profil-desa-info-item-full">
              <span className="sid-profil-desa-info-label">Sejarah Desa</span>

              <p className="sid-profil-desa-info-description">{formatValue(profile.history)}</p>
            </div>
          </div>
        </div>

        {/* ==========================================
            TAMPILAN HALAMAN PUBLIK
            ========================================== */}

        <TampilanPublikCard
          profile={profile}
          onUpload={uploadImage}
          onEditText={() => setModalProfil(true)}
          disabled={processing}
        />

        {/* ==========================================
            STEMPEL & TANDA TANGAN KEPALA DESA
            ========================================== */}

        <PengesahanSuratCard />

        {/* ==========================================
            VISI & MISI
            ========================================== */}

        <div className="sid-profil-desa-card sid-profil-desa-visi-misi">
          <div className="sid-profil-desa-perangkat-header">
            <div className="sid-profil-desa-section-heading">
              <div className="sid-profil-desa-section-icon">
                <Eye size={16} />
              </div>

              <div>
                <h3>Visi & Misi</h3>
                <p>Arah dan tujuan pembangunan Desa.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalVisiMisi(true)}
              className="sid-profil-desa-inline-edit"
              disabled={processing}
            >
              <Pencil size={12} />
              Edit Visi &amp; Misi
            </button>
          </div>

          <div className="sid-profil-desa-visi-misi-grid">
            <div className="sid-profil-desa-visi">
              <div className="sid-profil-desa-section-heading">
                <div className="sid-profil-desa-section-icon">
                  <Eye size={16} />
                </div>

                <h3>Visi</h3>
              </div>

              <p className="sid-profil-desa-visi-text">
                {profile.vision ? `"${profile.vision}"` : '-'}
              </p>
            </div>

            <div className="sid-profil-desa-misi">
              <div className="sid-profil-desa-section-heading">
                <div className="sid-profil-desa-section-icon">
                  <ClipboardList size={16} />
                </div>

                <h3>Misi</h3>
              </div>

              <p className="sid-profil-desa-misi-text">{formatValue(profile.mission)}</p>
            </div>
          </div>
        </div>

        {/* ==========================================
            PERANGKAT DESA
            ========================================== */}

        <div className="sid-profil-desa-card sid-profil-desa-perangkat">
          <div className="sid-profil-desa-perangkat-header">
            <div className="sid-profil-desa-section-heading">
              <div className="sid-profil-desa-section-icon">
                <Users size={16} />
              </div>

              <div>
                <h3>Perangkat Desa</h3>
                <p>Data perangkat desa yang terdaftar pada sistem.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalPerangkat(true)}
              className="sid-profil-desa-inline-edit"
              disabled={processing}
            >
              <Pencil size={12} />
              Edit Perangkat Desa
            </button>
          </div>

          {/* ==========================================
              KEPALA DESA
              ========================================== */}

          {kepalaDesa && (
            <div className="sid-profil-desa-kepala">
              <Avatar src={kepalaDesa.photo} name={kepalaDesa.name} size="large" />

              <p className="sid-profil-desa-kepala-name">{formatValue(kepalaDesa.name)}</p>

              <p className="sid-profil-desa-kepala-role">{kepalaDesa.positionLabel}</p>
            </div>
          )}

          {/* ==========================================
              SEKDES, KASI & KAUR AKTIF
              ========================================== */}

          {perangkatList.length > 0 && (
            <div className="sid-profil-desa-main-officials">
              {perangkatList.map((official) => (
                <div key={official.id} className="sid-profil-desa-official-card">
                  <Avatar src={official.photo} name={official.name} size="small" />

                  <p className="sid-profil-desa-official-name">{formatValue(official.name)}</p>

                  <p className="sid-profil-desa-official-role">{official.positionLabel}</p>
                </div>
              ))}
            </div>
          )}

          {/* ==========================================
              KEPALA DUSUN AKTIF
              ========================================== */}

          <p className="sid-profil-desa-kadus-title">Kepala Dusun (Kadus)</p>

          {kadusList.length > 0 ? (
            <div className="sid-profil-desa-kadus-list">
              {kadusList.map((kadus) => (
                <div key={kadus.id} className="sid-profil-desa-kadus">
                  <Avatar src={kadus.photo} name={kadus.name} size="tiny" />

                  <p>{formatValue(kadus.name)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="sid-profil-desa-empty">Belum ada data Kepala Dusun.</p>
          )}
        </div>
      </div>

      <SiteFooter />

      {/* ==========================================
          MODAL PROFIL
          ========================================== */}

      <EditProfilDesaModal
        open={modalProfil}
        onClose={() => setModalProfil(false)}
        onSubmit={handleUpdateProfile}
        initialData={profile}
        processing={processing}
        error={error}
      />

      {/* ==========================================
          MODAL VISI MISI
          ========================================== */}

      <EditVisiMisiModal
        open={modalVisiMisi}
        onClose={() => setModalVisiMisi(false)}
        onSubmit={handleUpdateVisiMisi}
        initialData={visiMisiData}
        processing={processing}
        error={error}
      />

      {/* ==========================================
          MODAL PERANGKAT
          ========================================== */}

      <EditPerangkatDesaModal
        open={modalPerangkat}
        onClose={() => setModalPerangkat(false)}
        onSubmit={handleUpdatePerangkat}
        // SEMUA DATA, termasuk nonaktif
        initialPerangkat={modalPerangkatList}
        initialKadus={modalKadusList}
        processing={processing}
        error={error}
      />
    </div>
  )
}
