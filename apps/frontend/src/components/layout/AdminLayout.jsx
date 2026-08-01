// ==========================================
// AdminLayout.jsx
// Untuk role RT & RW: tambah dropdown Settings (Profil + Keluar),
// menggantikan avatar polos. Kadus/Kades tetap versi lama (avatar
// polos tanpa dropdown), karena belum diminta.
// ==========================================

import { useState } from 'react';
import { Bell, User, Settings, LogOut, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover';
import { useAuth } from '@/features/auth/contexts/AuthContext';

export function AdminLayout({ children, menuItems }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Dropdown Settings (Profil + Keluar) cuma muncul untuk RT & RW
  const showSettingsMenu = ['rt', 'rw'].includes(user?.role);

  const handleLogout = () => {
    setSettingsOpen(false);
    logout?.();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <nav className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg text-gray-800">
          LOGO
        </Link>

        {menuItems ? (
          <div className="flex items-center gap-8">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm ${isActive ? 'text-green-600 font-medium' : 'text-gray-600 hover:text-green-600'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-4">
          <button onClick={() => setNotifOpen((v) => !v)} className="text-green-600 hover:text-green-700">
            <Bell size={20} />
          </button>

          {showSettingsMenu ? (
            <div className="relative">
              <button onClick={() => setSettingsOpen((v) => !v)} className="text-green-600 hover:text-green-700" title="Pengaturan">
                <Settings size={20} />
              </button>

              {settingsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                  <div className="absolute right-0 top-8 bg-white shadow-lg rounded-xl border z-50 w-44 py-1">
                    <Link
                      to="/admin/profile"
                      onClick={() => setSettingsOpen(false)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <UserCircle size={16} /> Profil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full border-2 border-green-500 flex items-center justify-center text-green-600">
              <User size={18} />
            </div>
          )}
        </div>
      </nav>

      <NotificationPopover open={notifOpen} onClose={() => setNotifOpen(false)} />

      <main>{children}</main>
    </div>
  );
}