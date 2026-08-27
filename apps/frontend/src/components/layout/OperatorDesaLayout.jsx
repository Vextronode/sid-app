 // ==========================================
// OperatorDesaLayout.jsx
// Layout khusus Operator Desa
// Styling menggunakan Global CSS SID.
// Logic/auth/routing tidak diubah.
// ==========================================

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  LayoutGrid,
  FileText,
  Users,
  UserCog,
  Building2,
  Newspaper,
  HelpCircle,
  LogOut,
} from 'lucide-react';

import { useAuth } from '@/features/auth/contexts/AuthContext';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin';
import useNotifications from '@/features/notifikasi/hooks/useNotifications';

const MENU_ITEMS = [
  {
    label: 'Ringkasan',
    path: '/admin/operator-desa',
    icon: LayoutGrid,
  },
  {
    label: 'Permohonan Surat',
    path: '/admin/operator-desa/surat',
    icon: FileText,
  },
  {
    label: 'Data Penduduk',
    path: '/admin/data-warga',
    icon: Users,
  },
  {
    label: 'Manajemen Pengguna',
    path: '/admin/manajemen-user',
    icon: UserCog,
  },
  {
    label: 'Profil Desa',
    path: '/admin/kelola-profil-desa',
    icon: Building2,
  },
  {
    label: 'Kelola Berita',
    path: '/admin/kelola-berita',
    icon: Newspaper,
  },
];

export function OperatorDesaLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const [notifOpen, setNotifOpen] = useState(false);

  const { unreadCount } = useNotifications();

  return (
    <div className="sid-operator-layout">

      {/* =================================================
          SIDEBAR
          ================================================= */}

      <aside className="sid-operator-sidebar">

        {/* BRAND */}

        <div className="sid-operator-sidebar-brand">

          <h1>SIDUTama</h1>

          <p>
            Admin Petugas Desa
          </p>

        </div>


        {/* MENU */}

        <nav className="sid-operator-sidebar-nav">

          {MENU_ITEMS.map((item) => {

            const isActive =
              location.pathname === item.path;

            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sid-operator-menu-item ${
                  isActive
                    ? 'active'
                    : ''
                }`}
              >

                <Icon size={18} />

                <span>
                  {item.label}
                </span>

              </Link>
            );
          })}

        </nav>


        {/* SIDEBAR FOOTER */}

        <div className="sid-operator-sidebar-footer">

          <button
            type="button"
            className="sid-operator-sidebar-action"
          >
            <HelpCircle size={16} />
            <span>Pusat Bantuan</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="sid-operator-sidebar-action logout"
          >
            <LogOut size={16} />
            <span>Keluar</span>
          </button>

        </div>

      </aside>


      {/* =================================================
          MAIN AREA
          ================================================= */}

      <div className="sid-operator-main">

        {/* =================================================
            TOPBAR
            ================================================= */}

        <header className="sid-operator-topbar">

          <div className="sid-operator-topbar-spacer" />


          {/* TOPBAR RIGHT */}

          <div className="sid-operator-topbar-right">

            {/* NOTIFICATION */}

            <button
              type="button"
              onClick={() =>
                setNotifOpen((prev) => !prev)
              }
              className="sid-operator-notification-btn"
              title="Notifikasi"
            >

              <Bell size={18} />

              {unreadCount > 0 && (
                <span className="sid-operator-notification-badge">
                  {unreadCount > 99
                    ? '99+'
                    : unreadCount}
                </span>
              )}

            </button>


            {/* PROFILE */}

            <div className="sid-operator-profile">

              <div className="sid-operator-profile-info">

                <p className="sid-operator-profile-name">
                  {user?.name ?? 'Bapak/Ibu'}
                </p>

                <p className="sid-operator-profile-role">
                  {user?.role_label ?? 'Operator Desa'}
                </p>

              </div>


              <div className="sid-operator-profile-avatar">

                {(user?.name ?? 'OP')
                  .slice(0, 2)
                  .toUpperCase()}

              </div>

            </div>

          </div>


          {/* NOTIFICATION POPOVER */}

          <NotificationPopover
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
          />

        </header>


        {/* =================================================
            PAGE CONTENT
            ================================================= */}

        <main className="sid-operator-main-content">
          {children}
        </main>

      </div>

    </div>
  );
}