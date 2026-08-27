// ==========================================
// WargaLayout.jsx
// ==========================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  HelpCircle,
  Settings,
  LogOut,
  UserCircle,
} from 'lucide-react';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import { MobileBottomNav } from './MobileBottomNav';
import { FooterDesa } from './FooterDesa';
import { WARGA_MOBILE_LINKS } from '@/lib/constants/navigation';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover';
import HelpCenterModal from '@/features/warga-help/components/HelpCenterModal';
import useNotifications from '@/features/notifikasi/hooks/useNotifications';

export function WargaLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { unreadCount } = useNotifications();

  const handleLogout = () => {
    setSettingsOpen(false);
    logout?.();
    navigate('/login');
  };

  return (
    <div
      className="min-h-screen relative pb-16 md:pb-0"
      style={{
        background: 'var(--sid-surface-page)',
        color: 'var(--sid-text-primary)',
      }}
    >

      {/* ==========================================
          NAVBAR
          ========================================== */}

      <nav className="sid-navbar sticky top-0 backdrop-blur-sm">

        {/* ==========================================
            PROFILE / GREETING
            ========================================== */}

        <Link
          to="/daftar-surat"
          className="flex items-center gap-2.5 no-underline"
        >

          <div className="sid-navbar-avatar">
            <User size={18} />
          </div>

          <div>

            <p
              className="text-xs font-medium leading-none mb-0.5"
              style={{
                color: 'var(--sid-vendor-accent)',
              }}
            >
              Selamat datang,
            </p>

            <p
              className="text-sm font-bold leading-tight"
              style={{
                color: 'var(--sid-primary)',
              }}
            >
              {user?.name ?? 'Warga Desa'}
            </p>

          </div>

        </Link>


        {/* ==========================================
            NAVBAR ACTIONS
            ========================================== */}

        <div className="sid-navbar-actions">

          {/* ========================================
              NOTIFIKASI
              ======================================== */}

          <button
            onClick={() => setNotifOpen((prev) => !prev)}
            className="sid-navbar-icon-btn"
            title="Notifikasi"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="sid-notification-badge">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>


          {/* ========================================
              PUSAT BANTUAN
              ======================================== */}

          <button
            onClick={() => setHelpOpen(true)}
            className="sid-navbar-icon-btn"
            title="Pusat Bantuan"
          >
            <HelpCircle size={18} />
          </button>


          {/* ========================================
              SETTINGS
              ======================================== */}

          <div className="relative flex items-center justify-center">

            <button
              onClick={() => setSettingsOpen((v) => !v)}
              className="sid-navbar-icon-btn"
              title="Pengaturan"
            >
              <Settings size={18} />
            </button>


            {/* ======================================
                SETTINGS DROPDOWN
                ====================================== */}

            {settingsOpen && (
              <>

                {/* OVERLAY */}

                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSettingsOpen(false)}
                />


                {/* DROPDOWN */}

                <div className="sid-dropdown">

                  {/* PROFIL */}

                  <Link
                    to="/profile"
                    onClick={() => setSettingsOpen(false)}
                    className="sid-dropdown-item"
                  >
                    <UserCircle size={18} />

                    Profil
                  </Link>


                  {/* KELUAR */}

                  <button
                    onClick={handleLogout}
                    className="sid-dropdown-item sid-dropdown-item-danger"
                  >
                    <LogOut size={18} />

                    Keluar
                  </button>

                </div>

              </>
            )}

          </div>

        </div>


        {/* ==========================================
            NOTIFICATION POPOVER
            ========================================== */}

        <NotificationPopover
          open={notifOpen}
          onClose={() => setNotifOpen(false)}
        />

      </nav>


      {/* ==========================================
          CONTENT
          ========================================== */}

      <main className="relative">
        {children}
      </main>


      {/* ==========================================
          FOOTER
          ========================================== */}

      <FooterDesa />


      {/* ==========================================
          MOBILE NAVIGATION
          ========================================== */}

      <MobileBottomNav
        links={WARGA_MOBILE_LINKS}
      />


      {/* ==========================================
          HELP CENTER
          ========================================== */}

      <HelpCenterModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />

    </div>
  );
}