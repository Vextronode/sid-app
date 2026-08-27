// ==========================================
// AdminProfilePage.jsx
// Halaman Profil untuk RT/RW/Kadus/Kades/
// Operator Desa dan role admin lainnya.
//
// Styling mengikuti SID Global Theme.
// MobileBottomNav menyesuaikan berdasarkan user.role.
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

import EditProfilWargaModal from '@/features/profil-warga/components/EditProfilWargaModal';

import { FooterDesa } from '@/components/layout/FooterDesa';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';

import { ADMIN_MOBILE_LINKS } from '@/lib/constants/navigation';


/* =========================================================
   MOBILE NAVIGATION BERDASARKAN ROLE
   ========================================================= */

const getAdminMobileLinks = (role) => {
  switch (role) {

    case 'rt':
      return ADMIN_MOBILE_LINKS(
        '/admin/dashboard-surat-rt',
        '/admin/list-rt'
      );

    case 'rw':
      return ADMIN_MOBILE_LINKS(
        '/admin/dashboard-surat-rw',
        '/admin/list-rw'
      );

    case 'kadus':
      return ADMIN_MOBILE_LINKS(
        '/admin/dashboard-kadus',
        '/admin/list-kadus'
      );

    case 'kades':
      return ADMIN_MOBILE_LINKS(
        '/admin/dashboard-kades',
        '/admin/list-kades'
      );

    default:
      return ADMIN_MOBILE_LINKS(
        '/admin/dashboard',
        '/admin'
      );
  }
};


export default function AdminProfilePage() {

  const { user, setUser } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);


  // ==========================================
  // GENDER
  // ==========================================

  const gender =
    user?.citizen?.gender === 'P'
      ? 'Perempuan'
      : user?.citizen?.gender === 'L'
        ? 'Laki-laki'
        : '-';


  // ==========================================
  // MOBILE NAV
  // ==========================================

  const mobileLinks = getAdminMobileLinks(user?.role);


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

              <div className="sid-admin-profile-avatar">
                <User size={24} />
              </div>

              <div className="sid-admin-profile-user-info">

                <p className="sid-admin-profile-name">
                  {user?.name ?? 'Pengguna'}
                </p>

                <p className="sid-admin-profile-email">
                  {user?.email ?? '-'}
                </p>

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

              Edit

            </button>

          </div>


          {/* ====================================
              PROFILE DETAIL
          ==================================== */}

          <div className="sid-admin-profile-card sid-admin-profile-detail">


            {/* NAMA */}

            <div className="sid-admin-profile-field">

              <p className="sid-admin-profile-label">
                Nama Lengkap
              </p>

              <div className="sid-admin-profile-value">

                <span>
                  {user?.name ?? '-'}
                </span>

                <User size={14} />

              </div>

            </div>


            {/* ALAMAT */}

            <div className="sid-admin-profile-field">

              <p className="sid-admin-profile-label">
                Alamat
              </p>

              <div className="sid-admin-profile-value">

                <span>
                  {user?.citizen?.address ?? '-'}
                </span>

                <MapPin size={14} />

              </div>

            </div>


            {/* JENIS KELAMIN */}

            <div className="sid-admin-profile-field">

              <p className="sid-admin-profile-label">
                Jenis Kelamin
              </p>

              <div className="sid-admin-profile-value">

                <span>
                  {gender}
                </span>

                <VenetianMask size={14} />

              </div>

            </div>


            {/* NIK */}

            <div className="sid-admin-profile-field">

              <p className="sid-admin-profile-label">
                NIK
              </p>

              <div className="sid-admin-profile-value">

                <span>
                  {user?.citizen?.nik ?? '-'}
                </span>

                <CreditCard size={14} />

              </div>

            </div>

          </div>


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

      <FooterDesa />


      {/* ======================================
          MOBILE BOTTOM NAV
      ====================================== */}

      <MobileBottomNav
        links={mobileLinks}
      />

    </div>
  );
}