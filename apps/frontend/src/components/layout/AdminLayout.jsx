// ==========================================
// AdminLayout.jsx
// Layout untuk role RT, RW, dan Kadus.
// Menggunakan SID Global Theme.
// ==========================================

import { useState } from 'react';
import {
  Bell,
  User,
  Settings,
  LogOut,
  UserCircle,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import useNotifications from '@/features/notifikasi/hooks/useNotifications';

export function AdminLayout({ children, menuItems }) {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();

  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Settings digunakan untuk RT, RW, dan Kadus
  const showSettingsMenu = ['rt', 'rw', 'kadus'].includes(user?.role);

  const handleLogout = () => {
    setSettingsOpen(false);
    logout?.();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[var(--sid-surface-page)] relative">

      {/* ==========================================
          NAVBAR
          ========================================== */}

      <nav className="sid-navbar">

        {/* BRAND */}

        <Link
          to="/"
          className="sid-navbar-brand"
        >
          SIDUTama
        </Link>


        {/* ==========================================
            MENU
            ========================================== */}

        {menuItems ? (
          <div className="sid-navbar-menu">

            {menuItems.map((item) => {

              const isActive =
                location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    isActive
                      ? 'sid-navbar-link sid-navbar-link-active'
                      : 'sid-navbar-link'
                  }
                >
                  {item.label}
                </Link>
              );
            })}

          </div>
        ) : (
          <span />
        )}


        {/* ==========================================
            ACTIONS
            ========================================== */}

        <div className="sid-navbar-actions">

          {/* NOTIFIKASI */}

          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            className="sid-navbar-icon-btn"
            title="Notifikasi"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="sid-notification-badge">
                {unreadCount > 99
                  ? '99+'
                  : unreadCount}
              </span>
            )}
          </button>


          {/* ========================================
              SETTINGS
              ======================================== */}

          {showSettingsMenu ? (

            <div className="relative h-full flex items-center">

              <button
                type="button"
                onClick={() =>
                  setSettingsOpen((v) => !v)
                }
                className="sid-navbar-icon-btn"
                title="Pengaturan"
              >
                <Settings size={19} />
              </button>


              {settingsOpen && (
                <>
                  {/* Overlay */}

                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSettingsOpen(false)}
                  />


                  {/* Dropdown */}

                  <div className="sid-dropdown">

                    <Link
                      to="/admin/profile"
                      onClick={() =>
                        setSettingsOpen(false)
                      }
                      className="sid-dropdown-item"
                    >
                      <UserCircle size={18} />
                      <span>Profil</span>
                    </Link>


                    <button
                      type="button"
                      onClick={handleLogout}
                      className="
                        sid-dropdown-item
                        sid-dropdown-item-danger
                      "
                    >
                      <LogOut size={18} />
                      <span>Keluar</span>
                    </button>

                  </div>
                </>
              )}

            </div>

          ) : (

            /* ========================================
               AVATAR UNTUK ROLE LAIN
               ======================================== */

            <div className="sid-navbar-avatar">
              <User size={18} />
            </div>

          )}

        </div>

      </nav>


      {/* ==========================================
          NOTIFICATION POPOVER
          ========================================== */}

      <NotificationPopover
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
      />


      {/* ==========================================
          CONTENT
          ========================================== */}

      <main>
        {children}
      </main>

    </div>
  );
}