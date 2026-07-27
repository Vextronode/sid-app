/* eslint-disable no-unused-vars */
// ==========================================
// WargaLayout.jsx
// Layout untuk Warga setelah login. Navbar atas (sama gaya AdminLayout,
// bukan sidebar), bell buka NotificationPopover, bottom nav mobile
// 3 menu (Beranda/Surat/Profil).
// ==========================================

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import { MobileBottomNav } from './MobileBottomNav';
import { FooterDesa } from './FooterDesa';
import { WARGA_MOBILE_LINKS } from '@/lib/constants/navigation';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover';

export function WargaLayout({ children }) {
  const { user, logout } = useAuth(); // ⚠️ sesuaikan nama fungsi kalau beda di AuthContext
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

const handleLogout = () => {
     logout?.();
     navigate('/login');
};

  return (
    <div className="min-h-screen bg-gray-50 relative pb-16 md:pb-0">
      <nav className="bg-white border-b px-4 md:px-6 py-3 flex items-center justify-between relative">
        <Link to="/daftar-surat" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            <User size={16} className="text-gray-400" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 leading-none">Digital Amanah</p>
            <p className="text-sm font-bold text-green-700 leading-tight">{user?.name ?? 'Warga Desa'}</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
           <button onClick={() => setNotifOpen((v) => !v)} className="text-gray-500 hover:text-gray-700">
            <Bell size={20} />
           </button>
           <button onClick={handleLogout} className="text-red-500 hover:text-red-600" title="Keluar">
             <LogOut size={20} />
           </button>
         </div>

        <NotificationPopover open={notifOpen} onClose={() => setNotifOpen(false)} />
      </nav>

      <main>{children}</main>

         <FooterDesa />
      <MobileBottomNav links={WARGA_MOBILE_LINKS} />
    </div>
  );
}