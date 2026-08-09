// ==========================================
// ManajemenUserPage.jsx
// Halaman kelola user & role sesuai desain: card putih besar, search
// bulat, filter status, tombol "Tambah user" hijau, tabel dengan badge
// role & status, kolom Aksi (edit + toggle aktif/nonaktif), pagination
// bulat bergaya "1 2 3 >".
// ==========================================

import { useState } from 'react';
import { Search, SquarePen, Eye, EyeOff, UserPlus, ChevronRight } from 'lucide-react';
import { useUserList } from '@/features/manajemen-user/hooks/useUserList';
import UserFormModal from '@/features/manajemen-user/components/UserFormModal';
import { FooterDesa } from '@/components/layout/FooterDesa';
import { FooterOperator } from '../../components/layout/FooterOperator';

export default function ManajemenUserPage() {
  const { data, loading, setSearch, filterStatus, setFilterStatus, currentPage, setCurrentPage, totalPages, toggleStatus, addUser, updateUser } = useUserList();
  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = mode tambah

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(keyword);
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      wilayah: user.wilayah,
      is_active: user.is_active ,
    });
    setModalOpen(true);
  };

  const handleSubmitForm = (formData) => {
    if (editingUser) {
      updateUser(editingUser.id, formData);
    } else {
      addUser(formData);
    }
    setModalOpen(false);
  };

  return (
    <div>
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500 mb-6">Kelola data administrator dan hak akses wilayah Cibenda.</p>

          <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Cari nama atau email..."
                className="w-full border text-gray-400 rounded-full pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded-full px-4 py-2.5 text-sm text-gray-400 outline-none focus:border-green-500"
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 bg-green-600 text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-green-700 shrink-0"
            >
              <UserPlus size={16} /> Tambah user
            </button>
          </form>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-400 text-xs">
                <th className="py-3 font-medium text- text-gray-500">Nama</th>
                <th className="py-3 font-medium text-center text-gray-500">Email</th>
                <th className="py-3 font-medium text-center text-gray-500">Jabatan</th>
                <th className="py-3 font-medium text-center text-gray-500">Wilayah</th>
                <th className="py-3 font-medium text-center text-gray-500">Status</th>
                <th className="py-3 font-medium text-center text-gray-500">Aksi</th>
              </tr>
            </thead>
              <tbody>
              {loading ? (
  <tr>
    <td colSpan={5} className="text-center py-8">
      Memuat data...
    </td>
  </tr>
) : data.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-8">Belum ada data warga.</td></tr>
              ) : (
                data.map((user) => (
                  <tr key={user.id} className="border-b last:border-0 text-gray-400">
                    <td className="py-4 font-semibold text-gray-400 text-">{user.name}</td>
                    <td className="py-4 text-gray-400 text-center">{user.email}</td>
                    <td className="py-4 text-center">
                      <span className="border rounded-full px-3 py-1 text-xs text-gray-400 uppercase">{user.role}</span>
                    </td>
                    <td className="py-4 text-gray-400 text-center">RT {user.citizen?.rt?.number ?? '-'}
/
RW {user.citizen?.rw?.number ?? '-'}</td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {user.is_active  ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="w-9 h-9 border border-amber-200 bg-amber-50 rounded-lg border flex items-center justify-center hover:bg-amber-100 text-amber-600"
                          title="Edit"
                        >
                          <SquarePen size={16} />
                        </button>
                        <button
                          onClick={() => toggleStatus(user.id)}
                          className="w-9 h-9 rounded-lg border flex items-center justify-center hover:bg-blue-100 text-gray-600"
                          title={user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {user.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-full text-sm font-medium border ${
                  page === currentPage ? 'bg-green-700 text-white border-green-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            {totalPages > 1 && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-9 h-9 rounded-full text-sm border text-gray-600 flex items-center justify-center hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <FooterOperator />

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitForm}
        initialData={editingUser}
      />
    </div>
  );
}