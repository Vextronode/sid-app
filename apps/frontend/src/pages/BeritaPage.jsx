import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { DUMMY_NEWS } from "@/lib/constants/dummyNews";
import { NewsRowCard } from "@/features/berita/components/NewsRowCard";

export function BeritaPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [currentPage, setCurrentPage] = useState(1);

  // Ambil list unik kategori dari DUMMY_NEWS untuk opsi dropdown
  const categories = [
    "Semua Kategori",
    ...new Set(DUMMY_NEWS.map((item) => item.category)),
  ];

  // Logika Filter & Search
  const filteredNews = DUMMY_NEWS.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Semua Kategori" ||
      item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Judul Halaman */}
        <h1 className="text-xl font-bold text-gray-800 px-1">
          Berita & Pengumuman
        </h1>

        {/* Bar Pencarian & Filter Kategori */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch">
          {/* Input Search */}
          <div className="flex grow bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm focus-within:border-gray-300 transition">
            <input
              type="text"
              placeholder="Cari Berita..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 outline-none"
            />
            <button className="bg-[#4CAF4F] hover:bg-[#439E46] text-white px-4 flex items-center justify-center transition">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Dropdown Kategori */}
          <div className="relative min-w-40 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center overflow-hidden">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-4 pr-10 py-2.5 text-sm text-gray-600 font-medium bg-transparent outline-none appearance-none cursor-pointer"
            >
              {categories.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#4CAF4F] absolute right-3 pointer-events-none" />
          </div>
        </div>

        {/* List Berita */}
        <div className="space-y-4">
          {filteredNews.length > 0 ? (
            filteredNews.map((news) => (
              <NewsRowCard key={news.id} data={news} />
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-gray-400 text-sm">
              Tidak ada berita yang cocok dengan pencarian Anda.
            </div>
          )}
        </div>

        {/* Pagniation */}
        {filteredNews.length > 0 && (
          <div className="flex justify-end gap-2 pt-6">
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold border transition ${
                  currentPage === page
                    ? "bg-[#4CAF4F] border-[#4CAF4F] text-white"
                    : "bg-white border-gray-200 text-[#4CAF4F] hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
