// ==========================================
// GenderStatCard.jsx
// Kartu "Gender Warga" — lingkaran total jiwa + breakdown L/P.
// ==========================================

export default function GenderStatCard({ total, laki, perempuan }) {
  const persenLaki = total > 0 ? Math.round((laki / total) * 100) : 0;
  const persenPerempuan = total > 0 ? 100 - persenLaki : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-800">Gender Warga</h3>
      <p className="text-xs text-gray-400 mb-6">Distribusi penduduk L/P</p>

      <div className="flex justify-center mb-6">
        <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-800">{total.toLocaleString('id-ID')}</span>
          <span className="text-[9px] text-gray-400 uppercase">Total Jiwa</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Laki-laki
          </span>
          <span className="font-semibold text-gray-800">{laki.toLocaleString('id-ID')} ({persenLaki}%)</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Perempuan
          </span>
          <span className="font-semibold text-gray-800">{perempuan.toLocaleString('id-ID')} ({persenPerempuan}%)</span>
        </div>
      </div>
    </div>
  );
}