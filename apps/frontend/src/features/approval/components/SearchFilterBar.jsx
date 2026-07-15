// ==========================================
// SearchFilterBar.jsx
// Baris pencarian + filter jenis surat & status, hanya muncul di tab "semua".
// ==========================================

import { useState } from 'react';

export default function SearchFilterBar({ onSearch, onFilterJenis, onFilterStatus }) {
  // State lokal untuk input search, baru dikirim ke parent saat tombol cari ditekan
  const [keyword, setKeyword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(keyword);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 mb-4">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="Cari..."
        className="flex-1 border rounded-md px-3 py-2 text-sm outline-none focus:border-green-500"
      />
      <button type="submit" className="bg-green-600 text-white px-4 rounded-md">
        🔍
      </button>

      {/* Dropdown filter jenis surat */}
      <select
        onChange={(e) => onFilterJenis(e.target.value)}
        className="border border-green-500 text-green-600 rounded-md px-3 text-sm"
      >
        <option value="">Semua Jenis</option>
        <option value="SKD">SKD</option>
      </select>

      {/* Dropdown filter status, sesuai status yang terdaftar di statusConfig.js */}
      <select
        onChange={(e) => onFilterStatus(e.target.value)}
        className="border border-green-500 text-green-600 rounded-md px-3 text-sm"
      >
        <option value="">Semua Status</option>
        <option value="pending">Pending</option>
        <option value="rt_approved">RT Approved</option>
        <option value="rt_rejected">RT Rejected</option>
        <option value="rw_review">RW Review</option>
        <option value="rw_approved">RW Approved</option>
        <option value="rw_rejected">RW Rejected</option>
      </select>
    </form>
  );
}