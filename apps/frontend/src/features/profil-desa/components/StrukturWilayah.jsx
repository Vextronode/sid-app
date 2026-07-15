import { MapPin, Users, Home } from "lucide-react";

export function StrukturWilayah({ stats, dusunList }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div>
        <h4 className="font-semibold text-gray-500 text-xs md:text-sm mb-3">
          Struktur Wilayah — Dusun, RW & RT
        </h4>

        {/* Statistik */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700 text-xs font-semibold">
            <MapPin className="w-4 h-4" /> <span>{stats.dusun} Dusun</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700 text-xs font-semibold">
            <Users className="w-4 h-4" /> <span>{stats.rw} RW</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700 text-xs font-semibold">
            <Home className="w-4 h-4" /> <span>{stats.rt} RT</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] md:text-xs text-gray-400 -mt-2">
        Klik dusun untuk melihat RW, klik RW untuk melihat daftar RT.
      </p>

      {/* Accordion */}
      <div className="space-y-3">
        {dusunList.map((dusun, idx) => (
          <button
            key={idx}
            className="w-full flex items-center gap-3 bg-[#4CAF4F] hover:bg-[#439E46] text-white p-3.5 rounded-xl text-left text-xs md:text-sm font-medium shadow-sm transition group"
          >
            <MapPin className="w-4 h-4 opacity-80 group-hover:scale-110 transition" />
            <span>Dusun {dusun}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
