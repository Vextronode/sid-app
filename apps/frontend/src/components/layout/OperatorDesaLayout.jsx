// ==========================================
// OperatorDesaLayout.jsx
// Layout khusus Operator Desa (Petugas Desa/Kasi/Kaur — 1 role gabungan,
// tampilan sama untuk ketiganya). Sidebar kiri + topbar (search, bell,
// settings, profil), beda dari AdminLayout yang dipakai RT/RW/Kadus/Kades.
// ==========================================

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Bell, Settings, LayoutGrid, FileText, Users, UserCog, Building2, Newspaper, Plus, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import NotificationPopover from '@/features/notifikasi/components/NotificationPopover';
import useNotifications from "@/features/notifikasi/hooks/useNotifications";

const MENU_ITEMS = [
  { label: 'Ringkasan', path: '/admin/operator-desa', icon: LayoutGrid },
  { label: 'Permohonan Surat', path: '/admin/operator-desa/surat', icon: FileText },
  { label: 'Data Penduduk', path: '/admin/data-warga', icon: Users },
  { label: 'Manajemen Pengguna', path: '/admin/manajemen-user', icon: UserCog },
  { label: 'Profil Desa', path: '/admin/kelola-profil-desa', icon: Building2 },
  { label: 'Kelola Berita', path: '/admin/kelola-berita', icon: Newspaper },
];

export function OperatorDesaLayout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [notifOpen, setNotifOpen] = useState(false);
 const { unreadCount } = useNotifications();
  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* ===== SIDEBAR ===== */}
      <aside className="fixed left-0 top-0 h-screen w-56 bg-white  flex flex-col z-40">
        <div className="h-20 px-5 bg-green-600 text-white border-b border-green-700 flex flex-col justify-center">
          <h1 className="font-bold text-lg leading-tight">
            SIDUTama
          </h1>

          <p className="text-xs text-green-100 mt-1">
            Admin Petugas Desa
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-5 flex flex-col gap-1  pt-4">
          <Link to="/admin/operator-desa/surat" className="flex items-center gap-2 bg-green-600 text-white rounded-lg px-3 py-2.5 text-sm font-medium justify-center hover:bg-green-700">
            <Plus size={16} /> Permohonan Baru
          </Link>
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 mt-2">
            <HelpCircle size={16} /> Pusat Bantuan
          </button>
          <button onClick={logout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* ===== MAIN ===== */}
      <div className="flex-1 flex flex-col ml-56">
        {/* Topbar */}
          <div className="fixed left-56 right-0 top-0 h-20 bg-green-600 px-6 flex items-center justify-between shadow-lg z-30">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600"
            />

            <input
              placeholder="Cari data warga..."
              className="
                w-64
                rounded-full
                pl-9 pr-4 py-2
                text-sm
                bg-white
                text-green-700
                placeholder:text-green-500
                border border-white
                outline-none
                focus:ring-2
                focus:ring-green-300
                focus:border-white
              "
            />
          </div>

          <div className="flex items-center gap-4">
            
<button
    onClick={() => setNotifOpen((prev) => !prev)}
    className="relative w-8 h-8 rounded-full flex items-center justify-center text-white hover:text-green-200 hover:bg-green-700/50 transition-colors"
    title="Notifikasi"
  >
    <Bell size={18} />

    {/* Badge Merah di Pojok Kanan Atas */}
    {unreadCount > 0 && (
      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-green-600 pointer-events-none">
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    )}
  </button>
            <button className="text-white hover:text-green-200">
              <Settings size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-white text-xs font-semibold text-gray-800">{user?.name ?? 'Bapak/Ibu'}</p>
                <p className="text-white text-[10px] text-gray-400">{user?.role_label ?? 'Operator Desa'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold">
                {(user?.name ?? 'OP').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          <NotificationPopover open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <main className="flex-1 overflow-y-auto mt-20">
            {children}
        </main>
      </div>
    </div>
  );
}