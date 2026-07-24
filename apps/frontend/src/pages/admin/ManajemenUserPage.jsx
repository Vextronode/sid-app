/* eslint-disable no-unused-vars */
// ==========================================
// ManajemenUserPage.jsx
// Halaman kelola user & role admin: search, filter status, tabel,
// pagination, aksi reset (kirim ulang undangan) & nonaktifkan user.
// ==========================================

import { useState } from 'react';
import { Search, Send, Ban, Plus } from 'lucide-react';
import { useUserList } from '@/features/manajemen-user/hooks/useUserList';
import TambahUserModal from '@/features/manajemen-user/components/TambahUserModal';

export default function ManajemenUserPage() {
  const { data, setSearch, filterStatus, setFilterStatus, currentPage, setCurrentPage, totalPages, toggleStatus, addUser } = useUserList();
  const [keyword, setKeyword] = useState('');
    const [modalOpen, setModalOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(keyword);
  };

  const handleAddUser = (formData) => {
     addUser(formData);
     setModalOpen(false);
   };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h2 className="font-medium text-gray-800 text-lg mb-4">Manajemen user & role</h2>

      <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Cari nama atau email..."
          className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
        />
        <button type="submit" className="bg-green-600 text-white px-4 rounded-md flex items-center justify-center">
          <Search size={16} />
        </button>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-green-500 text-green-600 rounded-md px-3 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
        </select>
        <button
           type="button"
           onClick={() => setModalOpen(true)}
           className="border border-green-500 text-green-600 rounded-md px-4 text-sm flex items-center gap-1"
         >
          <Plus size={14} /> Tambah user
        </button>
      </form>

      <table className="w-full text-sm bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-3 px-4 font-medium">Nama</th>
            <th className="py-3 px-4 font-medium">Email</th>
            <th className="py-3 px-4 font-medium">Role</th>
            <th className="py-3 px-4 font-medium">Wilayah</th>
            <th className="py-3 px-4 font-medium">Status</th>
            <th className="py-3 px-4 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-8">Belum ada user.</td>
            </tr>
          ) : (
            data.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">{user.nama}</td>
                <td className="py-3 px-4">{user.email}</td>
                <td className="py-3 px-4">
                  <span className="border rounded-md px-3 py-1 text-xs text-gray-600">{user.role}</span>
                </td>
                <td className="py-3 px-4">{user.wilayah}</td>
                <td className="py-3 px-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {user.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-2">
                    <button className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600" title="Kirim ulang undangan">
                      <Send size={16} />
                    </button>
                    <button
                      onClick={() => toggleStatus(user.id)}
                      className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 text-gray-600"
                      title={user.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      <Ban size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex justify-end mt-4">
        <div className="flex gap-2">
          {pages.map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-9 h-9 rounded-md border text-sm font-medium ${
                page === currentPage ? 'bg-green-600 border-green-600 text-white' : 'border-green-500 text-green-600 hover:bg-green-50'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      </div>
      <TambahUserModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleAddUser} />
    </div>
  );
}