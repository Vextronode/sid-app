import { useAuth } from "@/features/auth/contexts/AuthContext";
import { SuratCard } from "@/features/surat/components/SuratCard";
import { FooterDesa } from "@/components/layout/FooterDesa";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

export function InfoSuratPage() {
  const { user } = useAuth();

  // Dummy dulu ah pusing gwa
  const LIST_SURAT_GUEST = [
    {
      id: 1,
      code: "SKD",
      name: "Surat Keterangan Domisili",
      desc: "KTP, data kedudukan aktif",
      type: "Auto",
    },
    {
      id: 2,
      code: "SKU",
      name: "Surat Keterangan Usaha",
      desc: "KTP, dokumen usaha (verifikasi manual)",
      type: "Manual",
    },
    {
      id: 3,
      code: "SKTM",
      name: "Surat Keterangan Tidak Mampu",
      desc: "KTP, surat rekomendasi RT/RW",
      type: "Document",
    },
    {
      id: 4,
      code: "SKCK",
      name: "Surat pengantar SKCK",
      desc: "KTP, data kependudukan aktif",
      type: "Auto",
    },
    {
      id: 5,
      code: "SKN",
      name: "Surat Keterangan Nikah",
      desc: "KTP kedua mempelai, akta lahir",
      type: "Document",
    },
    {
      id: 6,
      code: "SKP",
      name: "Surat Keterangan Pindah",
      desc: "KTP, KK, tujuan pindah",
      type: "Manual",
    },
  ];

  // Ini juga sama bikin dummy, males bikin logic men nanti aja ya ganteng. yg penting jadi dulu ni frontend
  const LIST_SURAT_AUTH = [
    {
      id: 1,
      code: "SKD",
      name: "Surat Keterangan Domisili",
      desc: "KK",
      type: "Auto",
    },
    {
      id: 2,
      code: "SKU",
      name: "Surat Keterangan Usaha",
      desc: "KK",
      type: "Manual",
    },
    {
      id: 3,
      code: "SKTMR",
      name: "Surat Keterangan Tidak Memiliki Rumah",
      desc: "KK",
      type: "Document",
    },
    {
      id: 4,
      code: "SKP",
      name: "Surat Keterangan Penghasilan",
      desc: "KK",
      type: "Auto",
    },
    {
      id: 5,
      code: "SKTM",
      name: "Surat Keterangan Tidak Mampu",
      desc: "KK",
      type: "Manual",
    },
    {
      id: 6,
      code: "SKBN",
      name: "Surat Keterangan Beda Nama",
      desc: "Ijazah",
      type: "Document",
    },
    {
      id: 7,
      code: "SKP",
      name: "Surat Keterangan Penguburan",
      desc: "KK, surat kematian",
      type: "Auto",
    },
    {
      id: 8,
      code: "SKTK",
      name: "Surat Keterangan Kelahiran",
      desc: "Surat kelahiran, KK",
      type: "Manual",
    },
    {
      id: 9,
      code: "SkiBM",
      name: "Surat Keterangan Belum Menikah",
      desc: "KK",
      type: "Document",
    },
  ];

  // Cek kalau user login, pakai data auth, kalau nggak pakai data guest
  const currentSuratList = user ? LIST_SURAT_AUTH : LIST_SURAT_GUEST;

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col justify-between">
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-10 grow space-y-8">
        {/* Header Dinamis */}
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
          {currentSuratList.map((surat) => (
            <SuratCard
              key={surat.id}
              code={surat.code}
              name={surat.name}
              description={surat.desc}
              type={surat.type}
            />
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
