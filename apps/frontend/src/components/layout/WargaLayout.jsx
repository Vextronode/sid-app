// ==========================================
// WargaLayout.jsx
// ==========================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, HelpCircle, Settings, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { MobileBottomNav } from './MobileBottomNav';
import { FooterDesa } from './FooterDesa';
import { WARGA_MOBILE_LINKS } from '@/lib/constants/navigation';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover';
import HelpCenterModal from '@/features/warga-help/components/HelpCenterModal';
import useNotifications from "@/features/notifikasi/hooks/useNotifications";

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
    <div className="min-h-screen bg-blue-50 relative pb-16 md:pb-0">
      <nav className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm py-3 px-6 flex items-center justify-between z-50">
        <Link to="/daftar-surat" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-50 flex items-center justify-center border border-[#185FA5]">
            <User size={18} className="text-[#185FA5]" />
          </div>
          <div>
            <p className="text-xs text-orange-400 font-medium leading-none mb-0.5">Selamat datang,</p>
            <p className="text-sm font-bold text-[#185FA5] leading-tight">{user?.name ?? 'Warga Desa'}</p>
          </div>
        </Link>

        {/* Icon rapat & berwarna hijau senada dengan nama */}
        <div className="flex items-center gap-1">
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

          <button 
            onClick={() => setHelpOpen(true)} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#185FA5] hover:text-blue-800 hover:bg-blue-50 transition-colors" 
            title="Pusat Bantuan"
          >
            <HelpCircle size={18} />
          </button>

          <div className="relative flex items-center justify-center">
            <button 
              onClick={() => setSettingsOpen((v) => !v)} 
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#185FA5] hover:text-blue-800 hover:bg-blue-50 transition-colors" 
              title="Pengaturan"
            >
              <Settings size={18} />
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
        </div>

        <NotificationPopover open={notifOpen} onClose={() => setNotifOpen(false)} />
      </nav>

      <main className="relative">{children}</main>

      <FooterDesa />
      <MobileBottomNav links={WARGA_MOBILE_LINKS} />

      <HelpCenterModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}