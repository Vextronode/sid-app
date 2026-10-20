// ==========================================
// AdminProfilePage.jsx
// Halaman Profil untuk RT/RW/Kadus/Kades/
// Operator Desa dan role admin lainnya.
//
// Styling mengikuti SID Global Theme.
// ==========================================

import { useState } from 'react'

import { Pencil, CheckCircle2, User, MapPin, VenetianMask, CreditCard } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'

import EditProfilWargaModal from '@/features/profil-warga/components/EditProfilWargaModal'
import { ProfilePhoto } from '@/features/profil-warga/components/ProfilePhoto'
import { SignatureCard } from '@/features/surat/components/SignatureCard'
import { SignatureRequestsCard } from '@/features/surat/components/SignatureRequestsCard'

import { SiteFooter } from '@/components/layout/SiteFooter'

export default function AdminProfilePage() {
  const { user, setUser } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)

  // ==========================================
  // GENDER
  // ==========================================

  const gender =
    user?.citizen?.gender === 'P' ? 'Perempuan' : user?.citizen?.gender === 'L' ? 'Laki-laki' : '-'

  return (
    <div className="sid-admin-profile-page">
      {/* ======================================
          CONTENT
      ====================================== */}

      <main className="sid-admin-profile-main">
        <div className="sid-admin-profile-content">
          {/* ====================================
              PROFILE HEADER
          ==================================== */}

          <div className="sid-admin-profile-card sid-admin-profile-header">
            <div className="sid-admin-profile-user">
              <ProfilePhoto avatarClassName="sid-admin-profile-avatar" />

              <div className="sid-admin-profile-user-info">
                <p className="sid-admin-profile-name">{user?.name ?? 'Pengguna'}</p>

                <p className="sid-admin-profile-email">{user?.email ?? '-'}</p>
              </div>
            </div>

            {/* VERIFICATION */}

            <div className="sid-admin-profile-verification">
              <CheckCircle2 size={12} />
              NIK TERVERIFIKASI
            </div>

            {/* EDIT */}

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="sid-admin-profile-edit"
            >
              <Pencil size={14} />
              Pengaturan Akun
            </button>
          </div>

          {/* ====================================
              PROFILE DETAIL
          ==================================== */}

          <div className="sid-admin-profile-card sid-admin-profile-detail">
            {/* NAMA */}

            <div className="sid-admin-profile-field">
              <p className="sid-admin-profile-label">Nama Lengkap</p>

              <div className="sid-admin-profile-value">
                <span>{user?.name ?? '-'}</span>

                <User size={14} />
              </div>
            </div>

            {/* ALAMAT */}

            <div className="sid-admin-profile-field">
              <p className="sid-admin-profile-label">Alamat</p>

              <div className="sid-admin-profile-value">
                <span>{user?.citizen?.address ?? '-'}</span>

                <MapPin size={14} />
              </div>
            </div>

            {/* JENIS KELAMIN */}

            <div className="sid-admin-profile-field">
              <p className="sid-admin-profile-label">Jenis Kelamin</p>

              <div className="sid-admin-profile-value">
                <span>{gender}</span>

                <VenetianMask size={14} />
              </div>
            </div>

            {/* NIK */}

            <div className="sid-admin-profile-field">
              <p className="sid-admin-profile-label">NIK</p>

              <div className="sid-admin-profile-value">
                <span>{user?.nik ?? user?.citizen?.nik_masked ?? '-'}</span>

                <CreditCard size={14} />
              </div>
            </div>
          </div>

          <SignatureRequestsCard />

          <SignatureCard />

          {/* ====================================
              EDIT MODAL
          ==================================== */}

          <EditProfilWargaModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSaved={(updatedUser) => setUser?.(updatedUser)}
            initialData={user}
          />
        </div>
      </main>

      {/* ======================================
          FOOTER
      ====================================== */}

      <SiteFooter />
    </div>
  )
}
