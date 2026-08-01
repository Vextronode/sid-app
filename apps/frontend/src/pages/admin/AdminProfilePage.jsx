// ==========================================
// AdminProfilePage.jsx
// Halaman Profil untuk RT/RW, desain SAMA persis dengan ProfilePage
// milik Warga (avatar, badge terverifikasi, edit lewat popup).
// ==========================================

import { useState } from 'react';
import { Pencil, CheckCircle2, User, MapPin, VenetianMask, CreditCard } from 'lucide-react';
import { useAuth } from '@/features/auth/contexts/AuthContext';
import EditProfilWargaModal from '@/features/profil-warga/components/EditProfilWargaModal';

export default function AdminProfilePage() {
  const { user, setUser } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
            <User size={24} className="text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-gray-800">{user?.name ?? 'Pengguna'}</p>
            <p className="text-xs text-gray-400">{user?.email ?? '-'}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-1 rounded-full mb-3">
          <CheckCircle2 size={12} /> NIK TERVERIFIKASI
        </div>
        <button onClick={() => setModalOpen(true)} className="w-full bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-green-700">
          <Pencil size={14} /> Edit
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Full Name</p>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-sm text-gray-700">{user?.name ?? '-'}</span>
            <User size={14} className="text-gray-400" />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">alamat</p>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-sm text-gray-700">{user?.address ?? '-'}</span>
            <MapPin size={14} className="text-gray-400" />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Gender</p>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-sm text-gray-700">{user?.gender === 'P' ? 'Perempuan' : user?.gender === 'L' ? 'Laki-laki' : '-'}</span>
            <VenetianMask size={14} className="text-gray-400" />
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">nik</p>
          <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-gray-50">
            <span className="text-sm text-gray-700">{user?.nik ?? '-'}</span>
            <CreditCard size={14} className="text-gray-400" />
          </div>
        </div>
      </div>

      <EditProfilWargaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(updatedUser) => setUser?.(updatedUser)}
        initialData={user}
      />
    </div>
  );
}