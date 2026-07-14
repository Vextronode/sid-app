export function SuratCard({ code, name, description, type }) {
  const badgeStyles = {
    Auto: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Manual: "bg-amber-50 text-amber-700 border-amber-100",
    Document: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 relative flex flex-col justify-between hover:shadow-md transition-shadow min-h-35">
      {/* Kode Surat & Badge Status */}
      <div className="flex justify-between items-start">
        <span className="font-bold text-gray-800 text-sm tracking-wide">
          {code}
        </span>
        <span
          className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border ${badgeStyles[type] || "bg-gray-50"}`}
        >
          {type}
        </span>
      </div>

      {/* Detail Nama & Syarat Dokumen */}
      <div className="mt-3 space-y-1">
        <h4 className="font-bold text-gray-900 text-xs md:text-sm">{name}</h4>
        <p className="text-[10px] md:text-xs text-gray-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}
