// ==========================================
// BeritaPage.jsx
// Halaman publik Berita, tampilan SAMA persis dengan KelolaBeritaPage
// (Operator Desa), tapi TANPA tombol edit/tambah. Data narik dari
// sumber yang SAMA (dummyBerita), jadi update dari Operator otomatis
// muncul juga di sini.
// ==========================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { dummyBerita } from '@/features/kelola-berita/data/dummyBerita';

const ITEMS_PER_PAGE = 6;

export function BeritaPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const beritaUtama = dummyBerita.find((b) => b.utama) ?? dummyBerita[0];
  const beritaTerbaru = dummyBerita.filter((b) => b.id !== beritaUtama?.id).slice(0, 3);
  const kelolaList = dummyBerita.filter((b) => b.id !== beritaUtama?.id && b.status === 'publikasi');

  const totalPages = Math.max(1, Math.ceil(kelolaList.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = kelolaList.slice(start, start + ITEMS_PER_PAGE);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <div className="md:col-span-2 rounded-2xl overflow-hidden shadow-sm bg-white">
          <div className="relative h-64 bg-gray-800">
            {beritaUtama?.gambar ? (
              <img src={beritaUtama.gambar} alt={beritaUtama.judul} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center">
                <Newspaper size={48} className="text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/30" />
            <div className="relative p-6 flex flex-col justify-end h-full text-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-white/90 text-gray-800 text-[10px] font-semibold px-3 py-1 rounded-full uppercase">{beritaUtama?.kategori}</span>
                <span className="text-xs text-white/80">{beritaUtama?.tanggal}</span>
              </div>
              <h2 className="text-2xl font-bold leading-snug">{beritaUtama?.judul}</h2>
            </div>
          </div>
          <div className="p-5">
            <button onClick={() => navigate(`/berita/${beritaUtama?.id}`)} className="text-green-600 text-sm font-medium hover:underline">
              Baca Selengkapnya
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-800 border-l-4 border-green-600 pl-3 mb-4">Terbaru</h3>
          <div className="flex flex-col gap-4">
            {beritaTerbaru.map((b) => (
              <button key={b.id} onClick={() => navigate(`/berita/${b.id}`)} className="flex gap-3 text-left">
                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {b.gambar ? <img src={b.gambar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-green-100" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-green-600 font-semibold uppercase">{b.kategori}</p>
                  <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{b.judul}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{b.tanggal}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Semua Berita</h2>
          <p className="text-sm text-gray-500">Kabar dan pengumuman terbaru dari Desa Cibenda</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="w-8 h-8 rounded-full border flex items-center justify-center text-gray-500 disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {paginated.length === 0 ? (
          <p className="col-span-3 text-center text-gray-400 py-10">Belum ada berita.</p>
        ) : (
          paginated.map((b) => (
            <button key={b.id} onClick={() => navigate(`/berita/${b.id}`)} className="bg-white rounded-2xl shadow-sm overflow-hidden text-left hover:shadow-md transition">
              <div className="relative h-40 bg-gray-100">
                {b.gambar ? (
                  <img src={b.gambar} alt={b.judul} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
                    <Newspaper size={28} className="text-green-400" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-50 text-green-700 text-[10px] font-semibold px-2 py-1 rounded uppercase">{b.kategori}</span>
                  <span className="text-[10px] text-gray-400">{b.tanggal}</span>
                </div>
                <h3 className="font-semibold text-gray-800 leading-snug mb-1">{b.judul}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{b.ringkasan}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}