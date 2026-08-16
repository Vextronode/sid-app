// ==========================================
// AdminLayout.jsx
// Untuk role RT & RW: tambah dropdown Settings (Profil + Keluar),
// menggantikan avatar polos. Kadus/Kades tetap versi lama (avatar
// polos tanpa dropdown), karena belum diminta.
// ==========================================

import { useState } from 'react';
import { Bell, User, Settings, LogOut, UserCircle } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover-Admin';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import useNotifications from "@/features/notifikasi/hooks/useNotifications";

export function AdminLayout({ children, menuItems }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  // Dropdown Settings (Profil + Keluar) cuma muncul untuk RT & RW
  const showSettingsMenu = ['rt', 'rw', 'kadus'].includes(user?.role);

  const handleLogout = () => {
    setSettingsOpen(false);
    logout?.();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <nav className="bg-white shadow-sm px-6 h-16 flex items-center justify-between relative">
        <Link to="/" className="font-bold text-lg text-gray-800">
          SIDUTama
        </Link>

        {menuItems ? (
          <div className="flex items-center gap-8">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm ${isActive ? 'text-[#185FA5] font-medium' : 'text-gray-600 hover:text-blue-600'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center h-full">
        <button
          onClick={() => setNotifOpen((prev) => !prev)}
          className="relative w-8 h-8 rounded-full flex items-center justify-center text-[#185FA5] hover:text-blue-800 hover:bg-blue-50 transition-colors"
          title="Notifikasi"
        >
          <Bell size={18} />

          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white pointer-events-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

          {showSettingsMenu ? (
            <div className="relative h-full flex items-center">
              <button
                onClick={() => setSettingsOpen((v) => !v)}
                className="w-9 h-9 flex items-center justify-center text-[#185FA5] hover:text-blue-700"
                title="Pengaturan"
              >
                <Settings size={20} />
              </button>

            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <div className="absolute right-0 top-10 bg-white shadow-xl rounded-xl border border-blue-100 z-50 w-48 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                  <Link
                    to="/profile"
                    onClick={() => setSettingsOpen(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-[#185FA5] hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <UserCircle size={18} className="text-[#185FA5]" /> Profil
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={18} className="text-red-500" /> Keluar
                  </button>
                </div>
              </>
            )}
            </div>
          ) : (
            <div className="w-9 h-9 rounded-full border-2 border-[#185FA5] flex items-center justify-center text-[#185FA5]">
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