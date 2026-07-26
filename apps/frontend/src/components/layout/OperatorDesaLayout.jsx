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

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* ===== SIDEBAR ===== */}
      <aside className="w-56 bg-white border-r flex flex-col shrink-0">
        <div className="px-5 py-6 border-b">
          <h1 className="font-bold text-gray-800 leading-tight text-lg">
            Admin Petugas Desa
          </h1>
          <p className="text-[11px] text-gray-400 mt-1">Cibenda Nature System</p>
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

        <div className="px-3 pb-5 flex flex-col gap-1 border-t pt-4">
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-b relative">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏘️</span>
            <span className="font-bold text-gray-800">Cibenda Admin</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Cari data warga..."
                className="border rounded-full pl-9 pr-4 py-2 text-sm w-64 outline-none focus:border-green-500 bg-white"
              />
            </div>
            <button onClick={() => setNotifOpen((v) => !v)} className="text-gray-500 hover:text-gray-700">
              <Bell size={18} />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <Settings size={18} />
            </button>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-800">{user?.name ?? 'Bapak/Ibu'}</p>
                <p className="text-[10px] text-gray-400">{user?.role_label ?? 'Operator Desa'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-semibold">
                {(user?.name ?? 'OP').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>

          <NotificationPopover open={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}