import { useAuth } from "@/features/auth/contexts/AuthContext";
import { SuratCard } from "@/features/surat/components/SuratCard";
import { FooterDesa } from "@/components/layout/FooterDesa";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { LIST_SURAT_GLOBAL } from "@/lib/constants/suratList";

export function InfoSuratPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-10 grow space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-gray-800">
            Jenis Surat Tersedia
          </h1>
          <p className="text-xs text-gray-400">
            {user
              ? "Silakan pilih jenis surat yang ingin diajukan"
              : "Login untuk mengajukan permohonan surat secara digital"}
          </p>
        </div>

        {/* Search Bar */}
        {user && (
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm flex items-center overflow-hidden focus-within:ring-2 ring-[#4CAF4F]/20 transition">
            <input
              type="text"
              placeholder="Cari Jenis Surat..."
              className="w-full px-5 py-3 text-sm outline-none"
            />
            <div className="bg-emerald-600 px-4 py-3 cursor-pointer">
              <Search className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        {/* Grid card */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LIST_SURAT_GLOBAL.map((surat) => (
            <Link
              key={surat.id}
              to={user ? `/pengajuan-surat/${surat.code}` : "/login"}
              className="block transition-transform duration-200 hover:-translate-y-1"
            >
              <SuratCard
                code={surat.code}
                name={surat.name}
                description={surat.desc}
                type={surat.type}
              />
            </Link>
          ))}
        </div>

        {!user && (
          <div className="flex justify-center pt-6">
            <Link
              to="/login"
              className="bg-[#4CAF4F] hover:bg-[#439E46] text-white text-xs md:text-sm font-medium px-8 py-3 rounded-xl shadow-sm transition duration-200 block text-center min-w-50"
            >
              Masuk untuk mengajukan
            </Link>
          </div>
        )}
      </main>
      <FooterDesa />
    </div>
  );
}
