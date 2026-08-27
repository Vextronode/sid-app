// ==========================================
// ManajemenUserPage.jsx
// Halaman kelola user & role.
// Layout disamakan dengan OperatorSuratListPage.
// Logic/API tidak diubah.
// ==========================================

import { useState } from 'react';
import {
  Search,
  SquarePen,
  Eye,
  EyeOff,
  UserPlus,
  ChevronRight,
} from 'lucide-react';

import { useUserList } from '@/features/manajemen-user/hooks/useUserList';
import UserFormModal from '@/features/manajemen-user/components/UserFormModal';
import { FooterOperator } from '../../components/layout/FooterOperator';

export default function ManajemenUserPage() {
  const {
    data,
    loading,
    setSearch,
    filterStatus,
    setFilterStatus,
    currentPage,
    setCurrentPage,
    totalPages,
    toggleStatus,
    addUser,
    updateUser,
  } = useUserList();

  const [keyword, setKeyword] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

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
      is_active: user.is_active,
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
    <div className="sid-operator-page">

      <div className="sid-operator-content">

        {/* Breadcrumb */}
        <p className="sid-operator-breadcrumb">
          Admin / <span>Manajemen Pengguna</span>
        </p>

        {/* Header */}
        <div className="sid-operator-header">
          <h1>Manajemen Pengguna</h1>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="sid-operator-primary"
          >
            <UserPlus size={16} />
            Tambah User
          </button>
        </div>

        {/* Search & Filter */}
        <div className="sid-operator-filter-card">

          <form
            onSubmit={handleSearchSubmit}
            className="sid-operator-filter-grid user-filter"
          >

            {/* Search */}
            <div className="sid-operator-filter-field">

              <p>Pencarian Cepat</p>

              <div className="sid-operator-search">

                <Search size={16} />

                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Cari nama atau email..."
                />

              </div>

            </div>

            {/* Status */}
            <div className="sid-operator-filter-field">

              <p>Status</p>

              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>

            </div>

          </form>

        </div>

        {/* Table */}
        <div className="sid-operator-table-card">

          <div className="sid-operator-table-wrapper">

            <table className="sid-operator-table">

              <thead>
                <tr>
                  <th>Nama</th>
                  <th className="center">Email</th>
                  <th className="center">Jabatan</th>
                  <th className="center">Wilayah</th>
                  <th className="center">Status</th>
                  <th className="center">Aksi</th>
                </tr>
              </thead>

              <tbody>

                {loading ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Memuat data...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      Belum ada data pengguna.
                    </td>
                  </tr>
                ) : (
                  data.map((user) => (
                    <tr key={user.id}>

                      {/* Nama */}
                      <td className="primary-text">
                        {user.name}
                      </td>

                      {/* Email */}
                      <td className="center">
                        {user.email}
                      </td>

                      {/* Jabatan */}
                      <td className="center">
                        <span className="sid-operator-role">
                          {user.role}
                        </span>
                      </td>

                      {/* Wilayah */}
                      <td className="center">
                        RT {user.citizen?.rt?.number ?? '-'}
                        {' / '}
                        RW {user.citizen?.rw?.number ?? '-'}
                      </td>

                      {/* Status */}
                      <td className="center">
                        <span
                          className={`sid-operator-status ${
                            user.is_active
                              ? 'active'
                              : 'inactive'
                          }`}
                        >
                          {user.is_active
                            ? 'Aktif'
                            : 'Nonaktif'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="center">

                        <div className="sid-operator-actions">

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="sid-operator-action edit"
                            title="Edit"
                          >
                            <SquarePen size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleStatus(user.id)}
                            className="sid-operator-action toggle"
                            title={
                              user.is_active
                                ? 'Nonaktifkan'
                                : 'Aktifkan'
                            }
                          >
                            {user.is_active ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>

                        </div>

                      </td>

                    </tr>
                  ))
                )}

              </tbody>

            </table>

          </div>

          {/* Pagination */}
          <div className="sid-operator-pagination">

            <p>
              Menampilkan{' '}
              {data.length === 0 ? 0 : data.length}{' '}
              dari {data.length} data
            </p>

            <div>

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
              >
                Sebelumnya
              </button>

              {Array.from(
                { length: totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <button
                  type="button"
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={
                    page === currentPage
                      ? 'active'
                      : ''
                  }
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </button>

            </div>

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