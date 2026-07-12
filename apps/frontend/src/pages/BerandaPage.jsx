import { Link } from "react-router-dom";
import { NewsCard } from "@/components/ui/NewsCard";
import { DUMMY_NEWS } from "@/lib/constants/dummyNews";
import { FileText, Search, ChevronDown, LayoutGrid, Send } from "lucide-react";

export function BerandaPage() {
  return (
    <div className="w-full min-h-screen bg-[#D9D9D9] pb-24 md:pb-0">
      {/* desktop hero */}
      <div className="hidden md:flex flex-col items-center justify-center text-center py-20 px-4 bg-[#F5F7FA]">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Selamat Datang di Desa
          <br />
          Cibenda
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Layanan administrasi desa secara digital - cepat, muda dan terpercaya
        </p>
        <div className="flex gap-4">
          <Link
            to="/ajukan-surat"
            className="bg-[#4CAF4F] hover:bg-[#3d8c40] text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 transition"
          >
            <FileText className="w-5 h-5" />
            Ajukan Surat
          </Link>
          <Link
            to="/info-layanan"
            className="border border-[#4CAF4F] text-[#4CAF4F] hover:bg-[#4CAF4F]/10 px-6 py-2 rounded-md font-medium transition"
          >
            Info Layanan
          </Link>
        </div>
      </div>

      {/* mobile hero */}
      <div className="sticky top-0 z-50 bg-[#4CAF4F] px-4 pt-6 pb-6 shadow-md block md:hidden">
        <div className="flex gap-2">
          <div className="flex grow bg-white rounded-md overflow-hidden">
            <input
              type="text"
              placeholder="Cari Berita..."
              className="w-full px-3 py-2 text-sm outline-none text-gray-700"
            />
            <button className="px-3 bg-white border-l border-gray-200">
              <Search className="w-5 h-5 text-[#4CAF4F]" />
            </button>
          </div>
          <button className="bg-white px-3 py-2 rounded-md shrink-0">
            <ChevronDown className="w-5 h-5 text-[#4CAF4F]" />
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <div className="px-4 mt-4 mb-6 block md:hidden">
        <div className="bg-white rounded-4xl shadow-sm w-full py-6 px-4 flex justify-center gap-10 items-center">
          <Link
            to="/dashboard"
            className="flex flex-col items-center gap-3 hover:opacity-80 transition"
          >
            <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] rounded-2xl p-4 border border-gray-50">
              <LayoutGrid className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-medium text-gray-800">
              Dashboard
            </span>
          </Link>

          <Link
            to="/ajukan-surat"
            className="flex flex-col items-center gap-3 hover:opacity-80 transition"
          >
            <div className="bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)] rounded-2xl p-4 border border-gray-50">
              <Send className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
            </div>
            <span className="text-[11px] font-medium text-gray-800">
              ajukan Surat
            </span>
          </Link>
        </div>
      </div>

      {/* berita */}
      <div className="w-full md:bg-white md:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="hidden md:block text-lg font-bold text-gray-800 mb-6">
            Berita Terbaru
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
            {DUMMY_NEWS.map((news) => (
              <NewsCard key={news.id} data={news} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
