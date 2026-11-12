// ==========================================
// ProfilePage.tsx
// Halaman profil warga sesuai Image 5.
// Edit lewat popup.
// Styling mengikuti SID Global Theme.
// ==========================================

import { useState } from 'react'
import { Pencil, CheckCircle2, User, MapPin, VenetianMask, CreditCard } from 'lucide-react'

import { useAuth } from '@/features/auth/contexts/AuthContext'
import { WargaLayout } from '@/components/layout/WargaLayout'
import EditProfilWargaModal from '@/features/profil-warga/components/EditProfilWargaModal'
import { ProfilePhoto } from '@/features/profil-warga/components/ProfilePhoto'
import { UsahaSayaCard } from '@/features/data-usaha/components/UsahaSayaCard'
import { SignatureRequestsCard } from '@/features/surat/components/SignatureRequestsCard'

export default function ProfilePage() {
  const { user, patchUser } = useAuth()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <WargaLayout>
      <div className="sid-profile-page">
        {/* ======================================
            PROFILE HEADER
        ====================================== */}

        <div className="sid-profile-card sid-profile-header-card">
          <ProfilePhoto avatarClassName="sid-profile-avatar" />

          <div className="sid-profile-user-info">
            <p className="sid-profile-user-name">{user?.name ?? 'Pengguna'}</p>

            {/* Warga umumnya tanpa email: tampilkan username untuk masuk. */}
            <p className="sid-profile-user-email">
              {user?.email ?? (user?.username ? `@${user.username}` : '-')}
            </p>

            <span className="sid-profile-verification">
              <CheckCircle2 size={12} aria-hidden="true" />
              NIK terverifikasi
            </span>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="sid-profile-edit-button"
          >
            <Pencil size={14} aria-hidden="true" />
            Pengaturan Akun
          </button>
        </div>

        {/* ======================================
            PROFILE INFORMATION
        ====================================== */}

        <div className="sid-profile-card sid-profile-information">
          {/* FULL NAME */}

          <div className="sid-profile-field">
            <p className="sid-profile-field-label">Nama Lengkap</p>

            <div className="sid-profile-field-value">
              <span>{user?.name ?? '-'}</span>

              <User size={14} />
            </div>
          </div>

          {/* ALAMAT */}

          <div className="sid-profile-field">
            <p className="sid-profile-field-label">Alamat</p>

            <div className="sid-profile-field-value">
              <span>{user?.citizen?.address ?? '-'}</span>

              <MapPin size={14} />
            </div>
          </div>

          {/* GENDER */}

          <div className="sid-profile-field">
            <p className="sid-profile-field-label">Jenis Kelamin</p>

            <div className="sid-profile-field-value">
              <span>
                {user?.citizen?.gender === 'P'
                  ? 'Perempuan'
                  : user?.citizen?.gender === 'L'
                    ? 'Laki-laki'
                    : '-'}
              </span>

              <VenetianMask size={14} />
            </div>
          </div>

          {/* NIK */}

          <div className="sid-profile-field">
            <p className="sid-profile-field-label">NIK</p>

            <div className="sid-profile-field-value">
              <span>{user?.nik ?? user?.citizen?.nik_masked ?? '-'}</span>

              <CreditCard size={14} />
            </div>
          </div>
        </div>

        <SignatureRequestsCard />

        <UsahaSayaCard />

        {/* ======================================
            EDIT MODAL
        ====================================== */}

        <EditProfilWargaModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={patchUser}
          initialData={user}
        />
      </div>
    </WargaLayout>
  )
}
