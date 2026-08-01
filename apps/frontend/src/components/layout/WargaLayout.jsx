// ==========================================
// WargaLayout.jsx
// Navbar sekarang: Bell (notifikasi), Pusat Bantuan (popup info), dan
// Settings (dropdown berisi Profil + Keluar). Tombol Keluar dipindah
// ke dalam dropdown Settings, tidak lagi tampil langsung di navbar.
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

export function WargaLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = () => {
    setSettingsOpen(false);
    logout?.();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 relative pb-16 md:pb-0">
      <nav className="bg-white shadow-sm py-4 px-6 flex items-center justify-between relative">
        <Link to="/daftar-surat" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            <User size={16} className="text-gray-400" />
          </div>
          <div>
            
            <p className="text-sm font-bold text-green-700 leading-tight">{user?.name ?? 'Warga Desa'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <button onClick={() => setNotifOpen((v) => !v)} className="text-gray-500 hover:text-gray-700" title="Notifikasi">
            <Bell size={20} />
          </button>

          <button onClick={() => setHelpOpen(true)} className="text-gray-500 hover:text-gray-700" title="Pusat Bantuan">
            <HelpCircle size={20} />
          </button>

          <div className="relative">
            <button onClick={() => setSettingsOpen((v) => !v)} className="text-gray-500 hover:text-gray-700" title="Pengaturan">
              <Settings size={20} />
            </button>

            {settingsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSettingsOpen(false)} />
                <div className="absolute right-0 top-8 bg-white shadow-lg rounded-xl border z-50 w-44 py-1">
                  <Link
                    to="/profile"
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
        </div>

        <NotificationPopover open={notifOpen} onClose={() => setNotifOpen(false)} />
      </nav>

      <main>{children}</main>

      <FooterDesa />
      <MobileBottomNav links={WARGA_MOBILE_LINKS} />

      <HelpCenterModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}