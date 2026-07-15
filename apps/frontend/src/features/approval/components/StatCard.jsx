// ==========================================
// Satu kotak ringkasan angka di halaman Dashboard RT/RW
// (contoh: "Total ditolak", "Sedang diproses", "Total Permohonan", "Disetujui final").
// ==========================================

export default function StatCard({ icon, value, label }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col gap-1 relative">
      {/* Icon kecil di pojok kanan atas kotak, sesuai desain */}
      <div className="absolute top-4 right-4 text-gray-400">{icon}</div>
      <span className="text-2xl font-semibold text-gray-800">{value}</span>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
}