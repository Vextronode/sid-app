// ==========================================
// ProfilePage.jsx
// Halaman profil warga sesuai Image 5.
// Edit lewat popup.
// Styling mengikuti SID Global Theme.
// ==========================================

import { useState } from 'react';
import {
  Pencil,
  CheckCircle2,
  User,
  MapPin,
  VenetianMask,
  CreditCard,
} from 'lucide-react';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { WargaLayout } from '@/components/layout/WargaLayout';
import EditProfilWargaModal from '@/features/profil-warga/components/EditProfilWargaModal';

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <WargaLayout>

      <div className="sid-profile-page">

        {/* ======================================
            PROFILE HEADER
        ====================================== */}

        <div className="sid-profile-card sid-profile-header-card">

          <div className="sid-profile-user">

            <div className="sid-profile-avatar">
              <User size={24} />
            </div>

            <div className="sid-profile-user-info">
              <p className="sid-profile-user-name">
                {user?.name ?? 'Pengguna'}
              </p>

              <p className="sid-profile-user-email">
                {user?.email ?? '-'}
              </p>
            </div>

          </div>


          {/* STATUS NIK */}

          <div className="sid-profile-verification">
            <CheckCircle2 size={12} />
            NIK TERVERIFIKASI
          </div>


          {/* EDIT */}

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="sid-profile-edit-button"
          >
            <Pencil size={14} />
            Edit
          </button>

        </div>


        {/* ======================================
            PROFILE INFORMATION
        ====================================== */}

        <div className="sid-profile-card sid-profile-information">

          {/* FULL NAME */}

          <div className="sid-profile-field">

            <p className="sid-profile-field-label">
              Full Name
            </p>

            <div className="sid-profile-field-value">

              <span>
                {user?.name ?? '-'}
              </span>

              <User size={14} />

            </div>

          </div>


          {/* ALAMAT */}

          <div className="sid-profile-field">

            <p className="sid-profile-field-label">
              Alamat
            </p>

            <div className="sid-profile-field-value">

              <span>
                {user?.citizen?.address ?? '-'}
              </span>

              <MapPin size={14} />

            </div>

          </div>


          {/* GENDER */}

          <div className="sid-profile-field">

            <p className="sid-profile-field-label">
              Gender
            </p>

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

            <p className="sid-profile-field-label">
              NIK
            </p>

            <div className="sid-profile-field-value">

              <span>
                {user?.citizen?.nik ?? '-'}
              </span>

              <CreditCard size={14} />

            </div>

          </div>

        </div>


        {/* ======================================
            EDIT MODAL
        ====================================== */}

        <EditProfilWargaModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={(updatedUser) => setUser?.(updatedUser)}
          initialData={user}
        />

      </div>

    </WargaLayout>
  );
}