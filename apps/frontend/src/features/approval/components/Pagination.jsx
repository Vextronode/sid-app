// ==========================================
// Pagination.jsx
// Tombol navigasi nomor halaman (1 2 3) di bawah tabel surat.
// ==========================================

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  // Bangun array [1, 2, ..., totalPages] untuk dirender jadi tombol
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex gap-2">
      {pages.map((page) => {
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-md border text-sm font-medium transition-colors ${
              isActive
                ? 'bg-green-600 border-green-600 text-white'
                : 'border-green-500 text-green-600 hover:bg-green-50'
            }`}
          >
            {page}
          </button>
        );
      })}
    </div>
  );
}